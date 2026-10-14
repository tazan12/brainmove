// 음악 묶음(brainmove_music_pack.bin)을 곡별 mp3로 풀고 게임용으로 다듬음
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const [src, outDir] = process.argv.slice(2);
const b = fs.readFileSync(src); if (b.toString('latin1', 0, 4) !== 'BMPK') throw new Error('bad pack');
const hl = b.readUInt32LE(4), idx = JSON.parse(b.toString('utf8', 8, 8 + hl)), base = 8 + hl;
fs.mkdirSync(outDir, { recursive: true });
for (const [name, [off, len]] of Object.entries(idx)) {
  const raw = path.join(outDir, '_' + name + '.raw.mp3'); fs.writeFileSync(raw, b.subarray(base + off, base + off + len));
  const af = name === 'fanfare' ? 'afade=t=out:st=11.5:d=2.5,loudnorm=I=-16:TP=-1.5' : 'loudnorm=I=-18:TP=-1.5:LRA=11';
  const args = ['-y', '-loglevel', 'error', '-i', raw]; if (name === 'fanfare') args.push('-t', '14');
  execFileSync('ffmpeg', [...args, '-af', af, '-ar', '44100', '-b:a', '160k', path.join(outDir, name + '.mp3')]);
  fs.unlinkSync(raw); console.log('ok', name, fs.statSync(path.join(outDir, name + '.mp3')).size);
}
