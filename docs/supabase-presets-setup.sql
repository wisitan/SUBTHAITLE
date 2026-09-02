-- ==============================================================================
-- SUBTHAITLE: Supabase Schema for Custom Subtitle Presets
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create custom_presets table
CREATE TABLE IF NOT EXISTS public.custom_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.custom_presets ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own custom presets" ON public.custom_presets;
DROP POLICY IF EXISTS "Users can insert their own custom presets" ON public.custom_presets;
DROP POLICY IF EXISTS "Users can update their own custom presets" ON public.custom_presets;
DROP POLICY IF EXISTS "Users can delete their own custom presets" ON public.custom_presets;

-- 4. Policies: User can read, insert, update, and delete their own presets
CREATE POLICY "Users can view their own custom presets"
  ON public.custom_presets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom presets"
  ON public.custom_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom presets"
  ON public.custom_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom presets"
  ON public.custom_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_custom_presets_user
  ON public.custom_presets(user_id, created_at DESC);
