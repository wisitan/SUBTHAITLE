export interface FontOption {
  id: string;
  name: string;
  category: 'sans' | 'serif' | 'display' | 'handwriting' | 'custom';
  googleFontName?: string;
  previewText?: string;
  weights?: string[];
}

export const THAI_SYSTEM_FONTS: FontOption[] = [
  {
    id: 'Noto Sans Thai',
    name: 'Noto Sans Thai',
    category: 'sans',
    googleFontName: 'Noto+Sans+Thai:wght@400;600;700;800',
    previewText: 'สวัสดีครับ คมชัด เรียบหรู',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Kanit',
    name: 'Kanit (ยอดนิยม TikTok)',
    category: 'sans',
    googleFontName: 'Kanit:wght@400;600;700;800;900',
    previewText: 'สไตล์วัยรุ่น ฮิตใน Shorts/Reels',
    weights: ['400', '600', '700', '800', '900'],
  },
  {
    id: 'Prompt',
    name: 'Prompt (เท่ โมเดิร์น)',
    category: 'sans',
    googleFontName: 'Prompt:wght@400;600;700;800',
    previewText: 'สไตล์ Tech & Minimalist ทันสมัย',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Sarabun',
    name: 'Sarabun (ทางการ ชัดเจน)',
    category: 'sans',
    googleFontName: 'Sarabun:wght@400;600;700;800',
    previewText: 'มีหัว อ่านง่าย เป็นทางการ',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Mitr',
    name: 'Mitr (มิตร สดใส)',
    category: 'sans',
    googleFontName: 'Mitr:wght@400;600;700',
    previewText: 'น่ารัก เป็นกันเอง เหมาะกับ Vlog',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Chonburi',
    name: 'Chonburi (ชลบุรี ตัวหนาโดดเด่น)',
    category: 'display',
    googleFontName: 'Chonburi',
    previewText: 'หัวข้อใหญ่ ตัวหนา สไตล์เรโทร',
    weights: ['400'],
  },
  {
    id: 'Itim',
    name: 'Itim (ไอติม น่ารัก)',
    category: 'handwriting',
    googleFontName: 'Itim',
    previewText: 'ลายมือสดใส น่ารัก ไลฟ์สไตล์',
    weights: ['400'],
  },
  {
    id: 'Charm',
    name: 'Charm (ชาร์ม ลายมือพริ้ว)',
    category: 'handwriting',
    googleFontName: 'Charm:wght@400;700',
    previewText: 'ลายมือหวัด พริ้วไหว สวยงาม',
    weights: ['400', '700'],
  },
];

const loadedGoogleFonts = new Set<string>();

/**
 * Dynamically loads a Google Font into the DOM
 */
export function loadGoogleFont(fontName: string): void {
  if (typeof document === 'undefined') return;

  const font = THAI_SYSTEM_FONTS.find((f) => f.id === fontName);
  if (!font || !font.googleFontName) return;

  const fontId = `gfont-${font.id.replace(/\s+/g, '-').toLowerCase()}`;
  if (loadedGoogleFonts.has(fontId) || document.getElementById(fontId)) {
    return;
  }

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontName}&display=swap`;
  document.head.appendChild(link);
  loadedGoogleFonts.add(fontId);
}

/**
 * Loads a custom uploaded font file (.ttf / .otf / .woff) into document.fonts
 */
export async function loadCustomFontFile(file: File): Promise<string> {
  const fontName = `Custom_${file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const arrayBuffer = await file.arrayBuffer();

  const fontFace = new FontFace(fontName, arrayBuffer);
  const loadedFace = await fontFace.load();
  document.fonts.add(loadedFace);

  return fontName;
}
