import { createClient } from '@supabase/supabase-js';

// Normalize URL to handle instances where /rest/v1 or trailing slash was appended
function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Strip trailing /rest/v1 or /rest/v1/
  url = url.replace(/\/rest\/v1\/?$/, '');
  // Strip trailing slashes
  url = url.replace(/\/+$/, '');
  return url;
}

const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
    : '') || '';

const rawAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
    : '') || '';

export const SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = rawAnonKey.trim();

export const SUBMISSIONS_BUCKET = 'submissions';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR_SUPABASE') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')
);

// Instantiate client
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface DbSubmission {
  id: string;
  name: string;
  email: string | null;
  category: 'design' | 'writing';
  challenge_number: number;
  challenge_title: string;
  submission_text: string | null;
  submission_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  status: 'submitted' | 'reviewed' | 'winner' | 'rejected';
  created_at?: string;
  signed_file_url?: string | null; // injected by admin API for secure viewing
}
