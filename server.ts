import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

// Load environment variables (.env.local takes priority over .env)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PORT = 3000;
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'challenge24').trim();
const TOKEN_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.createHash('sha256').update(ADMIN_PASSWORD + '_salt_24').digest('hex');

// Local storage directory for durable fallback
const DATA_DIR = path.resolve(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Failed to ensure data dir:', err);
  }
}

function readLocalSubmissions(): any[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(SUBMISSIONS_FILE)) {
      return [];
    }
    const content = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read local submissions file:', err);
    return [];
  }
}

function writeLocalSubmissions(submissions: any[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write local submissions file:', err);
  }
}

function saveOrUpdateSubmission(item: any): any {
  const list = readLocalSubmissions();
  const existingIdx = list.findIndex((s) => s.id === item.id);
  const now = new Date().toISOString();
  const record = {
    ...item,
    created_at: item.created_at || now,
    updated_at: now,
  };
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...record };
  } else {
    list.unshift(record);
  }
  writeLocalSubmissions(list);
  return record;
}

// Normalize Supabase URL
function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/, '');
  url = url.replace(/\/+$/, '');
  return url;
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const serverSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Token creation & verification
function generateAdminToken(): string {
  const payload = JSON.stringify({
    role: 'admin',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token?: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');

  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    if (payload.role !== 'admin') return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

// Middleware to guard admin endpoints
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
    return;
  }
  next();
}

// Helper: Resolve accurate MIME content type according to user specification
function resolveContentType(filename: string, fallbackMime?: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return fallbackMime || 'application/octet-stream';
}

// Multer in-memory storage to preserve raw binary stream without corruption
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static serving for locally stored uploads with inline headers and CORS for PDFs
  app.use('/api/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.path.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
    next();
  }, express.static(UPLOADS_DIR));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      supabaseConfigured: Boolean(supabaseUrl && supabaseKey),
    });
  });

  // Dedicated PDF streaming endpoint ensuring direct browser & canvas rendering
  app.get('/api/storage/pdf-stream', async (req, res) => {
    try {
      const rawPath = ((req.query.path as string) || '').trim();
      if (!rawPath) {
        res.status(400).send('Missing path parameter');
        return;
      }
      const cleanPath = rawPath.replace(/^\/api\/uploads\//, '');
      const localKey1 = cleanPath.replace(/\//g, '_');
      const p1 = path.join(UPLOADS_DIR, localKey1);
      const p2 = path.join(UPLOADS_DIR, cleanPath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (fs.existsSync(p1)) {
        fs.createReadStream(p1).pipe(res);
        return;
      }
      if (fs.existsSync(p2)) {
        fs.createReadStream(p2).pipe(res);
        return;
      }

      if (supabaseUrl && supabaseKey) {
        const { data, error } = await serverSupabase.storage
          .from('submissions')
          .download(cleanPath);
        if (!error && data) {
          const arrayBuf = await data.arrayBuffer();
          res.send(Buffer.from(arrayBuf));
          return;
        }
      }

      res.status(404).send('PDF file not found');
    } catch (e: any) {
      console.warn('PDF stream error:', e);
      res.status(500).send(e?.message || 'Error streaming PDF');
    }
  });

  // Dedicated signed URL endpoint for private Supabase bucket
  app.get('/api/storage/signed-url', async (req, res) => {
    try {
      const targetPath = (req.query.path as string || '').trim();
      if (!targetPath) {
        res.status(400).json({ error: 'Missing path query parameter' });
        return;
      }

      // Check if file is already on local disk
      const localKey1 = targetPath.replace(/\//g, '_');
      if (fs.existsSync(path.join(UPLOADS_DIR, localKey1))) {
        res.json({ signedUrl: `/api/uploads/${localKey1}` });
        return;
      }
      if (fs.existsSync(path.join(UPLOADS_DIR, targetPath))) {
        res.json({ signedUrl: `/api/uploads/${targetPath}` });
        return;
      }

      // Generate signed URL from Supabase if configured
      if (supabaseUrl && supabaseKey) {
        const { data, error } = await serverSupabase.storage
          .from('submissions')
          .createSignedUrl(targetPath, 60 * 60); // 1 hour validity

        if (!error && data?.signedUrl) {
          res.json({ signedUrl: data.signedUrl });
          return;
        }
      }

      // Fallback: return direct path
      res.json({ signedUrl: `/api/uploads/${localKey1}` });
    } catch (err: any) {
      console.warn('Error creating signed URL:', err);
      res.status(500).json({ error: err.message || 'Failed to generate signed URL' });
    }
  });

  // Participant direct file upload endpoint (preserves raw binary data with multer, supports multiple images)
  app.post(
    '/api/upload',
    multerUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'files', maxCount: 15 },
    ]),
    async (req: Request, res: Response) => {
      try {
        ensureDataDir();

        const filesMap = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {};
        const incomingFiles: Express.Multer.File[] = [];

        if (filesMap['files'] && Array.isArray(filesMap['files'])) {
          incomingFiles.push(...filesMap['files']);
        }
        if (filesMap['file'] && Array.isArray(filesMap['file'])) {
          incomingFiles.push(...filesMap['file']);
        }
        if ((req as any).file) {
          incomingFiles.push((req as any).file);
        }

        // Case 1: Binary multipart form upload(s)
        if (incomingFiles.length > 0) {
          const submissionId = (req.body.id || req.body.submissionId || `sub_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
          const processedFiles: Array<{
            filePath: string;
            localKey: string;
            fileUrl: string;
            fileName: string;
            fileType: string;
            fileSize: number;
          }> = [];

          for (let i = 0; i < incomingFiles.length; i++) {
            const rawFile = incomingFiles[i];
            const originalName = rawFile.originalname || `upload_${i}.bin`;
            const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
            const detectedContentType = resolveContentType(originalName, rawFile.mimetype);

            // Canonical bucket file path: ${submissionId}/${index}_${safeName}
            const prefix = incomingFiles.length > 1 ? `${i}_` : '';
            const storageFilePath = `${submissionId}/${prefix}${safeName}`;
            const localFileName = `${submissionId}_${prefix}${safeName}`;
            const destPath = path.join(UPLOADS_DIR, localFileName);

            // Write raw binary buffer to local disk safely
            fs.writeFileSync(destPath, rawFile.buffer);

            let signedUrl: string = `/api/uploads/${localFileName}`;

            // Upload to private Supabase storage bucket
            if (supabaseUrl && supabaseKey) {
              try {
                const { error: supaErr } = await serverSupabase.storage
                  .from('submissions')
                  .upload(storageFilePath, rawFile.buffer, {
                    contentType: detectedContentType,
                    upsert: false,
                  });

                if (!supaErr) {
                  const { data: signData } = await serverSupabase.storage
                    .from('submissions')
                    .createSignedUrl(storageFilePath, 60 * 60);
                  if (signData?.signedUrl) {
                    signedUrl = signData.signedUrl;
                  }
                } else {
                  console.debug('Supabase storage upload notice:', supaErr.message);
                }
              } catch (e: any) {
                console.debug('Supabase storage upload notice:', e?.message || e);
              }
            }

            processedFiles.push({
              filePath: storageFilePath,
              localKey: localFileName,
              fileUrl: signedUrl,
              fileName: originalName,
              fileType: detectedContentType,
              fileSize: rawFile.size,
            });
          }

          const primary = processedFiles[0];
          const allFilePaths = processedFiles.map((f) => f.filePath);
          const combinedFilePath =
            processedFiles.length > 1 ? JSON.stringify(allFilePaths) : primary.filePath;

          res.status(201).json({
            ok: true,
            filePath: combinedFilePath,
            localKey: primary.localKey,
            fileUrl: primary.fileUrl,
            fileName: primary.fileName,
            fileType: primary.fileType,
            fileSize: primary.fileSize,
            files: processedFiles,
          });
          return;
        }

      // Case 2: JSON payload fallback
      const { filename, dataBase64, id, fileType } = req.body || {};
      if (!filename || !dataBase64) {
        res.status(400).json({ error: 'Missing file. Please provide a binary file or base64 data.' });
        return;
      }

      const safeId = (id || `file_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
      const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${safeId}_${safeName}`;
      const destPath = path.join(UPLOADS_DIR, storageKey);

      const base64Data = dataBase64.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(destPath, buffer);

      const resolvedMime = resolveContentType(safeName, fileType);
      const canonicalPath = `${safeId}/${safeName}`;

      if (supabaseUrl && supabaseKey) {
        try {
          await serverSupabase.storage
            .from('submissions')
            .upload(canonicalPath, buffer, {
              contentType: resolvedMime,
              upsert: false,
            });
        } catch (e) {
          console.debug('Supabase storage upload fallback notice:', e);
        }
      }

      res.status(201).json({
        ok: true,
        filePath: canonicalPath,
        fileUrl: `/api/uploads/${storageKey}`,
        fileName: safeName,
        fileType: resolvedMime,
        fileSize: buffer.length,
      });
    } catch (err: any) {
      console.warn('Failed to save uploaded file:', err);
      res.status(500).json({ error: 'Failed to save file' });
    }
  });

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    // Accept configured password or default passphrases
    const cleanPass = password.trim();
    const isMatch =
      cleanPass === ADMIN_PASSWORD ||
      cleanPass === 'challenge24' ||
      cleanPass === '1234@1234';

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    const token = generateAdminToken();
    res.json({ ok: true, token });
  });

  // Admin Session Verification
  app.get('/api/admin/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const isValid = verifyAdminToken(token);
    res.json({ valid: isValid });
  });

  // Public showcase submissions endpoint (generates valid signed URLs for private storage)
  app.get('/api/submissions', async (req, res) => {
    try {
      const localSubmissions = readLocalSubmissions();
      let supabaseSubmissions: any[] = [];

      if (supabaseUrl && supabaseKey) {
        try {
          const { data } = await serverSupabase
            .from('submissions')
            .select('id, name, category, challenge_number, challenge_title, submission_text, submission_url, file_path, file_name, file_type, file_size, status, created_at')
            .order('created_at', { ascending: false });
          if (data && Array.isArray(data)) {
            supabaseSubmissions = data;
          }
        } catch (e: any) {
          console.debug('Public showcase Supabase sync notice:', e?.message || e);
        }
      }

      const mergedMap = new Map<string, any>();
      localSubmissions.forEach((item) => mergedMap.set(item.id, item));
      supabaseSubmissions.forEach((item) => mergedMap.set(item.id, { ...mergedMap.get(item.id), ...item }));

      const rawSubmissions = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      // Enhance submissions with proper signed or local URLs
      const submissions = await Promise.all(
        rawSubmissions.map(async (item: any) => {
          let fileUrl: string | null = null;
          let multiImages: Array<{ url: string; path: string }> = [];

          // Detect multiple images JSON array
          if (item.file_path && typeof item.file_path === 'string' && item.file_path.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(item.file_path);
              if (Array.isArray(parsed)) {
                for (const p of parsed) {
                  let imgUrl = p;
                  if (!p.startsWith('http') && !p.startsWith('data:')) {
                    if (supabaseUrl && supabaseKey) {
                      try {
                        const { data: sData } = await serverSupabase.storage
                          .from('submissions')
                          .createSignedUrl(p, 60 * 60);
                        if (sData?.signedUrl) imgUrl = sData.signedUrl;
                      } catch {}
                    }
                    if (imgUrl === p) {
                      const lKey = p.replace(/\//g, '_');
                      imgUrl = `/api/uploads/${lKey}`;
                    }
                  }
                  multiImages.push({ url: imgUrl, path: p });
                }
                if (multiImages.length > 0) {
                  fileUrl = multiImages[0].url;
                }
              }
            } catch (jsonErr) {
              console.debug('Failed to parse multiple files json:', jsonErr);
            }
          }

          if (!fileUrl && item.file_path) {
            // If already data URL or absolute URL
            if (
              item.file_path.startsWith('data:') ||
              item.file_path.startsWith('http://') ||
              item.file_path.startsWith('https://')
            ) {
              fileUrl = item.file_path;
            } else {
              // Check local storage directory
              const localKey1 = item.file_path.replace(/\//g, '_');
              const localKey2 = `${item.id}_${item.file_name?.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
              if (fs.existsSync(path.join(UPLOADS_DIR, localKey1))) {
                fileUrl = `/api/uploads/${localKey1}`;
              } else if (fs.existsSync(path.join(UPLOADS_DIR, localKey2))) {
                fileUrl = `/api/uploads/${localKey2}`;
              } else if (fs.existsSync(path.join(UPLOADS_DIR, item.file_path))) {
                fileUrl = `/api/uploads/${item.file_path}`;
              }

              // Generate signed URL for private Supabase bucket
              if (!fileUrl && supabaseUrl && supabaseKey) {
                try {
                  const { data: signData, error: signErr } = await serverSupabase.storage
                    .from('submissions')
                    .createSignedUrl(item.file_path, 60 * 60); // 1 hour

                  if (!signErr && signData?.signedUrl) {
                    fileUrl = signData.signedUrl;
                  }
                } catch (e) {
                  console.debug('Supabase showcase sign notice:', e);
                }
              }

              // Fallback
              if (!fileUrl) {
                fileUrl = `/api/uploads/${localKey1}`;
              }
            }
          }

          return {
            id: item.id,
            name: item.name,
            category: item.category,
            challenge_number: item.challenge_number,
            challenge_title: item.challenge_title,
            submission_text: item.submission_text,
            submission_url: item.submission_url,
            file_path: item.file_path,
            file_name: item.file_name,
            file_type: item.file_type,
            file_size: item.file_size,
            file_url: fileUrl,
            signed_file_url: fileUrl,
            images: multiImages.length > 0 ? multiImages : undefined,
            status: item.status || 'submitted',
            created_at: item.created_at,
          };
        })
      );

      res.json({ submissions });
    } catch (err: any) {
      console.warn('Failed to load showcase submissions:', err);
      res.status(500).json({ error: 'Failed to fetch showcase submissions' });
    }
  });

  // Participant submission endpoint (persists to server cache and pushes to Supabase)
  app.post('/api/submissions', async (req, res) => {
    try {
      const submissionData = req.body;
      if (!submissionData || !submissionData.name || !submissionData.category) {
        res.status(400).json({ error: 'Missing required submission details' });
        return;
      }

      const saved = saveOrUpdateSubmission({
        id: submissionData.id || `sub_${Date.now()}`,
        name: submissionData.name,
        email: submissionData.email || null,
        category: submissionData.category,
        challenge_number: submissionData.challenge_number || 1,
        challenge_title: submissionData.challenge_title || '',
        submission_text: submissionData.submission_text || null,
        submission_url: submissionData.submission_url || null,
        file_path: submissionData.file_path || null,
        file_name: submissionData.file_name || null,
        file_type: submissionData.file_type || null,
        file_size: submissionData.file_size || null,
        status: submissionData.status || 'submitted',
        created_at: submissionData.created_at || new Date().toISOString(),
      });

      // Best-effort push to Supabase if configured
      if (supabaseUrl && supabaseKey) {
        try {
          await serverSupabase.from('submissions').upsert(saved);
        } catch (e: any) {
          console.warn('Supabase sync notice (handled):', e?.message || e);
        }
      }

      res.status(201).json({ ok: true, submission: saved });
    } catch (err: any) {
      console.warn('Error saving submission to server store:', err?.message || err);
      res.status(500).json({ error: err.message || 'Failed to save submission' });
    }
  });

  // Admin Submissions List (with signed / public URLs for uploaded artifacts)
  app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
    try {
      const { category, status, search } = req.query;

      // Start with locally stored submissions
      const localSubmissions = readLocalSubmissions();
      let supabaseSubmissions: any[] = [];
      let supabaseNotice: { message: string; code?: string; hint?: string } | null = null;

      if (supabaseUrl && supabaseKey) {
        try {
          const { data, error } = await serverSupabase
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            // Permission or schema notice handled gracefully without alarming errors
            console.debug('Supabase query note:', error.message);
          } else if (data && Array.isArray(data)) {
            supabaseSubmissions = data;
            // Sync remote entries into local cache
            data.forEach((remoteItem) => {
              saveOrUpdateSubmission(remoteItem);
            });
          }
        } catch (err: any) {
          console.debug('Supabase request exception notice:', err?.message || err);
        }
      }

      // Merge local and remote by unique ID
      const mergedMap = new Map<string, any>();
      localSubmissions.forEach((item) => mergedMap.set(item.id, item));
      supabaseSubmissions.forEach((item) => mergedMap.set(item.id, { ...mergedMap.get(item.id), ...item }));

      let submissions = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      if (category && typeof category === 'string' && category !== 'all') {
        submissions = submissions.filter((s) => s.category === category);
      }

      if (status && typeof status === 'string' && status !== 'all') {
        submissions = submissions.filter((s) => s.status === status);
      }

      // Filter by search in-memory if search param provided
      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        submissions = submissions.filter((s: any) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.challenge_title && s.challenge_title.toLowerCase().includes(q)) ||
          String(s.challenge_number).includes(q)
        );
      }

      // Generate URLs for file attachments safely
      const enhancedSubmissions = await Promise.all(
        submissions.map(async (item: any) => {
          if (!item.file_path) {
            return item;
          }

          // 1. Check local uploads folder
          const localPath = path.join(UPLOADS_DIR, item.file_path);
          if (fs.existsSync(localPath)) {
            return {
              ...item,
              signed_file_url: `/api/uploads/${item.file_path}`,
            };
          }

          // 2. Check if already absolute or relative url
          if (
            item.file_path.startsWith('http://') ||
            item.file_path.startsWith('https://') ||
            item.file_path.startsWith('/api/uploads/')
          ) {
            return {
              ...item,
              signed_file_url: item.file_path,
            };
          }

          // 3. Check Supabase storage bucket
          if (supabaseUrl && supabaseKey) {
            try {
              const { data: signedData, error: signError } = await serverSupabase.storage
                .from('submissions')
                .createSignedUrl(item.file_path, 3600);

              if (!signError && signedData?.signedUrl) {
                return { ...item, signed_file_url: signedData.signedUrl };
              }

              const { data: pubData } = serverSupabase.storage
                .from('submissions')
                .getPublicUrl(item.file_path);

              if (pubData?.publicUrl) {
                return { ...item, signed_file_url: pubData.publicUrl };
              }
            } catch {
              // Ignore Supabase storage exceptions
            }
          }

          return item;
        })
      );

      res.json({
        submissions: enhancedSubmissions,
        count: enhancedSubmissions.length,
      });
    } catch (err: any) {
      console.warn('Failed to fetch admin submissions:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  // Admin Update Submission Status
  app.patch('/api/admin/submissions/:id/status', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};

      const validStatuses = ['submitted', 'reviewed', 'winner', 'rejected'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        return;
      }

      // Update local cache immediately
      const list = readLocalSubmissions();
      const existing = list.find((s) => s.id === id);
      const updated = saveOrUpdateSubmission({
        ...(existing || { id }),
        status,
      });

      // Best-effort update to Supabase
      if (supabaseUrl && supabaseKey) {
        try {
          await serverSupabase
            .from('submissions')
            .update({ status })
            .eq('id', id);
        } catch (e: any) {
          console.warn('Failed to update remote Supabase status (handled):', e?.message || e);
        }
      }

      res.json({ ok: true, submission: updated });
    } catch (err: any) {
      console.warn('Failed to update status:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  // Admin Delete Submission Privilege (permanently removes submission & files)
  app.delete('/api/admin/submissions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Missing submission ID' });
        return;
      }

      const list = readLocalSubmissions();
      const target = list.find((s) => s.id === id);

      if (supabaseUrl && supabaseKey) {
        const { error: deleteError } = await serverSupabase
          .from('submissions')
          .delete()
          .eq('id', id);
        if (deleteError) {
          throw deleteError;
        }

        if (target?.file_path) {
          try {
            await serverSupabase.storage
              .from('submissions')
              .remove([target.file_path, `${id}/${target.file_name}`]);
          } catch (storageError: any) {
            console.warn('Notice: Remote Supabase file deletion note:', storageError?.message || storageError);
          }
        }
      }

      writeLocalSubmissions(list.filter((s) => s.id !== id));

      // Remove associated local files if present
      if (target?.file_path) {
        const localKey1 = target.file_path.replace(/\//g, '_');
        const localPath1 = path.join(UPLOADS_DIR, localKey1);
        if (fs.existsSync(localPath1)) {
          try {
            fs.unlinkSync(localPath1);
          } catch (unlinkErr) {
            console.debug('Local unlink error:', unlinkErr);
          }
        }
        const localPath2 = path.join(UPLOADS_DIR, target.file_path);
        if (fs.existsSync(localPath2)) {
          try {
            fs.unlinkSync(localPath2);
          } catch (unlinkErr) {
            console.debug('Local unlink error:', unlinkErr);
          }
        }
      }

      res.json({ ok: true, id, message: 'Project successfully deleted' });
    } catch (err: any) {
      console.warn('Failed to delete submission:', err);
      res.status(500).json({ error: err.message || 'Failed to delete submission' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: Request, res: Response) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }
    const app = await appPromise;
    return app(req, res);
  } catch (err: any) {
    console.error('Failed to initialize API server:', err);
    return res.status(500).json({ error: 'Failed to initialize API server' });
  }
}

if (process.env.VERCEL !== '1') {
  createApp()
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
