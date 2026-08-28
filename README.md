# 🎬 SUBTHAITLE — AI Thai Caption & Subtitle Studio

> **เว็บแอปพลิเคชันสำหรับถอดเสียงภาษาไทยอัตโนมัติ (AI Transcription) และสตูดิโอปรับแต่งซับไตเติล (WYSIWYG 100%) พร้อมไฮไลท์คำพูดทีละคำ (Karaoke Word Highlight) และเบิร์นวิดีโอ MP4 ในตัว**

![SUBTHAITLE Banner](/logo.png)

---

## ✨ ไฮไลท์ฟีเจอร์เด่น (Key Features)

- 🎙️ **AI ถอดเสียงภาษาไทยความแม่นยำสูง:** ขับเคลื่อนด้วย OpenAI `whisper-large-v3` ผ่าน Groq LPU ความเร็วสูง (เสร็จใน 2-4 วินาที)
- 🔤 **ระบบตัดคำและเว้นวรรคภาษาไทย:** ทำงานร่วมกับ `pythainlp` และ Custom Dictionary ตรวจจับคำทับศัพท์และเว้นวรรคถูกต้องตามธรรมชาติ
- 🎨 **สตูดิโอปรับแต่งสไตล์ (CapCut Aesthetic):** ปรับฟอนต์ (รองรับทั้ง Google Fonts ยอดนิยม และ Upload Custom Fonts), สี, กรอบพื้นหลัง, เงา, Outline และตำแหน่งซับ
- ✨ **Word Highlight (Karaoke Subtitle):** แสดงสีไฮไลต์คำที่กำลังพูดแบบ Real-time ตามความยาวเสียงพูดจริง
- 🔥 **Burn Subtitle → MP4 (100% WYSIWYG):** เรนเดอร์ซับไตเติลและฝังลงในวิดีโอ MP4 โดยตรงบนเบราว์เซอร์ด้วย `@ffmpeg/ffmpeg` และ HTML5 Canvas Subtitle Engine (ค่าใช้จ่าย ฿0)
- 📦 **Export หลากหลายฟอร์แมต:**
  - `.srt` (SubRip Subtitle มาตรฐาน)
  - `.fcpxml` (Final Cut Pro XML Version 1.10 พร้อมสไตล์ฟอนต์และตำแหน่ง)
  - `.xml` (Premiere Pro / DaVinci Resolve)
  - `.mp4` (วิดีโอฝังซับไตเติลสำเร็จรูป)
- 💻 **รองรับ Local Whisper (Offline Mode 100%):** สำหรับผู้ใช้ Mac (Apple Silicon) และ Windows PC (NVIDIA GPU) ถอดเสียงในเครื่องตนเอง ปลอดภัย ข้อมูลไม่หลุดออกนอกเครื่อง และไม่จำกัดขนาดคลิป

---

## 🛠️ สถาปัตยกรรม & เทคโนโลยี (Tech Stack)

| Layer | เทคโนโลยี |
|---|---|
| **Frontend** | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS 3.4, Lucide React, Radix UI Primitives |
| **State Management** | Zustand (Persistent State + LocalStorage) |
| **Client Audio / Video Engine** | `@ffmpeg/ffmpeg` (WebAssembly), HTML5 Canvas 2D Engine |
| **AI Transcription (Cloud)** | Groq API (`whisper-large-v3` verbose_json) |
| **AI Transcription (Local)** | FastAPI + `mlx-whisper` (Mac) / `faster-whisper` (Windows) |
| **Deployment** | Vercel Serverless Platform |

---

## 🚀 เริ่มต้นใช้งานบนเครื่อง (Local Development)

### 1. ติดตั้ง Dependencies
```bash
cd web
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` ภายในโฟลเดอร์ `web/`:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. รัน Dev Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

### 4. Build สำหรับ Production
```bash
npm run build
npm run start
```

---

## 💻 วิธีเปิดใช้งาน Local Whisper Server (Offline AI)

### สำหรับ macOS (Apple Silicon M1/M2/M3/M4):
```bash
cd local-server
./start_server.command
```

### สำหรับ Windows (PC / NVIDIA GPU):
```cmd
cd local-server
start_server.bat
```
เมื่อเซิร์ฟเวอร์เริ่มทำงานบน `http://localhost:8765` หน้าเว็บบนเบราว์เซอร์จะขึ้นไฟเขียว `🟢 Online` อัตโนมัติ

---

## 📄 ลิขสิทธิ์และการพัฒนา

- พัฒนาขึ้นเพื่อสนับสนุน Content Creator, Podcaster, และ Editor ชาวไทย 🇹🇭
- ร่วมสร้างสรรค์โดย **พี่เอ & น้อง Sunday (AI Pair Programmer)**
