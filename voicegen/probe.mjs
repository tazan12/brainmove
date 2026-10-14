// 모델별 사용 가능 여부 확인(키는 출력하지 않음)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = fs.readFileSync(path.join(ROOT, '_secret', 'gemini_key.txt'), 'utf8').trim();
for (const model of process.argv.slice(2)) {
  const body = model.startsWith('lyria') ? { model, input: 'Instrumental only. short gayageum melody.' } : { model, input: [{ type: 'user_input', content: [{ type: 'text', text: '안녕하세요' }] }], response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: 'Kore' }] } };
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', { method: 'POST', headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text(); console.log(model, r.status, r.ok ? 'OK' : t.replace(/\s+/g, ' ').replace(KEY, '***').slice(0, 900));
}
