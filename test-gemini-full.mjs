import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  console.log('Using Gemini Key:', geminiApiKey.slice(0, 10) + '...');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'สวัสดีครับ ทดสอบ' }] }]
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data));
}
test();
