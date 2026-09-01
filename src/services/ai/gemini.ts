import {
  TranscribedWord,
  SubtitleSegment,
  computeSyllableWeightedWords,
  alignCorrectedWords,
} from './alignment';

// Valid Gemini production models (Google AI Studio)
const GEMINI_CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

/**
 * 🧠 Direct Gemini Multimodal Transcription Engine with Syllable-Weighted Acoustic Alignment
 */
export async function transcribeWithGeminiDirect(
  audioBase64: string,
  language: string = 'th',
  extraRulesText: string = ''
): Promise<{ text: string; words: TranscribedWord[]; segments: SubtitleSegment[]; duration: number } | null> {
  const geminiApiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ''
  ).trim();

  if (!geminiApiKey) return null;

  const systemPrompt = `You are the world's most accurate Thai speech transcription and subtitle segmentation engine for video content (Shorts, TikTok, YouTube Reviews).

TASK:
Listen carefully to the audio file and transcribe the exact spoken Thai speech with natural conversational phrasing, 100% correct Thai spelling, and accurate English loanwords/brands/slang (e.g. Type-C, USB-C, Power Bank, Fast Charge, iPhone, iPad, Adapter, 60W, 100W, Vibe Coding, Affiliate, Kimiso).

CRITICAL PHONETIC & ANTI-HALLUCINATION RULES:
1. STRICTLY PREFER NATIVE THAI VOCABULARY OVER ENGLISH:
   - When the speaker is speaking native Thai words, NEVER hallucinate or phonetically convert them into random English words.
   - Example: "ก็รองรับ" / "รองรับหัว" / "หัวต่อ" / "หลายแบบ" is 100% Thai ("ก็รองรับหัวได้หลายแบบ"), DO NOT transcribe as "android" or "upload" or "download" or "macbook"!
   - Example: "มีทั้งแบบ", "ดึงออกมา", "เสียบใช้งาน", "ปรับได้" are pure Thai phrases.
2. English is ONLY for real tech standards and brands: "Type-C", "USB-C", "USB-A", "Lightning", "60W", "100W", "Fast Charge", "Kimiso", "iPhone", "iPad", "Power Bank", "Adapter".
3. Divide into natural, rhythmic subtitle segments (3 to 7 words per segment, 1.5 - 3.5 seconds each).
4. Provide estimated start and end timestamps in seconds for each segment.${extraRulesText}

STRICT JSON OUTPUT SCHEMA:
{
  "text": "Full transcribed text...",
  "duration": 47.2,
  "segments": [
    {
      "start": 0.0,
      "end": 3.2,
      "text": "สายชาร์จแบบ 90 องศาที่เอาไว้",
      "words": ["สายชาร์จ", "แบบ", "90", "องศา", "ที่เอาไว้"]
    }
  ]
}`;

  for (const model of GEMINI_CANDIDATE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inline_data: {
                      mime_type: 'audio/mp3',
                      data: audioBase64,
                    },
                  },
                  {
                    text: `Please transcribe this audio clip into timed Thai subtitle segments and words (${language === 'en' ? 'English' : 'Thai'}).`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.0,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (contentText) {
          const parsed = JSON.parse(contentText);
          const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
          const finalSegments: SubtitleSegment[] = [];
          const allWords: TranscribedWord[] = [];

          if (rawSegments.length > 0) {
            for (const seg of rawSegments) {
              const segStart = typeof seg.start === 'number' ? seg.start : parseFloat(String(seg.start)) || 0;
              const segEnd = typeof seg.end === 'number' ? seg.end : parseFloat(String(seg.end)) || segStart + 2.0;
              const segText = String(seg.text || '').trim();
              const rawWords = Array.isArray(seg.words) && seg.words.length > 0 ? seg.words : segText.split(' ').filter(Boolean);

              const segWords = computeSyllableWeightedWords(segText, segStart, segEnd, rawWords);
              allWords.push(...segWords);

              finalSegments.push({
                start: segStart,
                end: segEnd,
                text: segText,
                words: segWords,
              });
            }
          } else if (Array.isArray(parsed.words) && parsed.words.length > 0) {
            for (let i = 0; i < parsed.words.length; i++) {
              const w = parsed.words[i];
              const wordStr = typeof w === 'string' ? w : String(w.word || '');
              allWords.push({
                word: wordStr,
                start: typeof w.start === 'number' ? w.start : parseFloat(String(w.start)) || 0,
                end: typeof w.end === 'number' ? w.end : parseFloat(String(w.end)) || 0,
                confidence: 0.98,
              });
            }
          }

          const fullText = parsed.text || finalSegments.map((s) => s.text).join(' ') || allWords.map((w) => w.word).join(' ');
          const duration = parsed.duration || (allWords.length > 0 ? allWords[allWords.length - 1].end : 0);

          return {
            text: fullText,
            words: allWords,
            segments: finalSegments,
            duration,
          };
        }
      }
    } catch (err) {
      console.warn(`[Gemini Direct Transcribe] Model ${model} failed or timed out:`, err);
    }
  }

  return null;
}

/**
 * 🧠 AI Auto-Correction (Post-Processing Engine)
 * Uses Google Gemini with Multimodal Audio Verification and Fallback to OpenAI (gpt-4o-mini)
 */
export async function correctThaiWordsWithLLM(
  words: TranscribedWord[],
  rawText: string,
  extraRulesText: string = '',
  audioBase64?: string
): Promise<{ words: TranscribedWord[]; text: string }> {
  if (words.length === 0) {
    return { words, text: rawText };
  }

  const wordStringsInput = words.map((w) => w.word);

  const systemPrompt = `You are the world's most accurate Thai speech subtitle correction engine, specialized in video content (Shorts, TikTok, YouTube Reviews, Tech Gadgets, Cooking, Lifestyle).

TASK: You are provided with the audio file, the raw transcript, and word-level tokens from speech recognition. Listen directly to the audio to verify and fix phonetic errors, sound-alikes, garbled English loanwords, and Thai-specific mistakes using full audio + text context.

CORRECTION RULES (organized by category):

【CONNECTORS & CABLES】
- "วิธีใช้ สี" / "วิธีใช้สี" / "วิธี ซี" / "วิทีซี" / "ไทป์สี" / "ไทบซี" / "ไทป์ ซี" → "Type-C"
- "usb แอมป์" / "usb แอม" / "ยูเอสบี แอมป์" / "ยูเอสบีเอ" → "USB-A"
- "ยูเอสบี ซี" / "usb ซี" / "ยูเอสบี ไทป์ซี" → "USB-C"
- "ไมโคร ยูเอสบี" / "ไมโคร usb" → "Micro USB"
- "ไลท์นิ่ง" / "ไลนิ่ง" / "ไลท์นิง" → "Lightning"

【CHARGING & POWER】
- "ชาชาติ" / "ชาจ" / "ชาร์ท" / "ชาช" → "ชาร์จ"
- "สาย" + (ชาชาติ/ชาจ/ชาร์ท) → "สายชาร์จ"
- "หัว" + (ชาชาติ/ชาจ/ชาร์ท) → "หัวชาร์จ"
- "ฟาสชาร์จ" / "ฟาสต์ชาร์ต" / "ฟาสชาจ" → "Fast Charge"
- "พาวเวอร์แบง" / "พาเวอร์แบงค์" / "เพาเวอร์แบงค์" → "Power Bank"
- "หกสิบ ดับเบิลยู" → "60W", "ร้อย ดับเบิลยู" → "100W"
- "แอมแปร์" / "แอมป์แปร์" → "แอมป์"

【THAI PHONETIC PATTERNS】
- Reduplication: "ดีดี" → "ดีๆ", "เร็วเร็ว" → "เร็วๆ", "มากมาก" → "มากๆ", "จริงจริง" → "จริงๆ", "ค่อยค่อย" → "ค่อยๆ", "ช้าช้า" → "ช้าๆ"
- Colloquial: "ตัวเนีย" / "ตัวเนี้ย" → "ตัวนี้", "งี้" → "นี้", "เนี่ย" → "นี่", "ป่ะ" → "ไหม"
- Particles: "น่ะ" → "นะ", "จ้า" → "จ้ะ", "คร้าบ" → "ครับ", "ค่า" → "ค่ะ"
- Sound-alikes: "สักเช่นนึง" → "สักเส้นนึง", "ปะกัน" → "ประกัน"

【BRANDS & PLATFORMS】
- Fix known brand misspellings contextually (Samsung, iPhone, iPad, AirPods, Shopee, Lazada, etc.)${extraRulesText}

STRICT OUTPUT FORMAT:
Return JSON only: {"words": ["word1", "word2", ...], "text": "Full corrected sentence"}
The "words" array represents the corrected words in chronological order. You MAY merge or split tokens if the correction requires it.

FEW-SHOT EXAMPLES:
Input: ["ตัวนี้", "เป็น", "สาย", "ชาชาติ", "วิธีใช้", "สี", "ชาร์จ", "เร็ว", "หกสิบ", "วัตต์"]
Output: {"words": ["ตัวนี้", "เป็น", "สายชาร์จ", "Type-C", "ชาร์จเร็ว", "60W"], "text": "ตัวนี้เป็นสายชาร์จ Type-C ชาร์จเร็ว 60W"}

Input: ["มี", "ทั้ง", "แบบ", "usb", "แอมป์", "ธรรมดา", "ดึง", "ออก", "มา", "ก็", "สามารถ"]
Output: {"words": ["มี", "ทั้ง", "แบบ", "USB-A", "ธรรมดา", "ดึง", "ออก", "มา", "ก็", "สามารถ"], "text": "มีทั้งแบบ USB-A ธรรมดา ดึงออกมาก็สามารถ"}`;

  const userMessage = `Full Transcript Context:\n"${rawText}"\n\nOriginal Words Array:\n${JSON.stringify(wordStringsInput)}`;

  // 1. Google Gemini API
  const geminiApiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ''
  ).trim();

  if (geminiApiKey) {
    const userParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    if (audioBase64) {
      userParts.push({
        inline_data: {
          mime_type: 'audio/mp3',
          data: audioBase64,
        },
      });
    }
    userParts.push({ text: userMessage });

    for (const model of GEMINI_CANDIDATE_MODELS) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: userParts }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawWordsList = parsed.words;
            if (Array.isArray(rawWordsList) && rawWordsList.length > 0) {
              const mergedWords = alignCorrectedWords(words, rawWordsList);
              return {
                words: mergedWords,
                text: parsed.text || mergedWords.map((w) => w.word).join(' '),
              };
            }
          }
        }
      } catch (err) {
        console.warn(`[Gemini Correction Fallback]: Model ${model} failed, skipping...`, err);
      }
    }
  }

  // 2. OpenAI GPT-4o-mini Fallback
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (openAiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const rawWordsList = parsed.words;
          if (Array.isArray(rawWordsList) && rawWordsList.length > 0) {
            const mergedWords = alignCorrectedWords(words, rawWordsList);
            return {
              words: mergedWords,
              text: parsed.text || mergedWords.map((w) => w.word).join(' '),
            };
          }
        }
      }
    } catch (err) {
      console.warn('[Auto-Correction OpenAI Fallback Exception]:', err);
    }
  }

  return { words, text: rawText };
}
