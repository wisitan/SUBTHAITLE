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
  credit_59: {
    id: 'credit_59',
    name: 'SUBTHAITLE Mini เติม 59฿ (+45 นาที)',
    amount: 5900,
    currency: 'thb',
    minutes: 45,
    description: 'เครดิตถอดเสียงภาษาไทย 45 นาที (~30 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_99: {
    id: 'credit_99',
    name: 'SUBTHAITLE Starter เติม 99฿ (+90 นาที)',
    amount: 9900,
    currency: 'thb',
    minutes: 90,
    description: 'เครดิตถอดเสียงภาษาไทย 1.5 ชั่วโมง (~70 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_199: {
    id: 'credit_199',
    name: 'SUBTHAITLE Creator เติม 199฿ (+240 นาที)',
    amount: 19900,
    currency: 'thb',
    minutes: 240,
    description: 'เครดิตถอดเสียงภาษาไทย 4 ชั่วโมงเต็ม (~200 คลิป) ยอดนิยมสูงสุด ไม่มีวันหมดอายุ',
  },
  credit_399: {
    id: 'credit_399',
    name: 'SUBTHAITLE Pro Studio เติม 399฿ (+600 นาที)',
    amount: 39900,
    currency: 'thb',
    minutes: 600,
    description: 'เครดิตถอดเสียงภาษาไทย 10 ชั่วโมงเต็ม (~500 คลิป) คุ้มค่าสูงสุด ไม่มีวันหมดอายุ',
  },
  // Backward compatibility alias for legacy webhook callbacks
  credit_249: {
    id: 'credit_249',
    name: 'SUBTHAITLE Creator เติม 249฿ (+180 นาที)',
    amount: 24900,
    currency: 'thb',
    minutes: 180,
    description: 'เครดิตถอดเสียงภาษาไทย 3 ชั่วโมงเต็ม',
  },
  credit_599: {
    id: 'credit_599',
    name: 'SUBTHAITLE Pro Studio เติม 599฿ (+480 นาที)',
    amount: 59900,
    currency: 'thb',
    minutes: 480,
    description: 'เครดิตถอดเสียงภาษาไทย 8 ชั่วโมงเต็ม',
  },
};

// Backward compatibility alias
export const TIER_PRICES = STRIPE_PACKAGES;
