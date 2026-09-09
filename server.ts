import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
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

    // Timing-safe comparison if lengths match
    const isMatch = password.trim() === ADMIN_PASSWORD;

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

  // Admin Submissions List (with signed URLs for private files)
  app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
    try {
      const { category, status, search } = req.query;

      let query = serverSupabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (category && typeof category === 'string' && category !== 'all') {
        query = query.eq('category', category);
      }

      if (status && typeof status === 'string' && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        res.status(500).json({ error: error.message });
        return;
      }

      let submissions = data || [];

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

      // Generate signed URLs for private files in storage
      const enhancedSubmissions = await Promise.all(
        submissions.map(async (item: any) => {
          if (!item.file_path) {
            return item;
          }

          try {
            const { data: signedData, error: signError } = await serverSupabase.storage
              .from('submissions')
              .createSignedUrl(item.file_path, 3600); // 1 hour valid

            if (!signError && signedData?.signedUrl) {
              return { ...item, signed_file_url: signedData.signedUrl };
            }
          } catch (e) {
            console.warn('Failed to create signed URL for:', item.file_path, e);
          }

          return item;
        })
      );

      res.json({ submissions: enhancedSubmissions });
    } catch (err: any) {
      console.error('Failed to fetch admin submissions:', err);
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

      const { data, error } = await serverSupabase
        .from('submissions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ ok: true, submission: data });
    } catch (err: any) {
      console.error('Failed to update status:', err);
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
