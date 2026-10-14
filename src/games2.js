/* ================= 새 미니게임 ⑥~⑨ =================
   ⑥ 풍물 장단 놀이(리듬·타이밍)  ⑦ 장독대 짝 맞추기(시공간 기억)
   ⑧ 청홍 초롱 신호(규칙 전환)     ⑨ 오일장 장보기(단어·일화 기억)
   모두 BaseGame 위에서 동작 → 점수·콤보·피버·협동/대결/릴레이·난이도 자동 조절·기록이 기존 게임과 똑같이 붙음 */
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
function emoji(g, ch, x, y, size) { g.save(); g.font = `${size}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y + size * 0.04); g.restore(); }
// 한 사람 자리 가운데(2인 분할이면 자기 쪽)
function sideCx(game, i) { return game.split ? (i ? View.W * 0.75 : View.W * 0.25) : View.W / 2; }
// 판정 글자(얼쑤! 등)
function judgeText(g, txt, x, y, age, color) { if (age > 0.9) return; const a = clamp(1 - age / 0.9, 0, 1), s = 1 + Math.min(age, 0.15) * 2; g.save(); g.globalAlpha = a; outlineText(g, txt, x, y - age * 40, 46 * s, color); g.restore(); }

/* ---------- ⑥ 풍물 장단 놀이 ---------- */
const RHY_TYPES = { clap: { c: '#E8456E', skin: '#FBE3C4' }, up: { c: '#E9AE00', skin: '#FFF1C2' }, left: { c: '#3C78D8', skin: '#DCE8FF' }, right: { c: '#2E9E6A', skin: '#D8F3E4' } };
class RhythmGame extends BaseGame {
  constructor(ctx) {
    super('rhythm', ctx); this.bossText = '장단이 빨라져요!';
    this.travel = 2.6;
    this.st = this.ps.map(() => ({ notes: [], nextT: 2.2, beat: 0, lastG: 'none', fb: null, hitPulse: -9, perfect: 0 }));
  }
  onStart() { Sound.stopMusic(); }
  params(i) {
    const lv = this.lv(i);
    const bpm = (70 + lv * 4) * (this.bossOn ? 1.12 : 1);
    const types = lv <= 2 ? ['clap'] : lv <= 4 ? ['clap', 'up'] : ['clap', 'up', 'left', 'right'];
    const gap = lv <= 3 ? 2 : lv <= 6 ? pick([1, 2, 2]) : pick([1, 1, 2]);
    return { spb: 60 / bpm, types, gap, win: Math.max(0.32, 0.55 - lv * 0.022) };
  }
  // 장구 소리: 덩(큰 북) / 덕(채편)
  drum(kind, when = 0) { if (kind === 'deong') { Sound.tone(118, 0.32, 'sine', 0.45, when); Sound.noise(0.08, 0.2, 2400, when, 1.2); } else Sound.noise(0.06, 0.18, 3800, when, 2); }
  step(dt) {
    this.activeIdx().forEach(i => {
      const S = this.st[i], P = this.players[i], p = this.params(i);
      // 앞으로 travel초 동안 내려올 북 만들기
      while (S.nextT < this.t + this.travel + 0.2) {
        let tp = pick(p.types); const last = S.notes[S.notes.length - 1];
        if (last && last.type === tp && p.types.length > 1 && Math.random() < 0.5) tp = pick(p.types.filter(x => x !== tp));
        S.notes.push({ type: tp, t: S.nextT, judged: false });
        S.nextT += p.spb * p.gap;
      }
      // 박자 소리(북이 테에 닿는 순간)
      for (const n of S.notes) if (!n.sounded && this.t >= n.t) { n.sounded = true; this.drum('deong'); S.hitPulse = this.t; }
      // 새 동작이 시작된 순간(onset)으로 판정 — 인식 지연 0.15초 보정
      if (P.gesture !== S.lastG) {
        S.lastG = P.gesture;
        if (RHY_TYPES[P.gesture]) {
          const at = this.t - 0.15;
          const cand = S.notes.filter(n => !n.judged && Math.abs(n.t - at) <= p.win);
          const hit = cand.find(n => n.type === P.gesture);
          const A = this.areaFor(i), cx = sideCx(this, i), yJ = this.judgeY(A);
          if (hit) {
            hit.judged = true; const d = Math.abs(hit.t - at), perfect = d < p.win * 0.45;
            if (perfect) S.perfect++;
            this.correct(i, cx, yJ, null, { base: perfect ? 150 : 100 });
            S.fb = { txt: perfect ? Narr.word('combo10', '얼쑤!') : '좋다!', t: this.t, ok: true }; this.drum('deok');
          } else if (cand.length) { const n = cand[0]; n.judged = true; this.wrong(i, cx, yJ - 40, 'commission', `${MOVES[n.type].name}였어요`); S.fb = { txt: '앗!', t: this.t, ok: false }; }
        }
      }
      // 놓친 북
      for (const n of S.notes) if (!n.judged && this.t - 0.15 > n.t + p.win) { n.judged = true; this.ps[i].trials++; this.ps[i].omission++; this.ps[i].combo = 0; S.fb = { txt: '놓쳤어요', t: this.t, ok: false }; }
      S.notes = S.notes.filter(n => !(n.judged && this.t - n.t > 0.6));
      this.ps[i].extra.perfect = S.perfect;
    });
  }
  judgeY(A) { return A.y + A.h * 0.8; }
  draw(g, t) {
    this.activeIdx().forEach(i => {
      const S = this.st[i], A = this.areaFor(i), cx = sideCx(this, i), yJ = this.judgeY(A), y0 = Math.max(150, A.y - 40), R = clamp(Math.min(A.w, A.h) * 0.13, 52, 74);
      // 길(띠): 오방색 비단 띠
      g.save(); const lane = g.createLinearGradient(0, y0, 0, yJ + R); lane.addColorStop(0, 'rgba(244,236,221,0)'); lane.addColorStop(0.3, 'rgba(244,236,221,0.10)'); lane.addColorStop(1, 'rgba(244,236,221,0.22)');
      g.fillStyle = lane; roundRect(g, cx - R * 1.25, y0, R * 2.5, yJ - y0 + R * 1.3, R * 1.2); g.fill();
      g.strokeStyle = 'rgba(221,176,79,0.35)'; g.lineWidth = 2; g.setLineDash([3, 12]); g.beginPath(); g.moveTo(cx - R * 1.25, y0 + 30); g.lineTo(cx - R * 1.25, yJ); g.moveTo(cx + R * 1.25, y0 + 30); g.lineTo(cx + R * 1.25, yJ); g.stroke(); g.restore();
      // 판정 테(금빛 고리) — 박자에 맞춰 반짝
      const pulse = clamp(1 - (this.t - S.hitPulse) / 0.3, 0, 1);
      g.save(); g.shadowColor = PAL.gold2; g.shadowBlur = 18 + pulse * 30; g.beginPath(); g.arc(cx, yJ, R * 1.18 + pulse * 6, 0, 7); g.lineWidth = 7; g.strokeStyle = PAL.gold; g.stroke(); g.restore();
      plainText(g, '여기서 동작!', cx, yJ + R * 1.18 + 26, 18, PAL.gold2, 'center', 700);
      // 북(음표)
      for (const n of S.notes) {
        if (n.judged && n.hitShown === undefined) n.hitShown = this.t;
        const k = 1 - (n.t - this.t) / this.travel; if (k < -0.05) continue;
        const y = lerp(y0 + R, yJ, k), ty = RHY_TYPES[n.type], gone = n.judged ? clamp((this.t - n.hitShown) / 0.35, 0, 1) : 0;
        g.save(); g.globalAlpha = 1 - gone; const r = R * (1 + gone * 0.4) * (k > 1 ? 1 - (k - 1) * 2 : 1);
        // 북 몸통 + 가죽
        g.shadowColor = 'rgba(4,6,18,0.5)'; g.shadowBlur = 10; g.beginPath(); g.arc(cx, y, r, 0, 7); g.fillStyle = ty.c; g.fill(); g.shadowBlur = 0;
        g.beginPath(); g.arc(cx, y, r * 0.84, 0, 7); g.fillStyle = ty.skin; g.fill();
        g.strokeStyle = 'rgba(42,30,20,0.55)'; g.lineWidth = 2; for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(an) * r * 0.86, y + Math.sin(an) * r * 0.86); g.lineTo(cx + Math.cos(an) * r * 0.98, y + Math.sin(an) * r * 0.98); g.stroke(); }
        drawPicto(g, cx, y + r * 0.62, r * 1.25, n.type, '#2A1E14', false);
        g.restore();
      }
      // 다음 동작 이름
      const nx = S.notes.find(n => !n.judged); if (nx) { lacquerPanel(g, cx - 110, y0 - 6, 220, 40, 20, 0.85); plainText(g, '다음 · ' + MOVES[nx.type].name, cx, y0 + 14, 19, PAL.ivory, 'center', 700); }
      if (S.fb) judgeText(g, S.fb.txt, cx, yJ - R * 1.9, this.t - S.fb.t, S.fb.ok ? PAL.gold2 : PAL.ivory2);
    });
  }
  drawGuide(g) { outlineText(g, '북이 금빛 테에 닿을 때 그림 속 동작을 해요', View.W / 2, View.H - 100, Math.min(30, View.W * 0.022), COLORS.ink); }
}

/* ---------- ⑦ 장독대 짝 맞추기 ---------- */
const JAR_ICONS = [['🐯', '호랑이'], ['🐦', '까치'], ['🌸', '꽃'], ['🌙', '달'], ['☀️', '해'], ['🐢', '거북'], ['🦌', '사슴'], ['🐟', '물고기'], ['🍑', '복숭아'], ['🦋', '나비'], ['🌲', '소나무'], ['🐓', '닭']];
function drawJar(g, x, y, w, open, t, matched, glow) {
  const h = w * 0.95;
  g.save();
  if (glow) { g.shadowColor = PAL.gold2; g.shadowBlur = 24; }
  // 몸통(옹기)
  const body = g.createRadialGradient(x - w * 0.18, y - h * 0.1, w * 0.05, x, y, w * 0.62); body.addColorStop(0, '#9A6440'); body.addColorStop(0.7, '#5E3A22'); body.addColorStop(1, '#3E2414');
  g.fillStyle = body; g.beginPath(); g.moveTo(x - w * 0.3, y - h * 0.38); g.bezierCurveTo(x - w * 0.62, y - h * 0.2, x - w * 0.56, y + h * 0.42, x - w * 0.26, y + h * 0.5); g.lineTo(x + w * 0.26, y + h * 0.5); g.bezierCurveTo(x + w * 0.56, y + h * 0.42, x + w * 0.62, y - h * 0.2, x + w * 0.3, y - h * 0.38); g.closePath(); g.fill();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + h * 0.05, w * 0.44, h * 0.05, 0, 0, Math.PI); g.stroke();
  // 입구
  g.fillStyle = '#2A170C'; g.beginPath(); g.ellipse(x, y - h * 0.38, w * 0.3, h * 0.07, 0, 0, 7); g.fill();
  // 뚜껑(열리면 위로 들려 기울어짐)
  const lift = open * h * 0.42, rot = open * -0.5;
  g.save(); g.translate(x + open * w * 0.22, y - h * 0.42 - lift); g.rotate(rot);
  g.fillStyle = matched ? '#C9962E' : '#6E4429'; g.beginPath(); g.ellipse(0, 0, w * 0.36, h * 0.09, 0, 0, 7); g.fill();
  g.fillStyle = matched ? '#E9C46A' : '#83543A'; g.beginPath(); g.ellipse(0, -h * 0.05, w * 0.22, h * 0.07, 0, 0, 7); g.fill();
  g.fillStyle = '#3E2414'; g.beginPath(); g.ellipse(0, -h * 0.1, w * 0.07, h * 0.04, 0, 0, 7); g.fill();
  g.restore();
  g.restore();
}
class JarsGame extends BaseGame {
  constructor(ctx) { super('jars', ctx); this.bossText = '항아리가 늘어나요!'; this.st = this.ps.map(() => ({ board: null, wait: 0.6, cleared: 0 })); }
  newBoard(i) {
    const lv = this.lv(i), pairs = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7][lv - 1] + (this.bossOn ? 1 : 0);
    const icons = shuffle(JAR_ICONS).slice(0, pairs), cards = shuffle(icons.concat(icons)).map(ic => ({ ic, open: 0, up: false, matched: false, seen: false, dw: 0 }));
    const A = this.areaFor(i, 1.5), n = cards.length;
    let cols = Math.ceil(Math.sqrt(n * A.w / A.h)); cols = clamp(cols, 2, 6); const rows = Math.ceil(n / cols);
    const cw = A.w / cols, chh = A.h / rows, w = Math.min(cw * 0.7, chh * 0.62, 140);
    cards.forEach((c, k) => { const r = Math.floor(k / cols), col = k % cols, inRow = Math.min(cols, n - r * cols); c.x = A.x + (A.w - inRow * cw) / 2 + col * cw + cw / 2; c.y = A.y + r * chh + chh * 0.58; c.w = w; });
    const preview = Math.max(1.6, 4.2 - lv * 0.28);
    this.st[i].board = { cards, t0: this.t, preview, pick: [], closeAt: 0, found: 0 };
    cards.forEach(c => { c.up = true; c.seen = false; });
  }
  step(dt) {
    this.activeIdx().forEach(i => {
      const S = this.st[i];
      if (!S.board) { S.wait -= dt; if (S.wait <= 0) this.newBoard(i); return; }
      const B = S.board, inPreview = this.t - B.t0 < B.preview;
      if (!inPreview && !B.closed) { B.closed = true; B.cards.forEach(c => { if (!c.matched) c.up = false; }); Sound.tick(); }
      for (const c of B.cards) c.open = clamp(c.open + (c.up ? dt : -dt) * 4, 0, 1);
      if (inPreview) return;
      // 틀린 두 개 닫기
      if (B.closeAt && this.t >= B.closeAt) { B.pick.forEach(c => { c.up = false; }); B.pick = []; B.closeAt = 0; }
      if (B.closeAt) return;
      for (const c of B.cards) {
        if (c.up || c.matched) { c.dw = 0; continue; }
        const H = this.handOver(i, c.x, c.y - c.w * 0.2, c.w * 0.6);
        if (H) { c.dw += dt; H.dwell = c.dw / 0.45; } else c.dw = 0;
        if (c.dw >= 0.45) {
          c.dw = 0; if (H) H.dwell = 0; c.up = true; Sound.tick(); B.pick.push(c);
          if (B.pick.length === 2) {
            const [a, b] = B.pick;
            if (a.ic === b.ic) {
              a.matched = b.matched = true; B.pick = []; B.found++; this.correct(i, (a.x + b.x) / 2, Math.min(a.y, b.y) - c.w * 0.6, null, { base: 120 });
              FX.burst(a.x, a.y - a.w * 0.5, [PAL.gold2, '#fff'], 14); FX.burst(b.x, b.y - b.w * 0.5, [PAL.gold2, '#fff'], 14);
              if (B.cards.every(k => k.matched)) {
                const bonus = Math.max(50, Math.round(400 - (this.t - B.t0) * 6)); this.ps[i].score += bonus; if (this.coop) this.addTeam(bonus);
                S.cleared++; FX.showBanner('장독대 완성!', PAL.gold2, `시간 보너스 +${bonus}`, 1.4); Sound.harp(); Narr.flavor('treasure');
                this.ps[i].maxSpan = Math.max(this.ps[i].maxSpan, B.cards.length / 2); S.board = null; S.wait = 1.4;
              }
            } else {
              // 이미 본 적 있는 그림을 놓쳤을 때만 '기억 실수'로 셈(처음 보는 건 탐색)
              const memErr = a.seen && b.seen || B.cards.some(k => k !== a && k !== b && !k.matched && k.seen && (k.ic === a.ic || k.ic === b.ic));
              if (memErr) this.wrong(i, b.x, b.y - b.w, 'commission', '아까 본 자리예요!'); else { this.ps[i].combo = 0; Sound.soft(); }
              B.closeAt = this.t + 1.0;
            }
            a.seen = b.seen = true;
          }
          break;
        }
      }
    });
  }
  hint(i) { const B = this.st[i].board; if (!B || B.closeAt) return; const c = B.cards.find(k => !k.matched && !k.up); if (!c) return; const m = B.cards.find(k => k !== c && k.ic === c.ic); FX.text('여기와 여기!', (c.x + m.x) / 2, Math.min(c.y, m.y) - c.w, PAL.gold2, 34, 1.6); c.hintT = m.hintT = this.t; }
  draw(g, t) {
    this.activeIdx().forEach(i => {
      const B = this.st[i].board; if (!B) return;
      const inPreview = this.t - B.t0 < B.preview;
      for (const c of B.cards) {
        const hint = c.hintT && this.t - c.hintT < 1.6;
        drawJar(g, c.x, c.y, c.w, c.open, t, c.matched, hint || (c.dw > 0));
        if (c.open > 0.35) { g.save(); g.globalAlpha = clamp((c.open - 0.35) / 0.4, 0, 1); emoji(g, c.ic[0], c.x, c.y - c.w * 0.62, c.w * 0.52); g.restore(); }
        if (c.dw > 0) { g.beginPath(); g.arc(c.x, c.y - c.w * 0.2, c.w * 0.62, -Math.PI / 2, -Math.PI / 2 + c.dw / 0.45 * Math.PI * 2); g.lineWidth = 6; g.strokeStyle = COLORS.sun; g.stroke(); }
      }
      const cx = sideCx(this, i);
      if (inPreview) { const left = Math.ceil(B.preview - (this.t - B.t0)); lacquerPanel(g, cx - 150, 172, 300, 48, 24, 0.9, PAL.gold2); plainText(g, `잘 보고 외워요 · ${left}`, cx, 196, 21, PAL.gold2, 'center', 700); }
      else { lacquerPanel(g, cx - 120, 172, 240, 44, 22, 0.85); plainText(g, `찾은 짝 ${B.found} / ${B.cards.length / 2}`, cx, 194, 20, PAL.ivory, 'center', 700); }
    });
  }
  drawGuide(g) { outlineText(g, '손을 항아리 위에 잠깐 두면 뚜껑이 열려요', View.W / 2, View.H - 100, Math.min(30, View.W * 0.022), COLORS.ink); }
}

/* ---------- ⑧ 청홍 초롱 신호 (규칙 바꾸기) ---------- */
const LANTERN = { red: { c: '#D8423A', name: '빨간 초롱' }, blue: { c: '#2F6FD8', name: '파란 초롱' }, gold: { c: '#E9AE00', name: '노란 초롱' } };
function drawLantern(g, x, y, s, color, t, lit = 1) {
  g.save();
  g.strokeStyle = '#3B2A1A'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - s * 1.25); g.lineTo(x, y - s * 0.75); g.stroke();
  g.shadowColor = color; g.shadowBlur = 40 * lit;
  const gr = g.createRadialGradient(x, y - s * 0.1, s * 0.1, x, y, s * 0.8); gr.addColorStop(0, '#FFF3D0'); gr.addColorStop(0.35, color); gr.addColorStop(1, shade(color, -0.35));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, s * 0.55, s * 0.72, 0, 0, 7); g.fill(); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(60,30,10,0.45)'; g.lineWidth = 2; for (const k of [-0.3, 0, 0.3]) { g.beginPath(); g.ellipse(x, y, s * 0.55 * Math.cos(k * 2.2) * 0.98, s * 0.72, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); }
  g.fillStyle = '#C9962E'; roundRect(g, x - s * 0.34, y - s * 0.86, s * 0.68, s * 0.16, 4); g.fill(); roundRect(g, x - s * 0.34, y + s * 0.7, s * 0.68, s * 0.16, 4); g.fill();
  g.strokeStyle = '#D8423A'; g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * s * 0.07, y + s * 0.86); g.lineTo(x + k * s * 0.08 + Math.sin(t * 3 + k) * 3, y + s * 1.2); g.stroke(); }
  g.restore();
}
class SignalGame extends BaseGame {
  constructor(ctx) { super('signal', ctx); this.bossText = '규칙이 더 자주 바뀌어요!'; this.st = this.ps.map(() => ({ q: null, wait: 1.6, rev: false, left: randi(4, 6), fb: null, flipT: -9, rtSw: [], rtRep: [], prevRev: false })); }
  target(S, col) { if (col === 'gold') return 'up'; const base = col === 'red' ? 'left' : 'right'; return S.rev ? (base === 'left' ? 'right' : 'left') : base; }
  timeout(i) { return Math.max(2.6, 6.2 - this.lv(i) * 0.35) * (this.bossOn ? 0.85 : 1); }
  ask(i) {
    const S = this.st[i], lv = this.lv(i);
    if (S.left <= 0) { S.rev = !S.rev; S.left = this.bossOn ? randi(2, 3) : lv >= 6 ? randi(2, 4) : randi(3, 6); S.flipT = this.t; FX.showBanner(S.rev ? '규칙이 바뀌어요! 반대로!' : '원래 규칙으로!', S.rev ? COLORS.berry : COLORS.leaf, S.rev ? '빨강 → 오른팔 · 파랑 → 왼팔' : '빨강 → 왼팔 · 파랑 → 오른팔', 2); Sound.fanfare(); Narr.plain(S.rev ? '규칙이 바뀌어요. 반대로 해요' : '원래 규칙으로 돌아와요'); }
    const cols = lv >= 6 ? ['red', 'blue', 'red', 'blue', 'gold'] : ['red', 'blue'];
    const col = pick(cols); S.q = { col, t0: this.t, target: this.target(S, col), switched: S.rev !== S.prevRev }; S.prevRev = S.rev; S.release = true; S.left--;
  }
  step(dt) {
    this.activeIdx().forEach(i => {
      const S = this.st[i], P = this.players[i];
      if (!S.q) { S.wait -= dt; if (S.wait <= 0) this.ask(i); return; }
      const q = S.q, A = this.areaFor(i), cx = sideCx(this, i), cy = A.y + A.h * 0.35;
      if (S.release) { if (!['left', 'right', 'up'].includes(P.gesture) || this.t - q.t0 > 1.0) S.release = false; return; }
      if (heldFor(P, q.target) >= 0.35) {
        const rt = this.t - q.t0; (q.switched ? S.rtSw : S.rtRep).push(rt);
        this.correct(i, cx, cy, rt); S.fb = { ok: true, t: this.t }; S.q = null; S.wait = 0.7; return;
      }
      const wrongG = ['left', 'right', 'up'].find(gg => gg !== q.target && heldFor(P, gg) >= 0.5);
      if (wrongG) { this.wrong(i, cx, cy, 'commission', S.rev && q.col !== 'gold' ? '지금은 반대 규칙!' : `${MOVES[q.target].name}예요`); S.fb = { ok: false, t: this.t, show: q.target }; S.q = null; S.wait = 1.1; return; }
      if (this.t - q.t0 > this.timeout(i)) { this.wrong(i, cx, cy, 'omission', '시간이 지났어요'); S.fb = { ok: false, t: this.t, show: q.target }; S.q = null; S.wait = 1.0; }
    });
    // 전환 비용(규칙이 바뀐 직후 반응이 얼마나 느려지는지) 기록
    this.st.forEach((S, i) => { const m = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; const a = m(S.rtSw), b = m(S.rtRep); this.ps[i].extra.switchCost = a != null && b != null ? a - b : null; });
  }
  draw(g, t) {
    this.activeIdx().forEach(i => {
      const S = this.st[i], A = this.areaFor(i), cx = sideCx(this, i), half = this.split ? View.W / 2 : View.W;
      // 규칙 카드
      const cw = Math.min(half * 0.86, 600), ch = 132, x0 = cx - cw / 2, y0 = 172, flash = clamp(1 - (this.t - S.flipT) / 1.5, 0, 1);
      lacquerPanel(g, x0, y0, cw, ch, 20, 0.92, S.rev ? COLORS.berry : PAL.gold);
      if (flash > 0) { g.save(); g.globalAlpha = flash * 0.35; g.fillStyle = S.rev ? COLORS.berry : COLORS.leaf; roundRect(g, x0, y0, cw, ch, 20); g.fill(); g.restore(); }
      plainText(g, S.rev ? '지금 규칙 · 반대로!' : '지금 규칙', cx, y0 + 20, 17, S.rev ? '#FF9A8A' : PAL.gold2, 'center', 800);
      const rules = [['red', this.target(S, 'red')], ['blue', this.target(S, 'blue')]]; if (this.lv(i) >= 6) rules.push(['gold', 'up']);
      const colW = cw / rules.length;
      rules.forEach(([col, tg], k) => { const x = x0 + colW * (k + 0.5); drawLantern(g, x - colW * 0.24, y0 + 82, 28, LANTERN[col].c, t, 0.6); plainText(g, '→', x - colW * 0.03, y0 + 82, 26, PAL.ivory2, 'center', 700); drawPicto(g, x + colW * 0.2, y0 + 124, 80, tg, PAL.ivory); });
      // 지금 초롱
      const ls = clamp(Math.min(A.w, A.h) * 0.2, 60, 110), ly = Math.max(A.y + A.h * 0.5, 320 + ls * 1.3);
      if (S.q) {
        const age = this.t - S.q.t0, sw = Math.sin(t * 2) * 0.05;
        g.save(); g.translate(cx, ly - ls * 1.2); g.rotate(sw); g.translate(-cx, -(ly - ls * 1.2)); drawLantern(g, cx, ly, ls, LANTERN[S.q.col].c, t, clamp(age / 0.25, 0, 1)); g.restore();
        const left = clamp(1 - age / this.timeout(i), 0, 1); roundRect(g, cx - ls, ly + ls * 1.45, ls * 2 * left, 8, 4); g.fillStyle = left < 0.3 ? COLORS.berry : COLORS.leaf; g.fill();
        outlineText(g, LANTERN[S.q.col].name, cx, ly + ls * 1.75, Math.min(34, half * 0.03), COLORS.ink);
      }
      if (S.fb && this.t - S.fb.t < 1.0) { if (S.fb.ok) goldText(g, 'O', cx + ls * 1.6, ly, 110); else if (S.fb.show) { lacquerPanel(g, cx + ls * 0.9, ly - 70, 160, 150, 18, 0.9); plainText(g, '정답', cx + ls * 0.9 + 80, ly - 50, 17, PAL.ivory2, 'center', 700); drawPicto(g, cx + ls * 0.9 + 80, ly + 70, 100, S.fb.show, PAL.gold2); } }
    });
  }
  drawGuide(g) { outlineText(g, '초롱 색을 보고 규칙 카드대로 팔을 들어요', View.W / 2, View.H - 100, Math.min(30, View.W * 0.022), COLORS.ink); }
}

/* ---------- ⑨ 오일장 장보기 (목록 기억) ---------- */
const SHOP_ITEMS = [['🍎', '사과'], ['🥚', '달걀'], ['🐟', '생선'], ['🥬', '배추'], ['🍠', '고구마'], ['🌰', '밤'], ['🍇', '포도'], ['🥕', '당근'], ['🍐', '배'], ['🍄', '버섯'], ['🧄', '마늘'], ['🌽', '옥수수'], ['🍡', '떡'], ['🥛', '우유']];
class ShopGame extends BaseGame {
  constructor(ctx) { super('shop', ctx); this.bossText = '목록이 길어져요!'; this.st = this.ps.map(() => ({ r: null, wait: 1.2 })); }
  span(i) { return [2, 2, 3, 3, 4, 4, 5, 5, 6, 6][this.lv(i) - 1] + (this.bossOn ? 1 : 0); }
  newRound(i) {
    const n = this.span(i), list = shuffle(SHOP_ITEMS).slice(0, n), lv = this.lv(i);
    const per = Math.max(1.3, 2.4 - lv * 0.1);
    this.st[i].r = { list, phase: 'study', t0: this.t, per, shown: -1, picked: [], wrongs: 0, needUp: lv >= 5 };
  }
  layoutStall(i) {
    const r = this.st[i].r, A = this.areaFor(i, 1.5), extra = shuffle(SHOP_ITEMS.filter(it => !r.list.includes(it))).slice(0, Math.min(r.list.length + 2, 8));
    const items = shuffle(r.list.concat(extra)).map(it => ({ it, dw: 0, taken: false, bad: 0 }));
    const n = items.length; let cols = clamp(Math.ceil(Math.sqrt(n * A.w / A.h)), 2, 5); const rows = Math.ceil(n / cols);
    const cw = A.w / cols, chh = A.h / rows, s = Math.min(cw * 0.78, chh * 0.78, 130);
    items.forEach((c, k) => { const ro = Math.floor(k / cols), co = k % cols, inRow = Math.min(cols, n - ro * cols); c.x = A.x + (A.w - inRow * cw) / 2 + co * cw + cw / 2; c.y = A.y + ro * chh + chh / 2; c.s = s; });
    r.items = items; r.phase = 'pick'; r.t0 = this.t; r.limit = 6 + r.list.length * 4.5;
  }
  step(dt) {
    this.activeIdx().forEach(i => {
      const S = this.st[i], P = this.players[i];
      if (!S.r) { S.wait -= dt; if (S.wait <= 0) this.newRound(i); return; }
      const r = S.r, A = this.areaFor(i), cx = sideCx(this, i);
      if (r.phase === 'study') {
        const k = Math.floor((this.t - r.t0) / r.per);
        if (k !== r.shown && k < r.list.length) { r.shown = k; if (i === this.activeIdx()[0]) Narr.plain(r.list[k][1], { noCaption: true }); Sound.tick(); }
        if (k >= r.list.length + 1) { r.phase = r.needUp ? 'wait' : 'gap'; r.t0 = this.t; }
        return;
      }
      if (r.phase === 'gap') { if (this.t - r.t0 > 1.6) this.layoutStall(i); return; }
      if (r.phase === 'wait') { if (heldFor(P, 'up') >= 0.4 || this.t - r.t0 > 6) { FX.text('장 보러 가요!', cx, A.y + A.h * 0.4, PAL.gold2, 44); this.layoutStall(i); } return; }
      if (r.phase === 'pick') {
        for (const c of r.items) {
          if (c.taken) continue;
          const H = this.handOver(i, c.x, c.y, c.s * 0.55);
          if (H) { c.dw += dt; H.dwell = c.dw / 0.4; } else c.dw = 0;
          if (c.dw >= 0.4) {
            c.dw = 0; if (H) H.dwell = 0;
            if (r.list.includes(c.it)) { c.taken = true; r.picked.push(c.it); this.correct(i, c.x, c.y, this.t - r.t0, { base: 110 }); c.flyT = this.t; }
            else { c.bad = this.t; c.taken = true; r.wrongs++; this.wrong(i, c.x, c.y, 'commission', '목록에 없어요'); }
            break;
          }
        }
        const done = r.picked.length >= r.list.length, over = this.t - r.t0 > r.limit;
        if (done || over) {
          if (done) { const bonus = r.wrongs === 0 ? 150 + r.list.length * 30 : 60; this.ps[i].score += bonus; if (this.coop) this.addTeam(bonus); FX.showBanner(r.wrongs === 0 ? '완벽한 장보기!' : '장보기 완료!', PAL.gold2, `+${bonus}`, 1.3); Sound.harp(); if (r.wrongs === 0) this.ps[i].maxSpan = Math.max(this.ps[i].maxSpan, r.list.length); }
          else { const miss = r.list.filter(it => !r.picked.includes(it)); miss.forEach(() => { this.ps[i].trials++; this.ps[i].omission++; }); this.ps[i].combo = 0; r.missed = miss; FX.text('이것도 목록에 있었어요', cx, A.y + 30, PAL.ivory2, 34, 2); }
          r.phase = 'end'; r.t0 = this.t;
        }
        return;
      }
      if (r.phase === 'end' && this.t - r.t0 > (r.missed ? 2.4 : 1.2)) { S.r = null; S.wait = 0.4; }
    });
  }
  draw(g, t) {
    this.activeIdx().forEach(i => {
      const r = this.st[i].r; if (!r) return;
      const A = this.areaFor(i), cx = sideCx(this, i), half = this.split ? View.W / 2 : View.W;
      if (r.phase === 'study' || r.phase === 'gap' || r.phase === 'wait') {
        // 장보기 쪽지
        const n = r.list.length, cw = Math.min(half * 0.86, 140 * n + 60), ch = 230, x0 = cx - cw / 2, y0 = Math.max(170, A.y + A.h * 0.15);
        g.save(); g.shadowColor = 'rgba(4,6,18,0.5)'; g.shadowBlur = 20; g.shadowOffsetY = 8; roundRect(g, x0, y0, cw, ch, 18); g.fillStyle = '#F4ECDD'; g.fill(); g.restore();
        g.strokeStyle = PAL.gold; g.lineWidth = 2; roundRect(g, x0 + 8, y0 + 8, cw - 16, ch - 16, 12); g.stroke();
        plainText(g, r.phase === 'study' ? '장보기 목록 · 잘 외워요' : '목록을 떠올려 보세요…', cx, y0 + 32, 22, '#5A3A1E', 'center', 800, SERIF);
        const slot = (cw - 40) / n;
        r.list.forEach((it, k) => { const x = x0 + 20 + slot * (k + 0.5), vis = r.phase === 'study' && k <= r.shown; if (vis) { emoji(g, it[0], x, y0 + 115, Math.min(72, slot * 0.6)); plainText(g, it[1], x, y0 + 185, Math.min(24, slot * 0.22), '#2A1E14', 'center', 800, SERIF); } else { plainText(g, r.phase === 'study' ? '' : '?', x, y0 + 125, 54, 'rgba(90,58,30,0.35)', 'center', 800, SERIF); } });
        if (r.phase === 'wait') { outlineText(g, '외웠으면 만세! 하고 장 보러 가요', cx, y0 + ch + 50, Math.min(34, half * 0.03), PAL.gold2); drawPicto(g, cx, y0 + ch + 210, 120, 'up', PAL.gold2); }
        return;
      }
      for (const c of r.items) {
        const flying = c.flyT && this.t - c.flyT < 0.6, gone = c.taken && !flying && !c.bad;
        if (gone) continue;
        let x = c.x, y = c.y, a = 1;
        if (flying) { const k = (this.t - c.flyT) / 0.6; x = lerp(c.x, cx, k); y = lerp(c.y, View.H - 160, k); a = 1 - k; }
        if (c.bad && this.t - c.bad > 0.8) continue;
        g.save(); g.globalAlpha = a;
        lacquerPanel(g, x - c.s / 2, y - c.s / 2, c.s, c.s, 18, 0.82, c.bad ? COLORS.berry : (c.dw > 0 ? PAL.gold2 : undefined));
        emoji(g, c.it[0], x, y - c.s * 0.08, c.s * 0.5); plainText(g, c.it[1], x, y + c.s * 0.34, Math.min(20, c.s * 0.18), PAL.ivory, 'center', 700);
        if (c.dw > 0) { g.beginPath(); g.arc(x, y, c.s * 0.62, -Math.PI / 2, -Math.PI / 2 + c.dw / 0.4 * Math.PI * 2); g.lineWidth = 6; g.strokeStyle = COLORS.sun; g.stroke(); }
        g.restore();
      }
      if (r.phase === 'end' && r.missed) r.missed.forEach((it, k) => { const c = r.items.find(z => z.it === it); if (c) { g.save(); g.shadowColor = PAL.gold2; g.shadowBlur = 30; lacquerPanel(g, c.x - c.s / 2, c.y - c.s / 2, c.s, c.s, 18, 0.9, PAL.gold2); g.restore(); emoji(g, it[0], c.x, c.y - c.s * 0.08, c.s * 0.5); } });
      // 장바구니
      const bw = 230, by = View.H - 196; lacquerPanel(g, cx - bw / 2, by, bw, 52, 26, 0.88); emoji(g, '🧺', cx - bw / 2 + 34, by + 26, 30); plainText(g, `담은 물건 ${r.picked.length} / ${r.list.length}`, cx + 18, by + 27, 20, PAL.ivory, 'center', 700);
    });
  }
  drawGuide(g) { outlineText(g, '목록에 있던 물건만 손을 대어 골라 담아요', View.W / 2, View.H - 100, Math.min(30, View.W * 0.022), COLORS.ink); }
}

// 영역 분류(지도·테마 코스용)
const CATS = { memory: { n: '기억력', seal: '기', c: '#C9A2F0', d: '순서·자리·물건 외우기' }, focus: { n: '집중력', seal: '집', c: '#7CC0FF', d: '색·순서·박자에 집중' }, judge: { n: '판단력', seal: '판', c: '#86D9B0', d: '맞다·틀리다, 참기, 규칙 바꾸기' } };
const GAME_CAT = { dance: 'memory', jars: 'memory', shop: 'memory', balloon: 'focus', stars: 'focus', rhythm: 'focus', ox: 'judge', orchard: 'judge', signal: 'judge' };
Object.assign(GAME_CLASS, { rhythm: RhythmGame, jars: JarsGame, signal: SignalGame, shop: ShopGame });
