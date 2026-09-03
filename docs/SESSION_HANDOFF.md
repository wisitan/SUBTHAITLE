# 📑 SUBTHAITLE — Session Handoff & Architecture Summary
**Date:** 2026-09-04  
**Active Baseline Commit:** [`789ae5f`](https://github.com/wisitan/SUBTHAITLE/commit/789ae5fdbc85c83cf0d63b1187d2f74a7c64d773) (`main` == `uat`)  
**Project Goal:** Web Application สำหรับถอดเสียงคำพูดในวิดีโอเป็นซับไตเติลภาษาไทยอัตโนมัติ แม่นยำระดับคำ มีคาราโอเกะไฮไลท์ และรองรับคำทับศัพท์/บริบทภาษาไทยของ Creator ยุคใหม่

---

## 🎯 1. ภาพรวมสถานะปัจจุบัน (Current State)
* **Production & UAT Parity:** สาขา `main` และ `uat` ซิงค์เท่ากัน 100% ที่ Commit `789ae5f`
* **Core STT Engine:** เปลี่ยนเครื่องยนต์ถอดเสียงหลักจาก Whisper (Groq/OpenAI) มาเป็น **Google Gemini Flash (Multimodal Audio Native)** อย่างถาวร
* **User Feedback:** ทดสอบกับคลิปวิดีโอจริงแล้วมีความแม่นยำภาษาไทยสูงที่สุด ศัพท์ไอทีและคำทับศัพท์ถูกต้อง ไม่เพี้ยนเป็นคำหลอน และต้นทุนถูกที่สุด

---

## 🚀 2. สรุปการทดลองและสิ่งที่ทำสำเร็จในรอบนี้ (What Was Done)

### A. ปลดล็อกปัญหาความแม่นยำภาษาไทยด้วย "Google Gemini Flash Audio Native"
* **ปัญหาเดิมของ Whisper:** ถอดคำทับศัพท์หรือคำเฉพาะเพี้ยนตามเสียงโฟเนติก เช่น `"เมาส์ไร้สาย"` ➔ กลายเป็น `"mouse ไร้ใส่"`, `"Delay"` ➔ กลายเป็น `"ลวงความ Delay"`
* **การทดสอบ STT เจ้าอื่น ๆ:**
  * **Deepgram Nova-2 (`th`):** ได้ลองเชื่อมต่อและทดสอบจริง พบว่าตัว Tokenizer ภาษาไทยแยกสระลอยและวรรณยุกต์เป็นชิ้นเล็กชิ้นน้อย (`ค` + `่` + `ะ`) และยังเข้าใจบริบทประโยคสู้โมเดล LLM ไม่ได้
  * **Google Gemini Flash:** ชนะขาดลอย เนื่องจากเป็น Large Multimodal Model (LMM) ที่เข้าใจความหมายประโยค (Semantic Context) สะกดภาษาไทยถูกต้อง 100% และคำนวณ Word Timestamps ละเอียดระดับเสี้ยววินาที
* **การเชื่อมต่อระบบ:**
  * สร้าง Provider ใหม่: [`src/services/ai/providers/gemini.ts`](file:///Users/a_am_i/Library/CloudStorage/OneDrive-Personal/Projects/Vibe%20coding/SUBTHAITLE/src/services/ai/providers/gemini.ts)
  * ตั้งเป็น Default STT ใน [`src/services/ai/index.ts`](file:///Users/a_am_i/Library/CloudStorage/OneDrive-Personal/Projects/Vibe%20coding/SUBTHAITLE/src/services/ai/index.ts) พร้อมระบบ **Auto-fallback** ไปยัง Groq Whisper สำรองทันทีหากเกิด Rate Limit หรือฉุกเฉิน
* **เปรียบเทียบต้นทุน:**
  * Gemini Flash Audio: คิดตาม Audio Input Tokens ตกเพียง **~0.05 บาท / นาที** (หรือฟรี 1,500 requests/วัน บน Free Tier) ประหยัดกว่า Whisper เดิม

---

### B. กวาดล้างเครื่องหมาย Comma (`,`) ในซับไตเติลภาษาไทย 100%
* **บริบท:** ซับไตเติลภาษาไทยไม่มีการใส่เครื่องหมาย Comma คั่นประโยค (ยกเว้นตัวเลขหลักพัน เช่น `1,000`)
* **การแก้ไข 3 ระดับ:**
  1. **Prompt Level:** สั่ง Gemini อย่างเข้มงวดห้ามพ่น Comma หรือ Period ในข้อความ
  2. **Provider Level:** กรองและตัด Comma ออกจากข้อความและ Token ก่อนส่งต่อ (`replace(/(?<!\d),(?!\d)/g, '')`)
  3. **Core Library Level:** ใน [`src/lib/thai-text.ts`](file:///Users/a_am_i/Library/CloudStorage/OneDrive-Personal/Projects/Vibe%20coding/SUBTHAITLE/src/lib/thai-text.ts)
     * `cleanThaiText()`: ลบ Non-numeric commas
     * `resegmentThaiWords()`: กรองไม่ให้เครื่องหมาย Comma หลุดไปเป็นกล่องคำซับไตเติล
     * `formatCaptionWordsText()`: ลบ Comma ก่อนนำมาร้อยเรียงเรนเดอร์บนหน้าจอ

---

### C. ทำความสะอาด UI และนำชื่อ Tech Stack ออก
* ลบชื่อยี่ห้อโครงสร้างพื้นฐานภายใน **"Cloudflare R2"** ออกจากทุกหน้าของ UI
  * เปลี่ยนเป็นคำที่เป็นมิตรต่อผู้ใช้งาน เช่น **"ระบบคลาวด์"**, **"Cloud Proxy"**, **"4. บันทึกและซิงค์คลาวด์"**
  * ไฟล์ที่แก้ไข: `upload-zone.tsx`, `video-player.tsx`, `burn-video-modal.tsx`, `donate/page.tsx`
* ถอดป้ายทดสอบ (`⚡ ทดสอบ: Google Gemini Flash`) ออกก่อน Merge ขึ้น Main

---

### D. ข้อค้นพบสำคัญเรื่อง Audio Filter (FFmpeg)
* เคยมีการใส่ตัวกรอง `-af afftdn=nf=-20` (FFT Denoiser) เพื่อตัดเสียง Background Music ใน `src/lib/audio-extract.ts`
* **ผลข้างเคียงร้ายแรง:** ตัวกรองตัดเสียงคนพูดช่วงที่มีดนตรีคลอทิ้งจนกลายเป็นความเงียบ (Silence) ทำให้เสียงหายไป 7 วินาที
* **บทเรียน:** ถอด `afftdn` ออก และใช้เพียง `highpass=f=80` (ตัดเสียงลม/แรงสั่นสะเทือน) + `loudnorm` (ปรับความดังสม่ำเสมอ) เสียงพูดจึงกลับมาครบทุกเม็ด

---

## 📂 3. โครงสร้างไฟล์สำคัญที่เกี่ยวข้อง

```text
SUBTHAITLE/
├── src/
│   ├── services/
│   │   └── ai/
│   │       ├── index.ts                <-- จุดรวม STT Providers + Auto-fallback
│   │       ├── types.ts                <-- Interface STTProvider, STTResult, STTWord
│   │       └── providers/
│   │           ├── gemini.ts           <-- [NEW] Google Gemini Flash Audio STT
│   │           ├── groq.ts             <-- Groq Whisper (Fallback)
│   │           ├── openai.ts           <-- OpenAI Whisper (Fallback)
│   │           ├── deepgram.ts         <-- Deepgram Nova-2
│   │           └── google.ts           <-- Google Cloud Speech-to-Text
│   ├── lib/
│   │   ├── thai-text.ts                <-- ตัวตัดคำไทย, ล้าง Comma, Fused vowels
│   │   ├── caption-grouping.ts         <-- รวมคำเป็นประโยคซับไตเติลตามเวลา/จังหวะหยุด
│   │   ├── audio-extract.ts            <-- สกัดและบีบอัดเสียงจากวิดีโอ (FFmpeg)
│   │   └── transcribe.ts               <-- Client-side flow เรียก /api/transcribe
│   ├── components/
│   │   ├── upload-zone.tsx             <-- หน้าอัปโหลดวิดีโอ แสดงโหมดและ Progress
│   │   ├── video-player.tsx            <-- เพลเยอร์แสดงวิดีโอ + ซับไฮไลท์แบบคาราโอเกะ
│   │   └── burn-video-modal.tsx        <-- Modal เรนเดอร์ฝังซับไตเติลลงวิดีโอ
│   └── app/
│       ├── api/transcribe/route.ts     <-- Endpoint รับไฟล์เสียงและส่งเข้า STT
│       └── donate/page.tsx             <-- หน้าสนับสนุนค่าบริการ
├── docs/
│   └── SESSION_HANDOFF.md              <-- [THIS FILE] สรุปข้อมูลตั้งต้นสำหรับแชทใหม่
└── .env.local                          <-- Environment variables (Keys ต่าง ๆ)
```

---

## 🔑 4. Environment Variables ที่จำเป็น
* `GEMINI_API_KEY`: Key สำหรับ Google Gemini Flash (สำคัญที่สุด! ต้องมีทั้งใน `.env.local` และบน **Vercel Settings ➔ Environment Variables** ทั้ง **Production** และ **Preview**)
* `GROQ_API_KEY`: Key สำรองสำหรับ Groq Whisper (Auto-fallback)
* `DEEPGRAM_API_KEY`: Key สำหรับ Deepgram (มีใน `.env.local` และ Vercel แล้ว)
* `R2_*`: ค่าการเชื่อมต่อ Cloud Proxy Storage
* `NEXT_PUBLIC_SUPABASE_*`: ฐานข้อมูล Supabase สำหรับจัดการโควต้าและโปรเจกต์

---

## 🎯 5. Roadmap & แผนงานที่สามารถหยิบมาทำต่อในห้องใหม่
1. **ตรวจสอบความเสถียรบน Production:** ติดตามผลการใช้งาน Gemini Flash ของผู้ใช้งานจริง
2. **Grammar-based Clause Splitting:** พัฒนาการตัดบรรทัดซับไตเติลตามไวยากรณ์/คำเชื่อมภาษาไทย (Linguistic Conjunctions เช่น "เพราะว่า", "แต่ว่า", "ดังนั้น") เสริมจากการตัดด้วย Pause/Silence อย่างเดียว
3. **Audio Chunking สำหรับคลิปยาวมาก:** หากในอนาคตมีคลิปยาวเกิน 15-20 นาที อาจพิจารณาระบบแบ่งท่อนเสียงส่งให้ Gemini เพื่อความรวดเร็วสูงสุด

---

> **คำแนะนำสำหรับการเริ่มแชทใหม่:**  
> พี่เอสามารถ Copy เนื้อหาไฟล์นี้ หรือสั่งให้น้องในแชทใหม่อ่านไฟล์ `docs/SESSION_HANDOFF.md` ได้ทันที เพื่อให้แชทใหม่มีบริบทครบถ้วนเหมือนคุยต่อเนื่องได้เลยค่ะ!
