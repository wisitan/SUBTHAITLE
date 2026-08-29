-- ==============================================================================
-- SUBTHAITLE: Supabase Schema for User Tiers, Google OAuth & Cloud Presets
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'tier_99', 'tier_299')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile details" ON public.profiles;

-- Profiles Policies: Read only for authenticated users (updates handled securely via service role / webhook)
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Trigger to prevent authenticated users from modifying their own tier or stripe customer ID
CREATE OR REPLACE FUNCTION public.protect_profile_tier()
RETURNS TRIGGER AS $func$
BEGIN
  IF (auth.role() = 'authenticated') THEN
    IF (NEW.tier IS DISTINCT FROM OLD.tier) THEN
      RAISE EXCEPTION 'Unauthorized: You cannot change your subscription tier directly.';
    END IF;
    IF (NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id) THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify your stripe customer ID.';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_tier ON public.profiles;
CREATE TRIGGER tr_protect_profile_tier
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_tier();

-- 2. Trigger to automatically create a profile when a user signs up with Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create custom_presets table
CREATE TABLE IF NOT EXISTS public.custom_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  style JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on custom_presets
ALTER TABLE public.custom_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own presets" ON public.custom_presets;
DROP POLICY IF EXISTS "Users can insert their own presets" ON public.custom_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON public.custom_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON public.custom_presets;

-- Presets Policies
CREATE POLICY "Users can view their own presets"
  ON public.custom_presets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
  ON public.custom_presets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON public.custom_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON public.custom_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to enforce preset count limits strictly on the database level (Free: 0, 99฿: 5, 299฿: 20)
CREATE OR REPLACE FUNCTION public.enforce_preset_limits()
RETURNS TRIGGER AS $func$
DECLARE
  user_tier TEXT;
  current_count INT;
  max_allowed INT;
BEGIN
  -- Get user tier from profiles
  SELECT tier INTO user_tier FROM public.profiles WHERE id = NEW.user_id;
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;

  -- Set max allowed based on tier
  IF user_tier = 'tier_299' THEN
    max_allowed := 20;
  ELSIF user_tier = 'tier_99' THEN
    max_allowed := 5;
  ELSE
    max_allowed := 0;
  END IF;

  -- Check current count
  SELECT COUNT(*) INTO current_count FROM public.custom_presets WHERE user_id = NEW.user_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Preset limit exceeded for tier % (Max allowed: %)', user_tier, max_allowed;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_preset_limits ON public.custom_presets;
CREATE TRIGGER tr_enforce_preset_limits
  BEFORE INSERT ON public.custom_presets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_preset_limits();

-- 4. Enable Realtime on profiles table (for instant tier upgrade notification)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
