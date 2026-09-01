import Stripe from 'stripe';

const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      typescript: true,
    })
  : null;

export interface StripePackageConfig {
  id: string;
  name: string;
  amount: number; // in Satang (100 Satang = 1 THB)
  currency: string;
  minutes: number;
  isLifetime?: boolean;
  description: string;
}

export const STRIPE_PACKAGES: Record<string, StripePackageConfig> = {
  credit_99: {
    id: 'credit_99',
    name: 'SUBTHAITLE Starter เติม 99฿ (+60 นาที)',
    amount: 9900,
    currency: 'thb',
    minutes: 60,
    description: 'เครดิตถอดเสียงภาษาไทย 1 ชั่วโมงเต็ม (~60 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_249: {
    id: 'credit_249',
    name: 'SUBTHAITLE Creator เติม 249฿ (+180 นาที)',
    amount: 24900,
    currency: 'thb',
    minutes: 180,
    description: 'เครดิตถอดเสียงภาษาไทย 3 ชั่วโมงเต็ม (~180 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_599: {
    id: 'credit_599',
    name: 'SUBTHAITLE Pro Studio เติม 599฿ (+480 นาที)',
    amount: 59900,
    currency: 'thb',
    minutes: 480,
    description: 'เครดิตถอดเสียงภาษาไทย 8 ชั่วโมงเต็ม (~480 คลิป) ไม่มีวันหมดอายุ',
  },
  tier_699: {
    id: 'tier_699',
    name: 'SUBTHAITLE Lifetime Pass 699฿ (ซื้อขาดตลอดชีพ)',
    amount: 69900,
    currency: 'thb',
    minutes: 0,
    isLifetime: true,
    description: 'ปลดล็อกสิทธิ์ใช้งาน BYOK (ใส่ API Key ตัวเอง) และ Local AI ตลอดชีพ',
  },
  lifetime_699: {
    id: 'lifetime_699',
    name: 'SUBTHAITLE Lifetime Pass 699฿ (ซื้อขาดตลอดชีพ)',
    amount: 69900,
    currency: 'thb',
    minutes: 0,
    isLifetime: true,
    description: 'ปลดล็อกสิทธิ์ใช้งาน BYOK (ใส่ API Key ตัวเอง) และ Local AI ตลอดชีพ',
  },
};

// Backward compatibility alias
export const TIER_PRICES = STRIPE_PACKAGES;
