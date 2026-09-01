# 🏗️ สถาปัตยกรรมระบบการทำงาน (System Architecture Flow)

แผนภาพแสดงขั้นตอนการทำงานของระบบ SUBTHAITLE ตั้งแต่ผู้ใช้อัปโหลดไฟล์ จนถึงการส่งออกผลลัพธ์ โดยออกแบบเพื่อความรวดเร็ว ประหยัดทรัพยากรเซิร์ฟเวอร์ และรักษาความแม่นยำขั้นสูงสุด

```mermaid
flowchart TD
    %% Define Styles
    classDef user fill:#334155,stroke:#94a3b8,stroke-width:2px,color:#fff
    classDef client fill:#18181b,stroke:#a1a1aa,stroke-width:2px,color:#fff
    classDef server fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    classDef ai fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff
    classDef export fill:#7c2d12,stroke:#f97316,stroke-width:2px,color:#fff

    %% Step 1: User Input
    U(["👤 ผู้ใช้ (User)"]):::user
    UP["อัปโหลดไฟล์วิดีโอ/เสียง (Upload Media)"]:::client
    U --> UP

    %% Step 2: Client Processing
    subgraph Client [💻 การประมวลผลฝั่งผู้ใช้ (Client-Side Edge Processing)]
        EX["สกัดไฟล์เสียง (Audio Extraction)<br>ด้วย FFmpeg.wasm"]:::client
        CHK["แบ่งไฟล์เสียง (Smart Chunking)<br>ซอยไฟล์ย่อยขนาดเล็กเพื่อความรวดเร็ว"]:::client
    end
    UP --> EX
    EX --> CHK

    %% Step 3: Server Middleware
    subgraph Server [☁️ ระบบบริหารจัดการ (Server-Side Middleware)]
        AUTH["ตรวจสอบสิทธิ์และหักเครดิต<br>(Authentication & Quota)"]:::server
    end
    CHK -- "ส่งไฟล์เสียงย่อย (API Request)" --> AUTH

    %% Step 4: AI Pipeline
    subgraph AIPipeline [🤖 กระบวนการประมวลผล AI (AI Pipeline)]
        STT["ระบบแปลงเสียงเป็นข้อความหลัก (Primary STT)<br>Google Cloud STT / Groq Whisper"]:::ai
        CORRECT["ระบบตรวจสอบความแม่นยำ (AI Auto-Correction)<br>Gemini 2.0 Flash (วิเคราะห์เสียงคู่กับข้อความ)"]:::ai
    end
    AUTH --> STT
    STT -- "ข้อความดิบ + Timestamp" --> CORRECT
    AUTH -. "ไฟล์เสียง" .-> CORRECT

    %% Step 5: Post-Processing & Export
    subgraph Output [🎬 การจัดการผลลัพธ์ (Studio & Export)]
        MERGE["ประกอบร่างและปรับแก้ (Merge & Studio UI)<br>ปรับแต่งฟอนต์, สี, จัดวาง (WYSIWYG)"]:::export
        EXP["ส่งออกผลลัพธ์ (Export)<br>ฝังซับวิดีโอ (Hardsub) หรือไฟล์ SRT/VTT"]:::export
    end
    CORRECT -- "ซับไตเติลที่สมบูรณ์" --> MERGE
    MERGE --> EXP
```

---

## 📑 คำอธิบายขั้นตอนการทำงาน (Workflow Description)

ระบบถูกออกแบบให้แบ่งเบาภาระของ Server (Decentralized Processing) และใช้ AI หลายตัวทำงานร่วมกัน (Multi-Agent AI Pipeline) เพื่อประสิทธิภาพสูงสุด ดังนี้:

### 1. การนำเข้าข้อมูล (User Input & Upload)
*   ผู้ใช้ทำการอัปโหลดไฟล์วิดีโอ (MP4, MOV) หรือไฟล์เสียงผ่านหน้าเว็บเบราว์เซอร์
*   กระบวนการนี้ทำงานบนเครื่องของผู้ใช้ (Local) ทำให้ไม่ต้องเสียเวลารออัปโหลดไฟล์ขนาดใหญ่ขึ้นเซิร์ฟเวอร์

### 2. การประมวลผลฝั่งผู้ใช้ (Client-Side Edge Processing)
*   **Audio Extraction:** ระบบใช้ WebAssembly (FFmpeg.wasm) ดึงเฉพาะข้อมูล "เสียง" ออกมาจากวิดีโอ ช่วยลดขนาดข้อมูลที่ต้องส่งผ่านอินเทอร์เน็ตได้มหาศาล
*   **Smart Chunking:** หากวิดีโอมีความยาวเกินกำหนด ระบบจะทำการซอยไฟล์เสียงออกเป็นท่อนย่อยๆ (Chunks) เพื่อให้ส่งคำสั่งไปประมวลผลแบบคู่ขนาน (Parallel Processing) ได้ ซึ่งช่วยหลีกเลี่ยงข้อจำกัดเรื่อง Timeout ของ Server

### 3. ระบบบริหารจัดการส่วนกลาง (Server-Side Middleware)
*   API จะรับไฟล์เสียงย่อยที่ถูกส่งมา ตรวจสอบสิทธิ์การใช้งาน (Authentication) และคำนวณหักเครดิตการใช้งานของผู้ใช้อย่างรัดกุมผ่านฐานข้อมูล (Database)

### 4. กระบวนการประมวลผล AI (AI Pipeline)
ระบบใช้ AI 2 ขั้นตอนเพื่อความแม่นยำสูงสุด:
*   **Primary STT:** ส่งเสียงให้ Google Cloud STT หรือ Groq ถอดคำพูดและกำหนดเวลา (Timestamp) ของแต่ละคำ
*   **AI Auto-Correction (Multimodal):** ส่งข้อความที่ได้กลับไปพร้อมกับ "ไฟล์เสียงจริง" ให้ Gemini 2.0 Flash ตรวจสอบอีกครั้ง เพื่อแก้ไขคำพ้องเสียง, ศัพท์เฉพาะ, หรือการสะกดผิดให้ถูกต้องตามบริบท (Contextual Correction)

### 5. การจัดการผลลัพธ์และส่งออก (Studio & Export)
*   ข้อมูลซับไตเติลที่ผ่านการตรวจสอบแล้ว จะถูกส่งกลับมายังหน้าต่าง Studio (Client-side)
*   ผู้ใช้สามารถปรับแต่งความสวยงาม (ฟอนต์, สี, TikTok Safe Zone) ได้แบบ Real-time (WYSIWYG)
*   เมื่อกดส่งออก ระบบจะทำการฝังซับไตเติลลงวิดีโอ (Hardsub) ด้วยคอมพิวเตอร์ของผู้ใช้เอง หรือเลือกดาวน์โหลดเป็นไฟล์ข้อความ (SRT, VTT) เพื่อนำไปใช้งานต่อได้ทันที
