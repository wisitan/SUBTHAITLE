-- ==============================================================================
-- 🚀 SUBTHAITLE: USER FEEDBACK LOOP & AUTO-LEARN DICTIONARY SCHEMA
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. Ensure custom_dictionary table exists
CREATE TABLE IF NOT EXISTS public.custom_dictionary (
  id BIGSERIAL PRIMARY KEY,
  wrong_word TEXT NOT NULL UNIQUE,
  correct_word TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create correction_feedback table for logging user edits
CREATE TABLE IF NOT EXISTS public.correction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_phrase TEXT NOT NULL,
  corrected_phrase TEXT NOT NULL,
  context_before TEXT DEFAULT '',
  context_after TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vote_count INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'auto_learned', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(original_phrase, corrected_phrase)
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_correction_feedback_status ON public.correction_feedback(status);
CREATE INDEX IF NOT EXISTS idx_correction_feedback_vote_count ON public.correction_feedback(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_correction_feedback_updated_at ON public.correction_feedback(updated_at DESC);

-- Enable RLS
ALTER TABLE public.correction_feedback ENABLE ROW LEVEL SECURITY;

-- Anonymous and Authenticated users can insert feedback
CREATE POLICY "Allow anon insert feedback"
  ON public.correction_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read feedback with status 'approved' or 'auto_learned'
CREATE POLICY "Allow public read approved feedback"
  ON public.correction_feedback
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('approved', 'auto_learned'));

-- Service role has full access
CREATE POLICY "Service role full access on correction_feedback"
  ON public.correction_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Atomic Stored Procedure: Record Feedback & Auto-Promote
-- Rule: When vote_count >= 2 and status = 'pending', auto-promote to 'auto_learned'
-- and automatically insert into custom_dictionary table!
CREATE OR REPLACE FUNCTION record_correction_feedback(
  p_original TEXT,
  p_corrected TEXT,
  p_context_before TEXT DEFAULT '',
  p_context_after TEXT DEFAULT '',
  p_user_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_id UUID;
  v_count INT;
  v_status TEXT;
  v_trimmed_orig TEXT := TRIM(p_original);
  v_trimmed_corr TEXT := TRIM(p_corrected);
BEGIN
  IF LENGTH(v_trimmed_orig) < 2 OR LENGTH(v_trimmed_corr) < 2 OR v_trimmed_orig = v_trimmed_corr THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_input');
  END IF;

  INSERT INTO public.correction_feedback (
    original_phrase,
    corrected_phrase,
    context_before,
    context_after,
    user_id,
    vote_count,
    status,
    updated_at
  )
  VALUES (
    v_trimmed_orig,
    v_trimmed_corr,
    p_context_before,
    p_context_after,
    p_user_id,
    1,
    'pending',
    now()
  )
  ON CONFLICT (original_phrase, corrected_phrase)
  DO UPDATE SET
    vote_count = public.correction_feedback.vote_count + 1,
    context_before = COALESCE(NULLIF(p_context_before, ''), public.correction_feedback.context_before),
    context_after = COALESCE(NULLIF(p_context_after, ''), public.correction_feedback.context_after),
    updated_at = now()
  RETURNING id, vote_count, status INTO v_id, v_count, v_status;

  -- 🚀 Auto-Learn Trigger: If vote_count >= 2 and status is pending, auto-promote!
  IF v_count >= 2 AND v_status = 'pending' THEN
    UPDATE public.correction_feedback
    SET status = 'auto_learned', updated_at = now()
    WHERE id = v_id;

    -- Upsert directly into custom_dictionary
    INSERT INTO public.custom_dictionary (wrong_word, correct_word, category, updated_at)
    VALUES (v_trimmed_orig, v_trimmed_corr, 'auto_learned', now())
    ON CONFLICT (wrong_word)
    DO UPDATE SET
      correct_word = v_trimmed_corr,
      category = 'auto_learned',
      updated_at = now();

    v_status := 'auto_learned';
  END IF;

  RETURN json_build_object(
    'success', true,
    'id', v_id,
    'vote_count', v_count,
    'status', v_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
