import { getSupabaseAdmin } from '../billing/quota';

export interface TranscribedWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
  words?: TranscribedWord[];
}

export interface AcousticWord {
  word: string;
  start: number;
  end: number;
}

/**
 * 📚 Dynamic Dictionary & Auto-Learned Phrases Loader
 */
export async function getDynamicCustomDictionary(): Promise<{ phrases: string[]; rulesText: string }> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { phrases: [], rulesText: '' };

    const { data } = await supabase
      .from('custom_dictionary')
      .select('wrong_word, correct_word')
      .limit(100);

    if (!data || data.length === 0) return { phrases: [], rulesText: '' };

    const phrases = Array.from(new Set(data.map((d) => d.correct_word).filter(Boolean)));
    const rules = data
      .filter((d) => d.wrong_word && d.correct_word)
      .map((d) => `- "${d.wrong_word}" → "${d.correct_word}"`);

    const rulesText = rules.length > 0 ? `\n\n【AUTO-LEARNED & CUSTOM RULES】\n${rules.join('\n')}` : '';
    return { phrases, rulesText };
  } catch {
    return { phrases: [], rulesText: '' };
  }
}

/**
 * Align LLM-corrected words with original acoustic timestamps
 */
export function alignCorrectedWords(
  originalWords: TranscribedWord[],
  correctedWords: (string | { word: string })[]
): TranscribedWord[] {
  if (originalWords.length === 0 || correctedWords.length === 0) return originalWords;

  // Case 1: Exact 1-to-1 match
  if (originalWords.length === correctedWords.length) {
    return originalWords.map((orig, i) => {
      const item = correctedWords[i];
      const wordStr = typeof item === 'string' ? item : item?.word || orig.word;
      return {
        word: wordStr,
        start: orig.start,
        end: orig.end,
        confidence: orig.confidence,
      };
    });
  }

  // Case 2: Length difference with syllable-weighted distribution to avoid overlap
  const totalStart = originalWords[0].start;
  const totalEnd = originalWords[originalWords.length - 1].end;
  const totalDuration = Math.max(0.1, totalEnd - totalStart);

  const wordStrings = correctedWords.map((item) => (typeof item === 'string' ? item : item?.word || ''));
  const weights = wordStrings.map((w) => Math.max(1, w.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let currentStart = totalStart;
  return wordStrings.map((w, idx) => {
    const proportion = weights[idx] / Math.max(1, totalWeight);
    const wordDuration = totalDuration * proportion;
    const wStart = parseFloat(currentStart.toFixed(2));
    const wEnd = parseFloat(Math.max(wStart + 0.05, currentStart + wordDuration).toFixed(2));
    currentStart = wEnd;

    return {
      word: w,
      start: wStart,
      end: wEnd,
      confidence: 0.95,
    };
  });
}

/**
 * Syllable-weighted word timing computation with strict monotonic non-overlapping timestamps
 */
export function computeSyllableWeightedWords(
  segText: string,
  segStart: number,
  segEnd: number,
  rawWordsList: Array<string | { word?: string; start?: number | string; end?: number | string }>
): TranscribedWord[] {
  const duration = Math.max(0.2, segEnd - segStart);
  const wordsList = rawWordsList
    .map((w) => (typeof w === 'string' ? w : w.word || ''))
    .filter((w) => w.trim().length > 0);

  if (wordsList.length === 0) {
    return [{ word: segText, start: segStart, end: segEnd, confidence: 0.98 }];
  }

  // Calculate weights based on Thai characters + english length
  const weights = wordsList.map((w) => Math.max(1, w.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let currentStart = segStart;
  return wordsList.map((w, idx) => {
    const proportion = weights[idx] / Math.max(1, totalWeight);
    const wordDuration = duration * proportion;
    const wStart = parseFloat(currentStart.toFixed(2));
    // Ensure strict minimum duration and no backwards time
    const wEnd = parseFloat(Math.max(wStart + 0.05, currentStart + wordDuration).toFixed(2));
    currentStart = wEnd;

    return {
      word: w,
      start: wStart,
      end: wEnd,
      confidence: 0.98,
    };
  });
}

/**
 * Segment-Anchored Acoustic Snapper:
 * Snaps each of Gemini's semantic segments to the exact Whisper acoustic boundaries within its local time window.
 */
export function mapPerfectTextToAcousticWords(
  geminiResult: { text: string; words: TranscribedWord[]; segments: SubtitleSegment[]; duration: number },
  acousticWords: AcousticWord[]
): { text: string; words: TranscribedWord[]; segments: SubtitleSegment[]; duration: number } {
  if (!geminiResult.segments || geminiResult.segments.length === 0 || !acousticWords || acousticWords.length === 0) {
    return geminiResult;
  }

  const finalSegments: SubtitleSegment[] = [];
  const finalWords: TranscribedWord[] = [];
  let lastEnd = 0;

  for (const seg of geminiResult.segments) {
    const rawStart = typeof seg.start === 'number' ? seg.start : parseFloat(String(seg.start)) || 0;
    const rawEnd = typeof seg.end === 'number' ? seg.end : parseFloat(String(seg.end)) || rawStart + 2.5;
    const segText = seg.text.trim();

    if (!segText) continue;

    // Find all Whisper acoustic words that fall inside or near this segment [start - 0.6s, end + 0.6s]
    const localAcousticWords = acousticWords.filter(
      (aw) => aw.end >= rawStart - 0.6 && aw.start <= rawEnd + 0.6
    );

    let snappedStart = Math.max(lastEnd, rawStart);
    let snappedEnd = rawEnd;

    if (localAcousticWords.length > 0) {
      snappedStart = Math.max(lastEnd, localAcousticWords[0].start);
      snappedEnd = Math.max(snappedStart + 0.3, localAcousticWords[localAcousticWords.length - 1].end);
    }

    // Guard against negative/inverted durations
    if (snappedEnd <= snappedStart) {
      snappedEnd = snappedStart + 1.5;
    }
    lastEnd = snappedEnd;

    const segRawWords = Array.isArray(seg.words) && seg.words.length > 0
      ? seg.words.map(w => typeof w === 'string' ? w : w.word || '')
      : segText.split(' ').filter(Boolean);

    const segWords = computeSyllableWeightedWords(segText, snappedStart, snappedEnd, segRawWords);
    finalWords.push(...segWords);

    finalSegments.push({
      start: parseFloat(snappedStart.toFixed(2)),
      end: parseFloat(snappedEnd.toFixed(2)),
      text: segText,
      words: segWords,
    });
  }

  return {
    text: geminiResult.text,
    duration: finalWords.length > 0 ? finalWords[finalWords.length - 1].end : geminiResult.duration,
    segments: finalSegments,
    words: finalWords,
  };
}
