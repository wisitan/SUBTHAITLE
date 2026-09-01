import { Redis } from '@upstash/redis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Global Safety Budget Rules (Cost Protection Caps for Free Tiers)
// 1. Google AI Free Tier: Max 300 THB / month (~357 minutes / 180 clips per month across all free users)
export const GLOBAL_GOOGLE_MONTHLY_CAP_CLIPS = 180;

// 2. Groq AI Free Tier: Max 200 THB / month -> ~6.67 THB / day (~100 minutes / 60 clips per day across all free users)
export const GLOBAL_GROQ_DAILY_CAP_CLIPS = 60;

// Initialize Upstash Redis if environment variables are provided
let redisClient: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis:', err);
  }
}

// In-memory fallback tracking for local development
let memoryGoogleMonthlyClips = 0;
let memoryGoogleMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

let memoryGroqDailyClips = 0;
let memoryGroqDay = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export const GOOGLE_BUDGET_EXCEEDED_MSG =
  'โควต้าใช้งานฟรีด้วย Google AI ของระบบในเดือนนี้เต็มแล้วค่ะ เนื่องจากแต่ละคลิปมีต้นทุนค่า API ที่ทางทีมผู้พัฒนาต้องรับภาระ โดยโควต้าฟรีจะรีเซ็ตใหม่อีกครั้งในวันที่ 1 ของเดือนถัดไป หรือสามารถเติมเครดิต / ใช้โหมด Groq AI / BYOK เพื่อใช้งานต่อได้ทันทีค่ะ';

export const GROQ_BUDGET_EXCEEDED_MSG =
  'โควต้าใช้งานฟรีด้วย Groq AI ของระบบในวันนี้เต็มแล้วค่ะ เนื่องจากมีผู้ใช้งานครบโควต้าสนับสนุนประจำวันแล้ว (ระบบจะรีเซ็ตโควต้าฟรีใหม่ทุกเที่ยงคืน) กรุณากลับมาใหม่ในวันพรุ่งนี้ หรือเติมเครดิตเพื่อใช้งานต่อได้ทันทีค่ะ';

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function calculateCreditUsage(durationSeconds: number): number {
  const roundedSecs = Math.round(durationSeconds);
  if (roundedSecs <= 0) return 0;
  const fullMinutes = Math.floor(roundedSecs / 60);
  const remainingSeconds = roundedSecs % 60;
  if (fullMinutes === 0) return 1;
  if (remainingSeconds > 40) return fullMinutes + 1;
  return fullMinutes;
}

export async function checkSafetyBudget(
  provider: 'google' | 'groq',
  isPaidUser: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  // Paid credit users are NEVER blocked by budget caps
  if (isPaidUser) {
    return { allowed: true };
  }

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const currentDay = now.toISOString().slice(0, 10);   // YYYY-MM-DD

  // 1. Google Free Mode Budget Check
  if (provider === 'google') {
    if (redisClient) {
      try {
        const count = await redisClient.get<number>(`subthaitle:budget:google:${currentMonth}`);
        if (count && count >= GLOBAL_GOOGLE_MONTHLY_CAP_CLIPS) {
          return { allowed: false, reason: GOOGLE_BUDGET_EXCEEDED_MSG };
        }
      } catch (err) {
        console.warn('Redis budget check error:', err);
      }
    } else {
      if (memoryGoogleMonth !== currentMonth) {
        memoryGoogleMonth = currentMonth;
        memoryGoogleMonthlyClips = 0;
      }
      if (memoryGoogleMonthlyClips >= GLOBAL_GOOGLE_MONTHLY_CAP_CLIPS) {
        return { allowed: false, reason: GOOGLE_BUDGET_EXCEEDED_MSG };
      }
    }
  }

  // 2. Groq Free Mode Budget Check
  if (provider === 'groq') {
    if (redisClient) {
      try {
        const count = await redisClient.get<number>(`subthaitle:budget:groq:${currentDay}`);
        if (count && count >= GLOBAL_GROQ_DAILY_CAP_CLIPS) {
          return { allowed: false, reason: GROQ_BUDGET_EXCEEDED_MSG };
        }
      } catch (err) {
        console.warn('Redis budget check error:', err);
      }
    } else {
      if (memoryGroqDay !== currentDay) {
        memoryGroqDay = currentDay;
        memoryGroqDailyClips = 0;
      }
      if (memoryGroqDailyClips >= GLOBAL_GROQ_DAILY_CAP_CLIPS) {
        return { allowed: false, reason: GROQ_BUDGET_EXCEEDED_MSG };
      }
    }
  }

  return { allowed: true };
}

export async function recordSafetyBudgetUsage(provider: 'google' | 'groq', isPaidUser: boolean) {
  if (isPaidUser) return;

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const currentDay = now.toISOString().slice(0, 10);

  if (provider === 'google') {
    if (redisClient) {
      try {
        await redisClient.incr(`subthaitle:budget:google:${currentMonth}`);
        await redisClient.expire(`subthaitle:budget:google:${currentMonth}`, 35 * 24 * 3600);
      } catch {}
    } else {
      memoryGoogleMonthlyClips++;
    }
  }

  if (provider === 'groq') {
    if (redisClient) {
      try {
        await redisClient.incr(`subthaitle:budget:groq:${currentDay}`);
        await redisClient.expire(`subthaitle:budget:groq:${currentDay}`, 2 * 24 * 3600);
      } catch {}
    } else {
      memoryGroqDailyClips++;
    }
  }
}
