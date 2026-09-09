-- ==============================================================================
-- 24 HOUR CHALLENGE - SUPABASE DATABASE & STORAGE SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Create the submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  category TEXT NOT NULL CHECK (category IN ('design', 'writing')),
  challenge_number INTEGER NOT NULL CHECK (challenge_number BETWEEN 1 AND 15),
  challenge_title TEXT NOT NULL,
  submission_text TEXT,
  submission_url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'winner', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for quick filtering and sorting
CREATE INDEX IF NOT EXISTS idx_submissions_category ON public.submissions (category);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_number ON public.submissions (challenge_number);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions (created_at DESC);

-- 3. Grant schema & table permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Allow participants to insert their challenge submissions
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.submissions;
CREATE POLICY "Allow anonymous insert"
ON public.submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading submissions for admin dashboard and event queries
DROP POLICY IF EXISTS "Allow read access for all" ON public.submissions;
DROP POLICY IF EXISTS "Allow select for all" ON public.submissions;
CREATE POLICY "Allow read access for all"
ON public.submissions
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow updating submissions (for review status updates)
DROP POLICY IF EXISTS "Allow update status" ON public.submissions;
CREATE POLICY "Allow update status"
ON public.submissions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow deleting submissions (for admin deletion privilege)
DROP POLICY IF EXISTS "Allow delete access for all" ON public.submissions;
CREATE POLICY "Allow delete access for all"
ON public.submissions
FOR DELETE
TO anon, authenticated
USING (true);

-- Full access for service_role
DROP POLICY IF EXISTS "Allow service role full access" ON public.submissions;
CREATE POLICY "Allow service role full access"
ON public.submissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Create the private 'submissions' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  20971520, -- 20 MB limit
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520;

-- 5. Storage RLS: Allow participants to upload files into the 'submissions' bucket
-- (Fixes "new row violates row-level security policy" error)
DROP POLICY IF EXISTS "Allow anonymous submission file uploads" ON storage.objects;
CREATE POLICY "Allow anonymous submission file uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow read access on submissions storage" ON storage.objects;
CREATE POLICY "Allow read access on submissions storage"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow update access on submissions storage" ON storage.objects;
CREATE POLICY "Allow update access on submissions storage"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'submissions')
WITH CHECK (bucket_id = 'submissions');

-- Only service_role can delete or list all objects in submissions bucket
DROP POLICY IF EXISTS "Allow service role full storage access" ON storage.objects;
CREATE POLICY "Allow service role full storage access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'submissions')
WITH CHECK (bucket_id = 'submissions');
