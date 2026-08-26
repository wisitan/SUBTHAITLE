'use client';

import React, { useState } from 'react';
import { AdminPinModal } from './admin-pin-modal';

export function Footer() {
  const [showPinModal, setShowPinModal] = useState(false);

  return (
    <>
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 bg-zinc-950">
        <p className="flex items-center justify-center gap-1">
          <button
            onClick={() => setShowPinModal(true)}
            className="hover:text-zinc-300 transition-colors cursor-pointer select-none focus:outline-none"
            aria-label="Admin Access"
          >
            ©
          </button>
          <span>SUBTHAITLE • AI Thai Caption Studio for Content Creators</span>
        </p>
      </footer>

      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
      />
    </>
  );
}
