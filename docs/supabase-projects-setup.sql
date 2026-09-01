-- ==============================================================================
-- SUBTHAITLE: Supabase Schema for Canva-Style User Cloud Projects
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create user_projects table
CREATE TABLE IF NOT EXISTS public.user_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  duration NUMERIC DEFAULT 0,
  thumbnail_url TEXT,
  captions JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_words JSONB DEFAULT '[]'::jsonb,
  style JSONB DEFAULT '{}'::jsonb,
  aspect_ratio TEXT DEFAULT '9:16',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on user_projects
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own projects" ON public.user_projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.user_projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.user_projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.user_projects;

-- Policies: Only project owner can read, write, update, and delete
CREATE POLICY "Users can view their own projects"
  ON public.user_projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON public.user_projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.user_projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.user_projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index on user_id and updated_at for super-fast queries
CREATE INDEX IF NOT EXISTS idx_user_projects_user_updated
  ON public.user_projects(user_id, updated_at DESC);
