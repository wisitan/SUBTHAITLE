export interface FontOption {
  id: string;
  name: string;
  category: 'sans' | 'serif' | 'display' | 'handwriting' | 'custom';
  googleFontName?: string;
  previewText?: string;
  weights?: string[];
  isPremium?: boolean;
}

export const THAI_SYSTEM_FONTS: FontOption[] = [
  {
    id: 'Kanit',
    name: 'Kanit',
    category: 'sans',
    googleFontName: 'Kanit:wght@400;600;700;800;900',
    previewText: 'สไตล์วัยรุ่น ฮิตใน TikTok/Reels',
    weights: ['400', '600', '700', '800', '900'],
  },
  {
    id: 'Sarabun',
    name: 'Sarabun',
    category: 'sans',
    googleFontName: 'Sarabun:wght@400;600;700;800',
    previewText: 'มีหัว อ่านง่าย เป็นทางการ สุภาพ',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Prompt',
    name: 'Prompt',
    category: 'sans',
    googleFontName: 'Prompt:wght@400;600;700;800',
    previewText: 'สไตล์ Tech & Minimalist ทันสมัย',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Bai Jamjuree',
    name: 'Bai Jamjuree',
    category: 'sans',
    googleFontName: 'Bai+Jamjuree:wght@400;600;700',
    previewText: 'กึ่งเหลี่ยม ทันสมัย คอนเทนต์ท่องเที่ยว',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Chakra Petch',
    name: 'Chakra Petch',
    category: 'display',
    googleFontName: 'Chakra+Petch:wght@400;600;700',
    previewText: 'สายเกมเมอร์ ไซไฟ ล้ำยุค',
    weights: ['400', '600', '700'],
  },
  {
    id: 'IBM Plex Sans Thai',
    name: 'IBM Plex Sans Thai',
    category: 'sans',
    googleFontName: 'IBM+Plex+Sans+Thai:wght@400;600;700',
    previewText: 'โมเดิร์น สไตล์สากล เทคโนโลยี',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Noto Sans Thai',
    name: 'Noto Sans Thai',
    category: 'sans',
    googleFontName: 'Noto+Sans+Thai:wght@400;600;700;800',
    previewText: 'สวัสดีครับ คมชัด เรียบหรู มาตรฐาน',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Pridi',
    name: 'Pridi',
    category: 'serif',
    googleFontName: 'Pridi:wght@400;600;700',
    previewText: 'หรูหรา น่าเชื่อถือ สไตล์สารคดี',
    weights: ['400', '600', '700'],
  },
  {
    id: 'K2D',
    name: 'K2D',
    category: 'sans',
    googleFontName: 'K2D:wght@400;600;700;800',
    previewText: 'โค้งมน นุ่มนวล ดูง่าย สดใส',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Krub',
    name: 'Krub',
    category: 'sans',
    googleFontName: 'Krub:wght@400;600;700',
    previewText: 'สุภาพ เรียบเนียน สะอาดตา',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Maitree',
    name: 'Maitree',
    category: 'serif',
    googleFontName: 'Maitree:wght@400;600;700',
    previewText: 'คลาสสิก ย้อนยุค มีคุณค่า',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Niramit',
    name: 'Niramit',
    category: 'sans',
    googleFontName: 'Niramit:wght@400;600;700',
    previewText: 'ประณีต นุ่มนวล สไตล์นิยาย',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Athiti',
    name: 'Athiti',
    category: 'sans',
    googleFontName: 'Athiti:wght@400;600;700',
    previewText: 'เป็นกันเอง สบายๆ สนุกสนาน',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Trirong',
    name: 'Trirong',
    category: 'serif',
    googleFontName: 'Trirong:wght@400;600;700',
    previewText: 'สง่างาม ภูมิฐาน นิตยสาร',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Fahkwang',
    name: 'Fahkwang',
    category: 'sans',
    googleFontName: 'Fahkwang:wght@400;600;700',
    previewText: 'แฟชั่น เก๋ไก๋ ทรงเสน่ห์',
    weights: ['400', '600', '700'],
  },
  {
    id: 'KoHo',
    name: 'KoHo',
    category: 'sans',
    googleFontName: 'KoHo:wght@400;600;700',
    previewText: 'มินิมอล เส้นสายเรียบง่าย',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Taviraj',
    name: 'Taviraj',
    category: 'serif',
    googleFontName: 'Taviraj:wght@400;600;700',
    previewText: 'วรรณกรรม วินเทจ อบอุ่น',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Mali',
    name: 'Mali',
    category: 'handwriting',
    googleFontName: 'Mali:wght@400;600;700',
    previewText: 'ลายมือน่ารัก คอนเทนต์ท่องเที่ยว Vlog',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Charm',
    name: 'Charm',
    category: 'handwriting',
    googleFontName: 'Charm:wght@400;700',
    previewText: 'ลายมือหวัด พริ้วไหว สวยงาม',
    weights: ['400', '700'],
  },
  {
    id: 'Charmonman',
    name: 'Charmonman',
    category: 'handwriting',
    googleFontName: 'Charmonman:wght@400;700',
    previewText: 'ลายมือหรูหรา วิจิตร อ่อนช้อย',
    weights: ['400', '700'],
  },
  {
    id: 'Montserrat',
    name: 'Montserrat',
    category: 'sans',
    googleFontName: 'Montserrat:wght@400;600;700;800;900',
    previewText: 'Bold & Punchy อินเตอร์เนชันแนล',
    weights: ['400', '600', '700', '800', '900'],
  },
  {
    id: 'Poppins',
    name: 'Poppins',
    category: 'sans',
    googleFontName: 'Poppins:wght@400;600;700;800;900',
    previewText: 'เรขาคณิต โมเดิร์น สะดุดตา',
    weights: ['400', '600', '700', '800', '900'],
  },
  {
    id: 'Oswald',
    name: 'Oswald',
    category: 'sans',
    googleFontName: 'Oswald:wght@400;600;700',
    previewText: 'ทรงสูง แคบ ตัวหนา โดดเด่น',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Inter',
    name: 'Inter',
    category: 'sans',
    googleFontName: 'Inter:wght@400;600;700;800',
    previewText: 'อ่านง่าย คมชัด ระดับสากล',
    weights: ['400', '600', '700', '800'],
  },
  {
    id: 'Roboto',
    name: 'Roboto',
    category: 'sans',
    googleFontName: 'Roboto:wght@400;500;700;900',
    previewText: 'คลาสสิก สมดุล เป็นที่นิยม',
    weights: ['400', '500', '700', '900'],
  },
  {
    id: 'Mitr',
    name: 'Mitr',
    category: 'sans',
    googleFontName: 'Mitr:wght@400;600;700',
    previewText: 'มิตร สดใส น่ารัก เป็นกันเอง',
    weights: ['400', '600', '700'],
  },
  {
    id: 'Sriracha',
    name: 'Sriracha',
    category: 'display',
    googleFontName: 'Sriracha',
    previewText: 'สายสตรีท อาหาร รีวิวของกิน',
    weights: ['400'],
  },
  {
    id: 'Chonburi',
    name: 'Chonburi',
    category: 'display',
    googleFontName: 'Chonburi',
    previewText: 'หัวข้อใหญ่ ตัวหนา สไตล์เรโทร',
    weights: ['400'],
  },
  {
    id: 'Itim',
    name: 'Itim',
    category: 'handwriting',
    googleFontName: 'Itim',
    previewText: 'ลายมือไอติม สดใส น่ารัก ไลฟ์สไตล์',
    weights: ['400'],
  },
];

const loadedGoogleFonts = new Set<string>();

// Registry to hold array buffers of custom fonts so ffmpeg can use them during export
const customFontRegistry = new Map<string, ArrayBuffer>();

export function getCustomFontBuffer(fontName: string): ArrayBuffer | undefined {
  return customFontRegistry.get(fontName);
}

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

  // Store for ffmpeg export
  customFontRegistry.set(fontName, arrayBuffer);

  return fontName;
}
