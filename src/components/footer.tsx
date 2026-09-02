import Link from 'next/link';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs text-zinc-400 bg-zinc-950 space-y-2">
      <div className="flex items-center justify-center gap-4">
        <span>© SUBTHAITLE • AI Thai Caption Studio for Creators</span>
        <span>•</span>
        <Link
          href="/donate"
          className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-1 transition-colors"
        >
          <Heart className="w-3.5 h-3.5 fill-orange-400" />
          <span>ร่วมสนับสนุนค่าเซิร์ฟเวอร์ & เลี้ยงกาแฟทีมงาน ☕</span>
        </Link>
      </div>
    </footer>
  );
}
