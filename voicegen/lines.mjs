// 게임에서 말하는 모든 문장을 캐릭터별로 펼쳐서 manifest.json 으로 저장 (PC에서 Gemini TTS로 녹음할 목록)
import fs from 'fs';
const S = '/home/claude/brainmove/src/';
const nar = fs.readFileSync(S + 'narrator.js', 'utf8');
const PERSONAS = eval('(' + nar.slice(nar.indexOf('const PERSONAS = ') + 17, nar.indexOf('/* 음성마다 깨지지 않는')).trim().replace(/;$/, '') + ')');
const games = fs.readFileSync(S + 'games.js', 'utf8'), pose = fs.readFileSync(S + 'pose.js', 'utf8'), app = fs.readFileSync(S + 'app.js', 'utf8');
const GAMES = [...games.matchAll(/name: '([^']+)', short: '[^']+', domain: '[^']+', body: '[^']+', how: '([^']+)'/g)].map(m => ({ name: m[1], how: m[2] }));
const CONST = eval(games.match(/const CONSTELLATIONS = (\[[^\]]+\])/)[1]);
const KLET = eval(games.match(/const KLETTERS = (\[[^\]]+\])/)[1]);
const moveNames = [...pose.matchAll(/name: '([^']+)', say: '([^']+)'/g)].map(m => m[1]);
const warm = [...games.matchAll(/say: '([^']+)', label:/g)].map(m => m[1]).concat(['무릎을 살짝 굽혔다 펴요', '앉은 채로 무릎을 하나씩 들어요']);
const g2 = fs.readFileSync(S + 'games2.js', 'utf8');
const shopNames = [...g2.slice(g2.indexOf('const SHOP_ITEMS'), g2.indexOf('class ShopGame')).matchAll(/'([가-힣]+)'\]/g)].map(m => m[1]);
const plain = new Set([...moveNames, ...warm, ...shopNames, '코로 천천히 들이마시며 팔을 올려요', '입으로 후 내쉬며 팔을 내려요', '규칙이 바뀌어요. 반대로 해요', '원래 규칙으로 돌아와요']);
for (const a of ['1P는 왼쪽, 2P는 오른쪽에 ', '화면 가운데에 ']) for (const b of ['의자에 앉아', '서서']) plain.add(a + b + ' 팔을 내리고 가만히 있어요');
for (let k = 1; k <= 14; k++) plain.add(`${k}번 별을 찾아요`); for (const l of KLET) plain.add(`${l}번 별을 찾아요`);
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
// 변수 조합 펼치기
const expand = (t) => {
  let out = [{}];
  const add = (k, vals) => { if (!t.includes('{' + k + '}')) return; out = out.flatMap(o => vals.map(v => ({ ...o, ...v }))); };
  add('game', GAMES.map(g => ({ game: g.name, how: g.how })));
  add('next', GAMES.map(g => ({ next: g.name })).concat([{ next: '노을 스트레칭' }]));
  add('star', CONST.map(s => ({ star: s })));
  add('n', [2, 3, 4, 5, 6, 7, 8].map(n => ({ n })));
  add('name', [{ name: '여러분' }, { name: '두 분' }]);
  return [...new Set(out.map(v => fill(t, v)))];
};
// 화면 자막·브라우저와 똑같은 열쇠(FNV-1a)
const norm = s => s.replace(/\s+/g, ' ').trim();
const vkey = (p, text) => { let h = 0x811c9dc5; const s = p + '|' + norm(text); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const VOICE = {
  basic: { voice: 'Sulafat', style: 'A warm, gentle Korean exercise instructor for older adults at a senior center. Calm, kind, clear and unhurried, smiling voice.' },
  trot: { voice: 'Sadachbia', style: 'A hyped Korean trot festival MC hosting a village party, like a TV national singing contest host. Big, playful, bouncy rhythm, stretches vowel endings on "~" with a sing-song lilt, laughs a little, full of 흥.' },
  sageuk: { voice: 'Enceladus', style: 'An old Joseon royal court eunuch (내관) in a Korean historical drama addressing the king. Slow, soft, extremely deferential and ceremonious, slightly high and airy, pausing at each comma, falling tone at sentence ends.' },
  caster: { voice: 'Fenrir', style: 'An excited Korean sports play-by-play broadcaster calling a live match. Fast, punchy, rising intensity with each exclamation, stadium energy, shouting the big moments.' },
  kid: { voice: 'Leda', style: 'A cheerful seven-year-old Korean child cheering for their grandparents. Bright, giggly, bouncy and adorable, very excited, simple childlike delivery.' }
};
const PLAIN_STYLE = 'Speak this instruction clearly and a bit slowly so older adults can follow, while keeping your character.';
const items = [];
for (const [id, P] of Object.entries(PERSONAS)) {
  const seen = new Set();
  const push = (text, kind) => { text = norm(text); const key = vkey(id, text); if (seen.has(key)) return; seen.add(key); items.push({ persona: id, key, kind, text, voice: VOICE[id].voice, style: kind === 'plain' ? VOICE[id].style + ' ' + PLAIN_STYLE : VOICE[id].style }); };
  push(P.sample, 'line');
  for (const [ev, arr] of Object.entries(P.lines)) for (const t of arr) for (const x of expand(t)) push(x, 'line');
  for (const t of plain) push(t, 'plain');
}
fs.writeFileSync('manifest.json', JSON.stringify({ model: 'gemini-3.8-flash-tts', items }, null, 1));
const by = {}; items.forEach(i => by[i.persona] = (by[i.persona] || 0) + 1);
console.log('total', items.length, by, 'chars', items.reduce((a, i) => a + i.text.length, 0));
console.log(items.filter(i => i.persona === 'trot').slice(0, 5).map(i => i.key + ' ' + i.text).join('\n'));
