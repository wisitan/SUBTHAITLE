/**
 * Built-in Core Dictionary for Thai Speech-to-Text (Whisper) Correction
 * 
 * Curated list of common Whisper hallucinations, phonetic misspellings,
 * English-Thai transliterations, Tech/Gadget brands, and E-commerce creator terms.
 */

export interface DictionaryEntry {
  id?: number;
  wrong_word: string;
  correct_word: string;
  category: 'tech' | 'creator' | 'brands' | 'general' | 'slang';
  created_at?: string;
}

export const DEFAULT_THAI_DICTIONARY: DictionaryEntry[] = [
  // === Creator & E-commerce Terms ===
  { wrong_word: 'ตักก้า', correct_word: 'ตะกร้า', category: 'creator' },
  { wrong_word: 'ตระกร้า', correct_word: 'ตะกร้า', category: 'creator' },
  { wrong_word: 'กดไลค์', correct_word: 'กด Like', category: 'creator' },
  { wrong_word: 'กดไลก์', correct_word: 'กด Like', category: 'creator' },
  { wrong_word: 'กดไลท์', correct_word: 'กด Like', category: 'creator' },
  { wrong_word: 'กดแชร์', correct_word: 'กด Share', category: 'creator' },
  { wrong_word: 'กดฟอล', correct_word: 'กด Follow', category: 'creator' },
  { wrong_word: 'ฟอลโลเวอร์', correct_word: 'Followers', category: 'creator' },
  { wrong_word: 'ซับสไครบ์', correct_word: 'Subscribe', category: 'creator' },
  { wrong_word: 'ซับสไครบ', correct_word: 'Subscribe', category: 'creator' },
  { wrong_word: 'อินฟลู', correct_word: 'Influencer', category: 'creator' },
  { wrong_word: 'อินฟลูเอนเซอร์', correct_word: 'Influencer', category: 'creator' },
  { wrong_word: 'แอดมิน', correct_word: 'Admin', category: 'creator' },
  { wrong_word: 'คอนเทนต์', correct_word: 'Content', category: 'creator' },
  { wrong_word: 'คอนเทนต์ครีเอเตอร์', correct_word: 'Content Creator', category: 'creator' },
  { wrong_word: 'คลิปวิว', correct_word: 'ยอดวิว', category: 'creator' },
  { wrong_word: 'ปักตักก้า', correct_word: 'ปักตะกร้า', category: 'creator' },
  { wrong_word: 'โค้ดส่วนลด', correct_word: 'Code ส่วนลด', category: 'creator' },
  { wrong_word: 'แอฟฟิลิเอต', correct_word: 'Affiliate', category: 'creator' },
  { wrong_word: 'อฟิลิเอท', correct_word: 'Affiliate', category: 'creator' },

  // === Tech, Platforms & Brands ===
  { wrong_word: 'ซัมสูง', correct_word: 'Samsung', category: 'brands' },
  { wrong_word: 'ซัมซุง', correct_word: 'Samsung', category: 'brands' },
  { wrong_word: 'ไอโฟน', correct_word: 'iPhone', category: 'brands' },
  { wrong_word: 'ไอแพด', correct_word: 'iPad', category: 'brands' },
  { wrong_word: 'แอปเปิ้ล', correct_word: 'Apple', category: 'brands' },
  { wrong_word: 'แอปเปิล', correct_word: 'Apple', category: 'brands' },
  { wrong_word: 'แมคบุ๊ค', correct_word: 'MacBook', category: 'brands' },
  { wrong_word: 'แมคบุค', correct_word: 'MacBook', category: 'brands' },
  { wrong_word: 'แอร์พอด', correct_word: 'AirPods', category: 'brands' },
  { wrong_word: 'ติ๊กต็อก', correct_word: 'TikTok', category: 'tech' },
  { wrong_word: 'ติ๊กต๊อก', correct_word: 'TikTok', category: 'tech' },
  { wrong_word: 'ติ๊กตอก', correct_word: 'TikTok', category: 'tech' },
  { wrong_word: 'ยูทูป', correct_word: 'YouTube', category: 'tech' },
  { wrong_word: 'ยูทูบ', correct_word: 'YouTube', category: 'tech' },
  { wrong_word: 'เฟสบุ๊ค', correct_word: 'Facebook', category: 'tech' },
  { wrong_word: 'เฟซบุ๊ก', correct_word: 'Facebook', category: 'tech' },
  { wrong_word: 'ไอจี', correct_word: 'IG', category: 'tech' },
  { wrong_word: 'อินสตาแกรม', correct_word: 'Instagram', category: 'tech' },
  { wrong_word: 'ทวิตเตอร์', correct_word: 'Twitter', category: 'tech' },
  { wrong_word: 'กูเกิ้ล', correct_word: 'Google', category: 'tech' },
  { wrong_word: 'กูเกิล', correct_word: 'Google', category: 'tech' },
  { wrong_word: 'ช้อปปี้', correct_word: 'Shopee', category: 'brands' },
  { wrong_word: 'ลาซาด้า', correct_word: 'Lazada', category: 'brands' },
  { wrong_word: 'ไลน์แมน', correct_word: 'LINE MAN', category: 'brands' },
  { wrong_word: 'แกร็บ', correct_word: 'Grab', category: 'brands' },
  { wrong_word: 'เคแบงก์', correct_word: 'KBank', category: 'brands' },
  { wrong_word: 'กสิกร', correct_word: 'KBank', category: 'brands' },

  // === Gadget & IT Terminology ===
  { wrong_word: 'บลูทูด', correct_word: 'Bluetooth', category: 'tech' },
  { wrong_word: 'บูลทูธ', correct_word: 'Bluetooth', category: 'tech' },
  { wrong_word: 'บลูทูธ', correct_word: 'Bluetooth', category: 'tech' },
  { wrong_word: 'ไวไฟ', correct_word: 'Wi-Fi', category: 'tech' },
  { wrong_word: 'วายฟาย', correct_word: 'Wi-Fi', category: 'tech' },
  { wrong_word: 'ไวเรส', correct_word: 'Wireless', category: 'tech' },
  { wrong_word: 'ไวร์เลส', correct_word: 'Wireless', category: 'tech' },
  { wrong_word: 'แอนดรอย', correct_word: 'Android', category: 'tech' },
  { wrong_word: 'แอนดรอยด์', correct_word: 'Android', category: 'tech' },
  { wrong_word: 'ไอโอเอส', correct_word: 'iOS', category: 'tech' },
  { wrong_word: 'วินโดว์', correct_word: 'Windows', category: 'tech' },
  { wrong_word: 'วินโดวส์', correct_word: 'Windows', category: 'tech' },
  { wrong_word: 'เมาท์', correct_word: 'mouse', category: 'tech' },
  { wrong_word: 'เมาส์', correct_word: 'mouse', category: 'tech' },
  { wrong_word: 'คีย์บอร์ด', correct_word: 'Keyboard', category: 'tech' },
  { wrong_word: 'หน้าจอทัชสกรีน', correct_word: 'หน้าจอ Touchscreen', category: 'tech' },
  { wrong_word: 'พาวเวอร์แบงค์', correct_word: 'Power Bank', category: 'tech' },
  { wrong_word: 'สายชาร์ต', correct_word: 'สายชาร์จ', category: 'tech' },
  { wrong_word: 'ชาร์ตแบต', correct_word: 'ชาร์จแบต', category: 'tech' },
  { wrong_word: 'เซ็นเซอร์', correct_word: 'Sensor', category: 'tech' },
  { wrong_word: 'ไมโครโฟน', correct_word: 'Microphone', category: 'tech' },
  { wrong_word: 'แคปชั่น', correct_word: 'Caption', category: 'tech' },
  { wrong_word: 'ซับไตเติ้ล', correct_word: 'Subtitle', category: 'tech' },
  { wrong_word: 'ซับไตเติล', correct_word: 'Subtitle', category: 'tech' },
  { wrong_word: 'เอไอ', correct_word: 'AI', category: 'tech' },
  { wrong_word: 'แชทจีพีที', correct_word: 'ChatGPT', category: 'tech' },
  { wrong_word: 'เจมินี่', correct_word: 'Gemini', category: 'tech' },
  { wrong_word: 'คลาวด์', correct_word: 'Cloud', category: 'tech' },
  { wrong_word: 'แดชบอร์ด', correct_word: 'Dashboard', category: 'tech' },
  { wrong_word: 'พรีวิว', correct_word: 'Preview', category: 'tech' },
  { wrong_word: 'ดาวน์โหลด', correct_word: 'Download', category: 'tech' },
  { wrong_word: 'อัปโหลด', correct_word: 'Upload', category: 'tech' },
  { wrong_word: 'อัพโหลด', correct_word: 'Upload', category: 'tech' },
  { wrong_word: 'ฟังก์ชัน', correct_word: 'Function', category: 'tech' },
  { wrong_word: 'แอปพลิเคชัน', correct_word: 'Application', category: 'tech' },
  { wrong_word: 'แอปพลิเคชั่น', correct_word: 'Application', category: 'tech' },
  { wrong_word: 'แอพ', correct_word: 'App', category: 'tech' },
  { wrong_word: 'แอป', correct_word: 'App', category: 'tech' },

  // === Common Thai Phonetic / Hallucination Misspellings ===
  { wrong_word: 'กะเพรา', correct_word: 'กะเพรา', category: 'general' },
  { wrong_word: 'กระเพรา', correct_word: 'กะเพรา', category: 'general' },
  { wrong_word: 'นะค่ะ', correct_word: 'นะคะ', category: 'general' },
  { wrong_word: 'สังเกตุ', correct_word: 'สังเกต', category: 'general' },
  { wrong_word: 'อนุญาติต', correct_word: 'อนุญาต', category: 'general' },
  { wrong_word: 'อนุญาติ', correct_word: 'อนุญาต', category: 'general' },
  { wrong_word: 'โอกาส', correct_word: 'โอกาส', category: 'general' },
  { wrong_word: 'อวยพร', correct_word: 'อวยพร', category: 'general' },
  { wrong_word: 'ลำใย', correct_word: 'ลำไย', category: 'general' },
  { wrong_word: 'อีเว้นท์', correct_word: 'Event', category: 'general' },
  { wrong_word: 'อีเวนต์', correct_word: 'Event', category: 'general' },
  { wrong_word: 'เวิร์กช็อป', correct_word: 'Workshop', category: 'general' },
  { wrong_word: 'เวิร์คช็อป', correct_word: 'Workshop', category: 'general' },
  { wrong_word: 'โปรดักส์', correct_word: 'Product', category: 'general' },
  { wrong_word: 'โปรดักต์', correct_word: 'Product', category: 'general' },
  { wrong_word: 'โปรเจกต์', correct_word: 'Project', category: 'general' },
  { wrong_word: 'โปรเจค', correct_word: 'Project', category: 'general' },
  { wrong_word: 'โปรไฟล์', correct_word: 'Profile', category: 'general' },
  { wrong_word: 'คอมเมนต์', correct_word: 'Comment', category: 'general' },
  { wrong_word: 'คอมเม้นต์', correct_word: 'Comment', category: 'general' },
  { wrong_word: 'คอมเม้นท์', correct_word: 'Comment', category: 'general' },
];

/**
 * Merges built-in dictionary with custom dictionary (custom overrides default)
 */
export function getMergedDictionary(customDictionary: DictionaryEntry[] = []): DictionaryEntry[] {
  const map = new Map<string, DictionaryEntry>();

  // 1. Add all built-in words
  DEFAULT_THAI_DICTIONARY.forEach((entry) => {
    map.set(entry.wrong_word.trim().toLowerCase(), entry);
  });

  // 2. Override/add custom words
  customDictionary.forEach((entry) => {
    if (entry.wrong_word && entry.correct_word) {
      // Split by comma in case Admin puts multiple typos for a single correct word
      const wrongs = entry.wrong_word.split(',').map((w) => w.trim()).filter(Boolean);
      wrongs.forEach((w) => {
        map.set(w.toLowerCase(), { ...entry, wrong_word: w });
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Replaces dictionary mistakes within a plain text string.
 */
export function applyDictionaryReplacements(
  text: string,
  customDictionary: DictionaryEntry[] = []
): string {
  if (!text) return '';

  const merged = getMergedDictionary(customDictionary);
  let result = text;

  // Sort by longest wrong_word first to avoid partial subword replacements
  const sorted = [...merged].sort((a, b) => b.wrong_word.length - a.wrong_word.length);

  for (const entry of sorted) {
    const wrong = entry.wrong_word.trim();
    const correct = entry.correct_word.trim();
    if (!wrong || !correct) continue;

    // Use global replace
    const regex = new RegExp(escapeRegex(wrong), 'gi');
    result = result.replace(regex, correct);
  }

  return result;
}

/**
 * Replaces dictionary mistakes within an array of timed CaptionWords.
 * Preserves timestamps while updating the word text.
 */
export function applyDictionaryToWords<T extends { word: string; start: number; end: number }>(
  words: T[],
  customDictionary: DictionaryEntry[] = []
): T[] {
  if (!words || words.length === 0) return [];

  const merged = getMergedDictionary(customDictionary);
  const dictMap = new Map<string, string>();
  merged.forEach((entry) => {
    dictMap.set(entry.wrong_word.trim().toLowerCase(), entry.correct_word.trim());
  });

  return words.map((w) => {
    const cleanWord = w.word.trim().toLowerCase();
    if (dictMap.has(cleanWord)) {
      return {
        ...w,
        word: dictMap.get(cleanWord)!,
      };
    }
    return w;
  });
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
