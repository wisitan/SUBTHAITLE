-- ==============================================================================
-- SUBTHAITLE: Supabase Schema for User Credits, Quotas, and Stripe Webhook Ledger
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Ensure profiles table has all necessary columns for credits and quotas
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  credits_minutes INT NOT NULL DEFAULT 0,
  is_lifetime_unlocked BOOLEAN NOT NULL DEFAULT false,
  google_free_month VARCHAR(7),
  google_free_count INT NOT NULL DEFAULT 0,
  groq_free_day VARCHAR(10),
  groq_free_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- If profiles table already existed, add missing columns safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_lifetime_unlocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_free_month VARCHAR(7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_free_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS groq_free_day VARCHAR(10);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS groq_free_count INT NOT NULL DEFAULT 0;

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Create credit_transactions table (Audit Trail Ledger)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'lifetime_purchase', 'admin_adjustment', 'refund')),
  amount_minutes INT NOT NULL,
  balance_after INT NOT NULL,
  description TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Transactions Policies: Users can view their own transaction history
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Stored Procedure: Add Credits (Atomic)
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_minutes INT,
  p_description TEXT,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Increment user's credit balance atomically
  UPDATE public.profiles
  SET 
    credits_minutes = credits_minutes + p_minutes,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id
  RETURNING credits_minutes INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile with ID % not found', p_user_id;
  END IF;

  -- Record audit transaction
  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount_minutes,
    balance_after,
    description,
    stripe_session_id
  ) VALUES (
    p_user_id,
    'purchase',
    p_minutes,
    v_new_balance,
    p_description,
    p_stripe_session_id
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Stored Procedure: Deduct Credits (Atomic)
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id UUID,
  p_minutes INT,
  p_description TEXT
)
RETURNS INT AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
BEGIN
  -- Fetch current balance with row lock for update
  SELECT credits_minutes INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile with ID % not found', p_user_id;
  END IF;

  IF v_current_balance < p_minutes THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', p_minutes, v_current_balance;
  END IF;

  v_new_balance := v_current_balance - p_minutes;

  UPDATE public.profiles
  SET 
    credits_minutes = v_new_balance,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  -- Record audit transaction
  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount_minutes,
    balance_after,
    description
  ) VALUES (
    p_user_id,
    'usage',
    -p_minutes,
    v_new_balance,
    p_description
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Stored Procedure: Unlock Lifetime Pass
CREATE OR REPLACE FUNCTION public.unlock_lifetime_pass(
  p_user_id UUID,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INT;
BEGIN
  UPDATE public.profiles
  SET 
    is_lifetime_unlocked = true,
    tier = 'tier_699',
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id
  RETURNING credits_minutes INTO v_current_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile with ID % not found', p_user_id;
  END IF;

  -- Record audit transaction
  INSERT INTO public.credit_transactions (
    user_id,
    type,
    amount_minutes,
    balance_after,
    description,
    stripe_session_id
  ) VALUES (
    p_user_id,
    'lifetime_purchase',
    0,
    v_current_balance,
    'ปลดล็อก Lifetime Pass 699฿ (BYOK & Local AI ตลอดชีพ)',
    p_stripe_session_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Stored Procedure: Consume Google Free Quota (5 clips / month)
CREATE OR REPLACE FUNCTION public.consume_google_free_quota(
  p_user_id UUID
)
RETURNS TABLE (allowed BOOLEAN, count INT, message TEXT) AS $$
DECLARE
  v_current_month VARCHAR(7) := to_char(timezone('Asia/Bangkok'::text, now()), 'YYYY-MM');
  v_stored_month VARCHAR(7);
  v_count INT;
BEGIN
  SELECT google_free_month, google_free_count
  INTO v_stored_month, v_count
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'ไม่พบโปรไฟล์ผู้ใช้งานในระบบ';
    RETURN;
  END IF;

  -- Reset quota if month changed
  IF v_stored_month IS NULL OR v_stored_month != v_current_month THEN
    v_stored_month := v_current_month;
    v_count := 0;
  END IF;

  IF v_count >= 5 THEN
    RETURN QUERY SELECT false, v_count, 'โควต้าใช้งานฟรีด้วย Google AI ประจำเดือนนี้ครบ 5 คลิปแล้วค่ะ กรุณาเติมเครดิตเพื่อใช้งานต่อ';
    RETURN;
  END IF;

  -- Increment quota count
  v_count := v_count + 1;
  UPDATE public.profiles
  SET 
    google_free_month = v_stored_month,
    google_free_count = v_count,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN QUERY SELECT true, v_count, 'หักโควต้าฟรี Google สำเร็จ';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Stored Procedure: Consume Groq Free Quota (3 clips / day)
CREATE OR REPLACE FUNCTION public.consume_groq_free_quota(
  p_user_id UUID
)
RETURNS TABLE (allowed BOOLEAN, count INT, message TEXT) AS $$
DECLARE
  v_current_day VARCHAR(10) := to_char(timezone('Asia/Bangkok'::text, now()), 'YYYY-MM-DD');
  v_stored_day VARCHAR(10);
  v_count INT;
BEGIN
  SELECT groq_free_day, groq_free_count
  INTO v_stored_day, v_count
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'ไม่พบโปรไฟล์ผู้ใช้งานในระบบ';
    RETURN;
  END IF;

  -- Reset quota if day changed
  IF v_stored_day IS NULL OR v_stored_day != v_current_day THEN
    v_stored_day := v_current_day;
    v_count := 0;
  END IF;

  IF v_count >= 3 THEN
    RETURN QUERY SELECT false, v_count, 'โควต้าใช้งานฟรีด้วย Groq AI ประจำวันนี้ครบ 3 คลิปแล้วค่ะ กรุณากลับมาใหม่ในวันพรุ่งนี้ หรือเติมเครดิตเพื่อใช้งานต่อ';
    RETURN;
  END IF;

  -- Increment quota count
  v_count := v_count + 1;
  UPDATE public.profiles
  SET 
    groq_free_day = v_stored_day,
    groq_free_count = v_count,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN QUERY SELECT true, v_count, 'หักโควต้าฟรี Groq สำเร็จ';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Auto Create/Update Profile on Google OAuth SignUp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    tier,
    credits_minutes,
    is_lifetime_unlocked
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'free',
    0,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Enable Realtime Publications on profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 10. Grant execute permissions to ensure RPC calls succeed
GRANT EXECUTE ON FUNCTION public.add_user_credits TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlock_lifetime_pass TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_google_free_quota TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_groq_free_quota TO anon, authenticated, service_role;

