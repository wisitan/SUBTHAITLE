'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminPinModal({ isOpen, onClose, onSuccess }: AdminPinModalProps) {
  const router = useRouter();
  const setIsAdmin = useAppStore((state) => state.setIsAdmin);
  const setAdminToken = useAppStore((state) => state.setAdminToken);
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError(false);
      setSuccess(false);
      setIsVerifying(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyPinOnServer = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setIsAdmin(true);
        if (data.token) {
          setAdminToken(data.token);
        }
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/admin/dictionary');
          }
        }, 600);
      } else {
        setError(true);
        setTimeout(() => {
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 800);
      }
    } catch {
      setError(true);
      setTimeout(() => {
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }, 800);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check PIN if all 4 digits entered
    const enteredPin = newPin.join('');
    if (enteredPin.length === 4) {
      verifyPinOnServer(enteredPin);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all ${
              success
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 scale-110'
                : error
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 animate-shake'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300'
            }`}
          >
            {success ? (
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <Lock className="h-7 w-7" />
            )}
          </div>
          <h3 className="text-xl font-bold text-white">ระบบจัดการผู้ดูแลระบบ (Admin)</h3>
          <p className="mt-1.5 text-sm text-zinc-300">
            กรุณาระบุรหัส PIN 4 หลักเพื่อเข้าสู่ระบบ Dictionary
          </p>
        </div>

        {/* PIN Inputs */}
        <div className="mt-6 flex justify-center gap-3">
          {pin.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={isVerifying || success}
              className={`h-14 w-12 rounded-xl border text-center text-2xl font-bold transition-all outline-none ${
                error
                  ? 'border-rose-500 bg-rose-500/10 text-rose-400 focus:ring-2 focus:ring-rose-500/50'
                  : success
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 focus:ring-2 focus:ring-emerald-500/50'
                  : 'border-zinc-800 bg-zinc-900/80 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
              } disabled:opacity-60`}
            />
          ))}
        </div>

        {/* Status Message */}
        <div className="mt-4 min-h-[24px] text-center">
          {isVerifying && (
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-400 animate-pulse">
              กำลังตรวจสอบรหัส PIN...
            </p>
          )}
          {error && (
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-rose-400 animate-in fade-in">
              <AlertCircle className="h-4 w-4" /> รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
            </p>
          )}
          {success && (
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-400 animate-in fade-in">
              <ShieldCheck className="h-4 w-4" /> ยืนยันสิทธิ์ Admin สำเร็จ กำลังเข้าสู่ระบบ...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
