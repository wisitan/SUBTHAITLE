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
  coffee_59: {
    id: 'coffee_59',
    name: '☕ เลี้ยงกาแฟทีมงาน 59฿ (โควต้าขอบคุณ 60 นาที)',
    amount: 5900,
    currency: 'thb',
    minutes: 60,
    description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ รับโควต้าถอดเสียง 60 นาที (~40 คลิป) ไม่มีวันหมดอายุ',
  },
  meal_99: {
    id: 'meal_99',
    name: '🍛 เลี้ยงข้าวทีมงาน 99฿ (โควต้าขอบคุณ 120 นาที)',
    amount: 9900,
    currency: 'thb',
    minutes: 120,
    description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ รับโควต้าถอดเสียง 2 ชั่วโมง (~90 คลิป) ไม่มีวันหมดอายุ',
  },
  starbucks_199: {
    id: 'starbucks_199',
    name: '🥤 เลี้ยง Starbucks ทีมงาน 199฿ (โควต้าขอบคุณ 300 นาที)',
    amount: 19900,
    currency: 'thb',
    minutes: 300,
    description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ รับโควต้าถอดเสียง 5 ชั่วโมงเต็ม (~250 คลิป) ยอดนิยมสูงสุด ไม่มีวันหมดอายุ',
  },

  // Backward compatibility aliases
  credit_59: {
    id: 'credit_59',
    name: '☕ เลี้ยงกาแฟทีมงาน 59฿ (โควต้าขอบคุณ 60 นาที)',
    amount: 5900,
    currency: 'thb',
    minutes: 60,
    description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ รับโควต้าถอดเสียง 60 นาที (~40 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_99: {
    id: 'credit_99',
    name: '🍛 เลี้ยงข้าวทีมงาน 99฿ (โควต้าขอบคุณ 120 นาที)',
    amount: 9900,
    currency: 'thb',
    minutes: 120,
    description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ รับโควต้าถอดเสียง 120 นาที (~90 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_199: {
    id: 'credit_199',
    name: '🥤 เลี้ยง Starbucks ทีมงาน 199฿ (โควต้าขอบคุณ 300 นาที)',
    amount: 19900,
    currency: 'thb',
    minutes: 300,
    description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ รับโควต้าถอดเสียง 300 นาที (~250 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_399: {
    id: 'credit_399',
    name: '🏆 Super Supporter 399฿ (โควต้าขอบคุณ 600 นาที)',
    amount: 39900,
    currency: 'thb',
    minutes: 600,
    description: 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์ รับโควต้าถอดเสียง 10 ชั่วโมงเต็ม (~500 คลิป) ไม่มีวันหมดอายุ',
  },
  credit_249: {
    id: 'credit_249',
    name: 'SUBTHAITLE Supporter 249฿ (+180 นาที)',
    amount: 24900,
    currency: 'thb',
    minutes: 180,
    description: 'เครดิตถอดเสียงภาษาไทย 180 นาที ไม่มีวันหมดอายุ',
  },
};
