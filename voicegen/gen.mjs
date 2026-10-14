// 브레인무브 음성·음악 녹음기 (사용자 PC에서 실행)
//   node gen.mjs test   → 캐릭터마다 1문장씩 시험 녹음
//   node gen.mjs voice  → 전체 대사 녹음(이미 있는 파일은 건너뜀, 중단돼도 다시 실행하면 이어서)
//   node gen.mjs music  → 테마 배경음악 작곡(Lyria)
// API 키는 _secret\gemini_key.txt 또는 환경변수 GEMINI_API_KEY 에서 읽음(화면에 출력하지 않음)
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEYFILE = path.join(ROOT, '_secret', 'gemini_key.txt');
const KEY = (process.env.GEMINI_API_KEY || (fs.existsSync(KEYFILE) ? fs.readFileSync(KEYFILE, 'utf8') : '')).trim();
if (!KEY) { console.log('NO_KEY'); process.exit(2); }
const API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'voicegen', 'manifest.json'), 'utf8'));
const LOG = path.join(ROOT, 'voicegen', 'gen.log');
const log = (...a) => { const s = new Date().toTimeString().slice(0, 8) + ' ' + a.join(' '); console.log(s); fs.appendFileSync(LOG, s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 읽기 어려운 기호를 말로
const speakable = t => t.replace(/1 → 2 → 3/g, '일, 이, 삼').replace(/→/g, ', ').replace(/만세\(O\)/g, '만세, 오').replace(/OX/g, '오엑스').replace(/X 자/g, '엑스 자').replace(/1P/g, '일 피').replace(/2P/g, '이 피');
async function call(body) {
  for (let attempt = 0; attempt < 8; attempt++) {
    let r; try { r = await fetch(API, { method: 'POST', headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { log('network', e.message); await sleep(5000 * (attempt + 1)); continue; }
    if (r.ok) return r.json();
    const txt = await r.text();
    if (r.status === 429 || r.status >= 500) {
      const m = txt.match(/retry in ([\d.]+)s|"retryDelay":\s*"(\d+)s"/); const wait = m ? (parseFloat(m[1] || m[2]) + 2) * 1000 : 20000 * (attempt + 1);
      if (/per day|PerDay|daily/i.test(txt)) { log('DAILY_LIMIT', r.status); return { dailyLimit: true }; }
      log('wait', r.status, Math.round(wait / 1000) + 's'); await sleep(wait); continue;
    }
    throw new Error(r.status + ' ' + txt.slice(0, 400));
  }
  throw new Error('too many retries');
}
const audioOf = j => { const outs = (j.steps || []).filter(s => s.type === 'model_output').flatMap(s => s.content || []).filter(c => c.type === 'audio'); const a = outs[outs.length - 1] || (j.output_audio) || null; return a && a.data ? a : null; };
function toMp3(src, dst, voice) {
  const af = voice ? 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,loudnorm=I=-16:TP=-1.5:LRA=11' : 'loudnorm=I=-18:TP=-1.5:LRA=11';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af', af, '-ac', voice ? '1' : '2', '-ar', voice ? '24000' : '44100', '-b:a', voice ? '64k' : '160k', dst]);
}
async function tts(it) {
  const dir = path.join(ROOT, 'assets', 'voice', it.persona); fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, it.key + '.mp3'); if (fs.existsSync(out)) return 'skip';
  const j = await call({ model: MAN.model, input: [{ type: 'user_input', content: [{ type: 'text', text: speakable(it.text), annotations: [{ type: 'speech_metadata', style: it.style }] }] }], response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: it.voice }] } });
  if (j.dailyLimit) return 'daily';
  const a = audioOf(j); if (!a) throw new Error('no audio: ' + JSON.stringify(j).slice(0, 300));
  const tmp = path.join(dir, it.key + '.wav'); fs.writeFileSync(tmp, Buffer.from(a.data, 'base64')); toMp3(tmp, out, true); fs.unlinkSync(tmp); return 'ok';
}
const MUSIC = [
  { id: 'title', model: 'lyria-3.5', prompt: 'Instrumental only, no vocals. Warm and welcoming Korean fusion theme for a cozy night-time rainbow village game title screen. Gayageum and daegeum melody over soft modern pop drums and bass, gentle festive feeling, 98 BPM, about 90 seconds, seamless loop-friendly ending.' },
  { id: 'game', model: 'lyria-3.5', prompt: 'Instrumental only, no vocals. Fun, bouncy and energetic Korean game music for older adults playing a motion game: K-pop groove fused with samulnori percussion (janggu, buk, kkwaenggwari), bright gayageum riffs, steady clear beat for moving to, 116 BPM, cheerful and motivating, about 2 minutes, loop-friendly.' },
  { id: 'dance', model: 'lyria-3.5', prompt: 'Instrumental only, no vocals. Exciting Korean trot dance party (ppongjjak rhythm) for a village festival dance stage: punchy brass, accordion, synth bass, handclaps, hyped and joyful, 124 BPM, easy strong beat for dancing, about 2 minutes, loop-friendly.' },
  { id: 'warmup', model: 'lyria-3.5', prompt: 'Instrumental only, no vocals. Bright morning stretching and warm-up music in a Korean folk-pop style: light janggu rhythm, haegeum and piano, fresh and encouraging, steady 94 BPM, about 90 seconds, loop-friendly.' },
  { id: 'cooldown', model: 'lyria-3.5', prompt: 'Instrumental only, no vocals. Calm sunset cool-down and deep breathing music: slow gayageum and daegeum with soft pads, peaceful and warm, 66 BPM, about 90 seconds, loop-friendly.' },
  { id: 'fanfare', model: 'lyria-3-clip-preview', prompt: 'Instrumental only, no vocals. Triumphant Korean festival victory fanfare with brass, kkwaenggwari and drums, celebratory and proud, short and joyful.' }
];
async function music() {
  const dir = path.join(ROOT, 'assets', 'music'); fs.mkdirSync(dir, { recursive: true });
  for (const m of MUSIC) {
    const out = path.join(dir, m.id + '.mp3'); if (fs.existsSync(out)) { log('music skip', m.id); continue; }
    try {
      const j = await call({ model: m.model, input: m.prompt });
      const a = audioOf(j); if (!a) throw new Error('no audio: ' + JSON.stringify(j).slice(0, 300));
      const ext = /wav/.test(a.mime_type || '') ? '.wav' : '.raw.mp3'; const tmp = path.join(dir, m.id + ext);
      fs.writeFileSync(tmp, Buffer.from(a.data, 'base64')); toMp3(tmp, out, false); fs.unlinkSync(tmp); log('music ok', m.id);
    } catch (e) { log('music FAIL', m.id, e.message); }
  }
}
const mode = process.argv[2] || 'test';
if (mode === 'music') await music();
else {
  let list = MAN.items;
  if (mode === 'test') { const pick = {}; list = list.filter(i => i.kind === 'line' && !pick[i.persona] && (pick[i.persona] = true)); }
  let ok = 0, skip = 0, fail = 0; const conc = mode === 'test' ? 1 : 3; let idx = 0, stop = false;
  log('start', mode, list.length, 'items');
  await Promise.all(Array.from({ length: conc }, async () => {
    while (!stop && idx < list.length) { const it = list[idx++];
      try { const r = await tts(it); if (r === 'daily') { stop = true; break; } r === 'ok' ? ok++ : skip++; if (r === 'ok' && (ok % 10 === 0 || mode === 'test')) log('progress', ok + skip + '/' + list.length, it.persona, it.text.slice(0, 30)); }
      catch (e) { fail++; log('FAIL', it.persona, it.key, e.message); if (/40[13]|API key|PERMISSION/i.test(e.message)) { stop = true; } }
    }
  }));
  // 녹음된 파일 목록(게임이 읽음)
  const have = {}; for (const p of ['basic', 'trot', 'sageuk', 'caster', 'kid']) { const d = path.join(ROOT, 'assets', 'voice', p); have[p] = fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)) : []; }
  fs.writeFileSync(path.join(ROOT, 'assets', 'voice', 'index.js'), 'window.VOICE_CLIPS=' + JSON.stringify(have) + ';');
  log('done', mode, 'ok', ok, 'skip', skip, 'fail', fail, stop ? '(stopped: limit or key problem)' : '');
}
