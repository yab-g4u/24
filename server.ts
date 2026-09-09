import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
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

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      supabaseConfigured: Boolean(supabaseUrl && supabaseKey),
    });
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
            // Note: Informative non-fatal log without failing request
            console.warn('Supabase query notice (RLS or table grant needed):', error.message);
            supabaseNotice = {
              message: error.message,
              code: error.code,
              hint: error.hint || 'Run SQL migration in supabase-schema.sql to allow direct SELECT access.',
            };
          } else if (data && Array.isArray(data)) {
            supabaseSubmissions = data;
            // Sync remote entries into local cache
            data.forEach((remoteItem) => {
              saveOrUpdateSubmission(remoteItem);
            });
          }
        } catch (err: any) {
          console.warn('Supabase request exception notice:', err?.message || err);
          supabaseNotice = {
            message: err?.message || 'Database connection error',
          };
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

          try {
            // Public URL fallback
            const { data: pubData } = serverSupabase.storage
              .from('submissions')
              .getPublicUrl(item.file_path);

            let fileUrl = pubData?.publicUrl || null;

            // Attempt signed URL if available
            try {
              const { data: signedData, error: signError } = await serverSupabase.storage
                .from('submissions')
                .createSignedUrl(item.file_path, 3600);

              if (!signError && signedData?.signedUrl) {
                fileUrl = signedData.signedUrl;
              }
            } catch {
              // Ignore signed URL error and keep publicUrl
            }

            return { ...item, signed_file_url: fileUrl };
          } catch {
            return item;
          }
        })
      );

      res.json({
        submissions: enhancedSubmissions,
        supabaseNotice,
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
