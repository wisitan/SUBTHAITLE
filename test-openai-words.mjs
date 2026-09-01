import fs from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

execSync('ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -q:a 9 -acodec libmp3lame test_silence.mp3');

async function testOpenAI() {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const formData = new FormData();
  const fileBuffer = fs.readFileSync('test_silence.mp3');
  formData.append('file', new Blob([fileBuffer]), 'test_silence.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiApiKey}` },
    body: formData
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testOpenAI();
