import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      typescript: true,
    })
  : null;

export const TIER_PRICES = {
  tier_99: {
    name: 'SUBTHAITLE Supporter (99฿)',
    amount: 9900, // 99 THB in Satang
    currency: 'thb',
    description: 'ปลดล็อก BYOK ไม่จำกัด, โควต้า 5 คลิป/วัน, และ 5 Custom Presets',
  },
  tier_299: {
    name: 'SUBTHAITLE Pro Creator (299฿)',
    amount: 29900, // 299 THB in Satang
    currency: 'thb',
    description: 'ปลดล็อก BYOK ไม่จำกัด, โควต้า 5 คลิป/วัน, 20 Custom Presets, และฟอนต์พรีเมียม',
  },
} as const;
