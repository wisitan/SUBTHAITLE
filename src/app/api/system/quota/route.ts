import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Global Daily Pool Config (500 clips / day)
export const GLOBAL_DAILY_LIMIT = 500;

let currentDay = new Date().toISOString().split('T')[0];
let dailyCount = 0;

export function getDailySystemUsage() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== currentDay) {
    currentDay = today;
    dailyCount = 0;
  }

  const remaining = Math.max(0, GLOBAL_DAILY_LIMIT - dailyCount);
  const percentage = Math.max(
    0,
    Math.min(100, Math.round((remaining / GLOBAL_DAILY_LIMIT) * 100))
  );

  let energyLevel: 'full' | 'medium' | 'low' | 'empty' = 'full';
  if (percentage <= 0) {
    energyLevel = 'empty';
  } else if (percentage <= 25) {
    energyLevel = 'low';
  } else if (percentage <= 65) {
    energyLevel = 'medium';
  } else {
    energyLevel = 'full';
  }

  return {
    today,
    remaining,
    isExhausted: dailyCount >= GLOBAL_DAILY_LIMIT,
    percentage,
    energyLevel,
  };
}

export function incrementDailySystemUsage() {
  getDailySystemUsage(); // Ensure date check
  dailyCount++;
}

export async function GET() {
  const usage = getDailySystemUsage();
  // Return energy percentage & level (No raw numbers displayed to user as requested)
  return NextResponse.json({
    energyLevel: usage.energyLevel,
    percentage: usage.percentage,
    isExhausted: usage.isExhausted,
  });
}
