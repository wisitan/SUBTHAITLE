import { CaptionItem } from './store';

export interface CorrectionDiffItem {
  originalPhrase: string;
  correctedPhrase: string;
  contextBefore?: string;
  contextAfter?: string;
}

/**
 * Normalizes text by removing excessive whitespace and common Thai/English punctuation
 */
function normalizeText(str: string): string {
  return str
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes Thai/mixed text using Intl.Segmenter or fallback splitting
 */
function tokenize(text: string): string[] {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    const segments = Array.from(segmenter.segment(text));
    return segments.map((s) => s.segment).filter((s) => s.trim().length > 0);
  }
  return text.split(/\s+/).filter((s) => s.trim().length > 0);
}

/**
 * Extracts high-confidence correction pairs from caption snapshot diffs.
 * Filters out trivial formatting, whitespace changes, or total sentence rewrites.
 */
export function extractCorrectionDiffs(captions: CaptionItem[]): CorrectionDiffItem[] {
  const diffs: CorrectionDiffItem[] = [];

  for (const caption of captions) {
    const orig = caption.originalText?.trim();
    const curr = caption.text?.trim();

    if (!orig || !curr || orig === curr) continue;

    const normOrig = normalizeText(orig);
    const normCurr = normalizeText(curr);

    // If normalized versions are identical, it was just punctuation/whitespace change
    if (normOrig === normCurr) continue;

    // Tokenize both
    const origTokens = tokenize(orig);
    const currTokens = tokenize(curr);

    if (origTokens.length === 0 || currTokens.length === 0) continue;

    // Find common prefix tokens
    let startIdx = 0;
    while (
      startIdx < origTokens.length &&
      startIdx < currTokens.length &&
      origTokens[startIdx] === currTokens[startIdx]
    ) {
      startIdx++;
    }

    // Find common suffix tokens
    let origEnd = origTokens.length - 1;
    let currEnd = currTokens.length - 1;
    while (
      origEnd >= startIdx &&
      currEnd >= startIdx &&
      origTokens[origEnd] === currTokens[currEnd]
    ) {
      origEnd--;
      currEnd--;
    }

    // Extract mismatched tokens
    const diffOrigTokens = origTokens.slice(startIdx, origEnd + 1);
    const diffCurrTokens = currTokens.slice(startIdx, currEnd + 1);

    const originalPhrase = diffOrigTokens.join(' ').trim();
    const correctedPhrase = diffCurrTokens.join(' ').trim();

    // Context windows
    const contextBefore = origTokens.slice(Math.max(0, startIdx - 2), startIdx).join(' ').trim();
    const contextAfter = origTokens.slice(origEnd + 1, origEnd + 3).join(' ').trim();

    // Validation Filters:
    // 1. Min character length >= 2
    if (originalPhrase.length < 2 || correctedPhrase.length < 2) continue;

    // 2. Both cannot be empty
    if (!originalPhrase || !correctedPhrase || originalPhrase === correctedPhrase) continue;

    // 3. Skip single-character additions/deletions (likely typos)
    if (Math.abs(originalPhrase.length - correctedPhrase.length) === 1 && originalPhrase.length < 3) continue;

    diffs.push({
      originalPhrase,
      correctedPhrase,
      contextBefore: contextBefore || undefined,
      contextAfter: contextAfter || undefined,
    });
  }

  return diffs;
}

/**
 * Sends extracted diffs to the server feedback API in the background.
 * Uses keepalive: true so requests complete even if user navigates away.
 */
export async function sendCorrectionFeedback(
  captions: CaptionItem[],
  userId?: string
): Promise<void> {
  try {
    const diffs = extractCorrectionDiffs(captions);
    if (diffs.length === 0) return;

    await fetch('/api/feedback/correction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        diffs,
        userId: userId || null,
      }),
      keepalive: true,
    });
  } catch (err) {
    // Non-blocking background log
    console.warn('[Feedback Engine]: Failed to submit correction diffs:', err);
  }
}
