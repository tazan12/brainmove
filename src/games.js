/* ================= 미니게임 ================= */
const GAMES = {
  balloon: { img: 'market', name: '무지개 풍선 시장', short: '풍선 시장', domain: '억제조절 · 선택적 주의', body: '팔 뻗기 · 몸통 회전', how: '글자 뜻 말고 글자 색깔과 같은 풍선을 터뜨려요', scene: 'market', color: '#E8456E' },
  dance: { img: 'stage', name: '흥부자 댄스 무대', short: '댄스 무대', domain: '작업기억 · 순서 기억', body: '만세 · 팔 들기 · 스쿼트', how: '무브가 보여 준 춤을 순서대로 따라 춰요', scene: 'stage', color: PAL.plum },
  stars: { img: 'night', name: '밤하늘 별자리 잇기', short: '별자리 잇기', domain: '처리속도 · 주의 전환', body: '대각선 팔 뻗기', how: '1 → 2 → 3 순서대로 별을 터치해 이어요', scene: 'night', color: '#2F7CF6' },
  ox: { img: 'river', name: '징검다리 OX 계산', short: '징검다리 OX', domain: '계산 · 판단', body: '만세(O) · 팔 X 자', how: '식이 맞으면 만세(O), 틀리면 팔로 X 자', scene: 'river', color: '#1FA2C9' },
  orchard: { img: 'orchard', name: '과수원 수확', short: '과수원', domain: '반응억제 · 반응속도', body: '빠른 손 뻗기 · 참기', how: '과일은 터치! 벌은 손을 내리고 참아요', scene: 'orchard', color: '#38B07A' },
  rhythm: { img: 'yard', name: '풍물 장단 놀이', short: '풍물 장단', domain: '리듬 · 타이밍 · 지속 주의', body: '박수 · 만세 · 팔 들기', how: '북이 금빛 테에 닿을 때 그림 속 동작을 해요', scene: 'yard', color: '#D9703A' },
  jars: { img: 'jars', name: '장독대 짝 맞추기', short: '장독대', domain: '시공간 기억', body: '팔 뻗기 · 몸통 돌리기', how: '항아리 뚜껑을 열어 같은 그림 두 개를 찾아요', scene: 'jars', color: '#9A5B2A' },
  signal: { img: 'lantern', name: '청홍 초롱 신호', short: '초롱 신호', domain: '인지 유연성 · 규칙 전환', body: '왼팔 · 오른팔 들기', how: '초롱 색을 보고 규칙대로 팔을 들어요. 규칙이 바뀌면 반대로', scene: 'lantern', color: '#3C78D8' },
  shop: { img: 'shop', name: '오일장 장보기', short: '장보기', domain: '일화 기억 · 단어 기억', body: '팔 뻗기', how: '장보기 목록을 외운 뒤 같은 물건을 골라 담아요', scene: 'shop', color: '#2E9E6A' }
};
const GAME_ORDER = ['balloon', 'dance', 'stars', 'ox', 'orchard', 'rhythm', 'jars', 'signal', 'shop'];
const CONSTELLATIONS = ['북두칠성', '카시오페아', '오리온자리', '백조자리', '사자자리', '전갈자리', '거문고자리', '쌍둥이자리'];
const STROOP = [
  { n: '빨강', c: '#E5394F', s: 'circle' }, { n: '파랑', c: '#2F6FF6', s: 'square' }, { n: '노랑', c: '#E9AE00', s: 'tri' },
  { n: '초록', c: '#1F9E57', s: 'star' }, { n: '보라', c: '#8A4FE0', s: 'diamond' }
];
const KLETTERS = ['가', '나', '다', '라', '마', '바', '사', '아'];

function newPS(i, level) {
  return { i, level, startLevel: level, tempLv: 0, score: 0, combo: 0, maxCombo: 0, trials: 0, correct: 0, rts: [], commission: 0, omission: 0, consecWrong: 0, consecRight: 0, fever: 0, lastCorrectT: -9, maxSpan: 0, fruits: 0, constellations: [], extra: {} };
}

class BaseGame {
  constructor(id, ctx) {
    this.id = id; this.kind = 'game'; this.meta = GAMES[id]; this.ctx = ctx; this.t = 0; this.done = false;
    this.duration = ctx.duration; this.ps = ctx.players.map((P, i) => newPS(i, ctx.levels[i]));
    this.team = { score: 0, goal: Math.round(3200 * ctx.duration / 180), stars: 0, harmony: 0, cheers: 0 };
    this.bossSec = Math.min(30, this.duration * 0.25); this.bossOn = false; this.crowd = 0;
  }
  get players() { return this.ctx.players; }
  get coop() { return this.ctx.mode === 'coop'; }
  get split() { return this.ctx.split; }
  // 이번 판에 실제로 플레이하는 사람 인덱스
  activeIdx() { return this.ctx.mode === 'relay' ? [this.ctx.relayIdx] : this.players.map((_, i) => i); }
  isActive(i) { return this.activeIdx().includes(i); }
  lv(i) { return clamp(this.ps[i].level + this.ps[i].tempLv, 1, 10); }
  areaFor(i, reach) { const sp = this.split; return View.area(this.players[i], { split: sp, side: i, reach: reach ?? (1.3 + this.lv(i) * 0.03) }); }
  timeLeft() { return Math.max(0, this.duration - this.t); }
  start() { Narr.say('gameStart', { game: this.meta.name, how: this.meta.how }); this.onStart?.(); }
  update(dt) {
    this.t += dt;
    if (!this.bossOn && this.timeLeft() <= this.bossSec) { this.bossOn = true; FX.showBanner('보스 라운드!', COLORS.berry, this.bossText || '조금 더 빠르게!'); Narr.say('boss'); Sound.fanfare(); }
    for (const ps of this.ps) if (ps.fever > 0) { ps.fever -= dt; if (ps.fever <= 0) Sound.setTempo(100); }
    if (this.ctx.mode === 'relay') this.updateCheer(dt);
    this.step(dt);
    if (this.t >= this.duration) this.done = true;
  }
  updateCheer(dt) {
    // 쉬는 사람이 박수(두 손 모으기)로 응원하면 팀 보너스
    const j = 1 - this.ctx.relayIdx, P = this.players[j]; if (!P) return;
    if (P.gesture === 'clap' && !this.cheerHeld) { this.cheerHeld = true; this.team.cheers++; this.team.score += 30; this.ps[this.ctx.relayIdx].score += 30; const h = P.hands[0]; if (h.px) FX.burst(h.px, h.py, ['#FF6B8A', '#FFC83A'], 10, 'heart', 0.6); Sound.clap(); }
    if (P.gesture !== 'clap') this.cheerHeld = false;
  }
  correct(i, x, y, rt, opt = {}) {
    const ps = this.ps[i]; ps.trials++; ps.correct++; ps.combo++; ps.maxCombo = Math.max(ps.maxCombo, ps.combo);
    ps.consecRight++; ps.consecWrong = 0; if (rt != null) ps.rts.push(rt);
    if (ps.consecRight >= 8 && !opt.noAdapt) { ps.tempLv = Math.min(ps.tempLv + 1, 2); ps.consecRight = 0; }
    let pts = (opt.base ?? 100) + Math.min(ps.combo, 20) * 10 + (rt != null ? Math.max(0, Math.round((2.5 - rt) * 40)) : 0);
    if (ps.fever > 0) pts *= 2; ps.score += pts; if (this.coop) this.addTeam(pts);
    Sound.pop(Math.min(ps.combo, 10)); FX.burst(x, y, [this.players[i].color, COLORS.sun, '#fff', COLORS.berry], 26);
    FX.text('+' + pts, x, y - 40, this.players[i].color, 44);
    if (ps.combo === 5) { FX.text(Narr.word('combo5', 'GOOD!'), x, y - 100, Narr.P.color || COLORS.leaf, 64, 1.2); Narr.flavor('combo5'); }
    else if (ps.combo === 10) { FX.text(Narr.word('combo10', 'GREAT!'), x, y - 100, PAL.gold2, 72, 1.3); Sound.cheer(); Narr.flavor('combo10'); }
    else if (ps.combo % 15 !== 0) Narr.flavor('nice', null, 0.12);
    if (ps.combo > 0 && ps.combo % 15 === 0) this.startFever(i);
    if (this.coop && this.players.length === 2) {
      const o = this.ps[1 - i];
      if (this.t - o.lastCorrectT < 1.0 && !opt.noHarmony) { this.team.harmony++; this.addTeam(60); ps.score += 30; o.score += 30; FX.showBanner('하모니!', '#F5C9E2', '둘이 동시에 성공', 1.1); Sound.harp(); Narr.flavor('harmony'); o.lastCorrectT = -9; ps.lastCorrectT = -9; return; }
    }
    ps.lastCorrectT = this.t;
  }
  wrong(i, x, y, kind = 'commission', msg) {
    const ps = this.ps[i]; ps.trials++; ps[kind]++; ps.combo = 0; ps.consecWrong++; ps.consecRight = 0;
    Sound.soft(); Narr.flavor('oops', null, 0.35); if (x != null) FX.text(msg || Narr.word('oops', '괜찮아요!'), x, y - 30, PAL.ivory2, 36, 1);
    if (ps.consecWrong >= 3) { ps.tempLv = Math.max(ps.tempLv - 1, -2); ps.consecWrong = 0; this.hint?.(i); Narr.flavor('encourage'); }
  }
  startFever(i) { this.ps[i].fever = 8; FX.showBanner('피버 타임!', '#F5C9E2', '8초 동안 점수 2배', 1.6); FX.rain(OBANG.concat(NACRE), 50); Sound.setTempo(150); Sound.fanfare(); Narr.say('fever'); }
  addTeam(p) {
    this.team.score += p;
    if (this.team.score >= this.team.goal) { this.team.score -= this.team.goal; this.team.stars++; FX.showBanner('팀 목표 달성!', COLORS.leaf, '팀 별 +1', 1.6); Sound.fanfare(); Narr.flavor('teamGoal'); FX.rain([COLORS.leaf, COLORS.sun, '#fff'], 40); }
  }
  drawScene(g, t) { Scenes[this.meta.scene](g, View.W, View.H, t, this.crowd); }
  drawFeverTint(g, t) {
    this.ps.forEach((ps, i) => {
      if (ps.fever <= 0) return; const x0 = this.split ? (i ? View.W / 2 : 0) : 0, w = this.split ? View.W / 2 : View.W;
      const gr = g.createLinearGradient(x0, 0, x0 + w, View.H); const h = (t * 40) % 360;
      gr.addColorStop(0, `hsla(${h},90%,65%,0.16)`); gr.addColorStop(1, `hsla(${(h + 120) % 360},90%,65%,0.16)`);
      g.fillStyle = gr; g.fillRect(x0, 0, w, View.H);
    });
  }
  drawHud(g) {
    const W = View.W, names = this.ctx.names;
    const panel = (i, x, align) => {
      const ps = this.ps[i], P = this.players[i], act = this.isActive(i);
      const w = Math.min(330, W * 0.27), h = 104, x0 = align === 'left' ? x : x - w, y0 = 26;
      g.save(); g.globalAlpha = act ? 1 : 0.5;
      lacquerPanel(g, x0, y0, w, h, 18, 0.88);
      g.fillStyle = P.color; roundRect(g, x0 + 18, y0, w - 36, 4, 2); g.fill();
      plainText(g, (this.players.length > 1 ? (i ? '2P · ' : '1P · ') : '') + who(names[i]), x0 + 20, y0 + 30, 20, P.color, 'left', 700);
      plainText(g, `${this.lv(i)}단계`, x0 + w - 20, y0 + 30, 17, PAL.gold2, 'right', 600);
      g.font = `800 44px ${SERIF}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = PAL.ivory; g.fillText(ps.score.toLocaleString(), x0 + 18, y0 + 72);
      if (ps.combo >= 2) { plainText(g, `콤보 ${ps.combo}`, x0 + w - 20, y0 + 74, 22, ps.fever > 0 ? '#F5C9E2' : PAL.gold2, 'right', 700); }
      if (ps.fever > 0) { g.fillStyle = nacreStroke(g, x0, 0, x0 + w, 0); roundRect(g, x0 + 18, y0 + h - 8, (w - 36) * clamp(ps.fever / 8, 0, 1), 4, 2); g.fill(); }
      g.restore();
      if (this.ctx.mode === 'relay' && !act) outlineText(g, '박수로 응원해 주세요', x0 + w / 2, y0 + h + 26, 22, P.color);
    };
    panel(0, 26, 'left'); if (this.players.length > 1) panel(1, W - 26, 'right');
    // 혼자일 때 오른쪽 위: 코스 진행 · 이 게임이 기르는 힘 · 다음 장소
    const se = App.session;
    if (this.players.length === 1 && se) {
      const gs = se.stages.filter(x => x.kind === 'game'), k = gs.indexOf(se.stages[se.idx]), nx = gs[k + 1], C = CATS[GAME_CAT[this.id]];
      const w = Math.min(330, W * 0.27), h = 104, x0 = W - 26 - w, y0 = 26;
      lacquerPanel(g, x0, y0, w, h, 18, 0.88); g.fillStyle = C ? C.c : PAL.gold; roundRect(g, x0 + 18, y0, w - 36, 4, 2); g.fill();
      plainText(g, gs.length > 1 ? `코스 ${k + 1} / ${gs.length}` : '한 판 놀이', x0 + 20, y0 + 30, 20, PAL.gold2, 'left', 700);
      if (C) { g.fillStyle = C.c; g.beginPath(); g.arc(x0 + w - 104, y0 + 30, 6, 0, 7); g.fill(); plainText(g, C.n, x0 + w - 20, y0 + 30, 17, C.c, 'right', 700); }
      plainText(g, nx ? `다음 · ${GAMES[nx.id].short}` : (se.stages.some(x => x.kind === 'cooldown') ? '다음 · 노을 스트레칭' : '마지막 판이에요'), x0 + 20, y0 + 72, 22, PAL.ivory, 'left', 700);
      for (let j = 0; j < gs.length && gs.length > 1; j++) { g.beginPath(); g.arc(x0 + w - 24 - (gs.length - 1 - j) * 18, y0 + 72, 6, 0, 7); g.fillStyle = j < k ? '#7FE0A8' : j === k ? PAL.gold2 : 'rgba(244,236,221,.25)'; g.fill(); }
    }
    // 남은 시간: 금 테 둥근 패
    const tl = Math.ceil(this.timeLeft()), mm = Math.floor(tl / 60), ss = String(tl % 60).padStart(2, '0');
    const cx = W / 2, cy = 74, R = 46, frac = clamp(this.timeLeft() / this.duration, 0, 1);
    g.save(); g.shadowColor = 'rgba(4,6,18,0.5)'; g.shadowBlur = 16; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fillStyle = PAL.lacquer2; g.fill(); g.restore();
    g.beginPath(); g.arc(cx, cy, R - 4, 0, 7); g.lineWidth = 5; g.strokeStyle = 'rgba(156,151,184,0.25)'; g.stroke();
    g.beginPath(); g.arc(cx, cy, R - 4, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); g.lineWidth = 5; g.strokeStyle = this.bossOn ? COLORS.berry : PAL.gold; g.lineCap = 'round'; g.stroke(); g.lineCap = 'butt';
    g.font = `800 28px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = PAL.ivory; g.fillText(`${mm}:${ss}`, cx, cy + 1);
    if (this.bossOn) outlineText(g, '보스', cx, cy + R + 18, 20, COLORS.berry);
    plainText(g, this.meta.name, cx, cy + R + (this.bossOn ? 42 : 20), 17, PAL.ivory2, 'center', 600);
    if (this.coop && this.players.length === 2) {
      const gw = Math.min(380, W * 0.3), gx = W / 2 - gw / 2, gy = cy + R + 40;
      g.fillStyle = 'rgba(10,13,28,0.7)'; roundRect(g, gx, gy, gw, 12, 6); g.fill();
      g.fillStyle = nacreStroke(g, gx, 0, gx + gw, 0); roundRect(g, gx, gy, Math.max(12, gw * clamp(this.team.score / this.team.goal, 0, 1)), 12, 6); g.fill();
      outlineText(g, `팀 게이지 · 팀 별 ${this.team.stars}`, W / 2, gy + 30, 18, PAL.ivory2, 'center', 600);
    }
    if (this.split) { g.save(); const gr = nacreStroke(g, 0, 150, 0, View.H); g.strokeStyle = gr; g.globalAlpha = 0.7; g.lineWidth = 2; g.setLineDash([2, 10]); g.lineCap = 'round'; g.beginPath(); g.moveTo(W / 2, 190); g.lineTo(W / 2, View.H - 20); g.stroke(); g.restore(); }
  }
  drawPlayers(g, t) {
    this.players.forEach((P, i) => { drawAura(g, P, P.color, this.ps[i].combo >= 5 ? 1 : 0, this.ps[i].fever > 0); });
  }
  drawHands(g, t) { this.players.forEach((P, i) => { if (this.isActive(i) || this.ctx.mode === 'relay') drawHands(g, P, P.color, t); }); }
  // 손이 원 안에 머무르면 진행도(0~1) 반환
  handOver(i, x, y, r) {
    const P = this.players[i]; if (!P.present) return null; let best = null;
    for (const H of P.hands) { if (!H.ok || H.px == null) continue; const d = Math.hypot(H.px - x, H.py - y); if (d < r && (!best || d < best.d)) best = { d, H }; }
    return best ? best.H : null;
  }
  result() {
    return this.ps.map((ps, i) => {
      const acc = ps.trials ? ps.correct / ps.trials : null;
      const meanRT = ps.rts.length ? ps.rts.reduce((a, b) => a + b, 0) / ps.rts.length : null;
      let stars = 0; if (ps.trials >= 4 && acc != null) stars = acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.55 ? 1 : 0;
      if (this.id === 'dance') stars = ps.maxSpan >= 6 ? 3 : ps.maxSpan >= 4 ? 2 : ps.maxSpan >= 2 ? 1 : 0;
      let newLevel = ps.startLevel; if (!Store.settings.fixedLevel && acc != null && ps.trials >= 4) { if (acc >= 0.8) newLevel++; else if (acc < 0.5) newLevel--; }
      newLevel = clamp(newLevel, 1, 10);
      return { game: this.id, played: this.isActive(i), level: ps.startLevel, newLevel, accuracy: acc, meanRT, trials: ps.trials, correct: ps.correct, commission: ps.commission, omission: ps.omission, score: ps.score, maxCombo: ps.maxCombo, stars, maxSpan: ps.maxSpan || null, fruits: ps.fruits, constellations: ps.constellations, sync: ps.extra.sync ?? null };
    });
  }
}

/* ---------- ① 무지개 풍선 시장 (스트룹) ---------- */
class BalloonGame extends BaseGame {
  constructor(ctx) { super('balloon', ctx); this.bossText = '풍선이 움직여요!'; this.st = this.ps.map(() => ({ trial: null, wait: 0.8 })); this.twin = null; this.nextTwin = 18; this.golds = []; }
  params(i) { const lv = this.lv(i); return { n: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5][lv - 1], incong: 0.4 + lv * 0.045, timeout: Math.max(2.8, 7.2 - lv * 0.45), drift: (lv >= 6 ? (lv - 5) * 14 : 0) + (this.bossOn ? 55 : 0) }; }
  newTrial(i) {
    const p = this.params(i), A = this.areaFor(i);
    const ink = randi(0, 4); let word = ink;
    if (Math.random() < p.incong) do { word = randi(0, 4); } while (word === ink);
    let set = new Set([ink]); if (word !== ink) set.add(word);
    while (set.size < p.n) set.add(randi(0, 4));
    const cols = shuffle([...set]);
    const r = clamp(Math.min(A.w, A.h) * 0.12, 46, 86);
    const size = Math.min(110, A.w * 0.22), top = A.y + size * 1.25 + 4; // 위쪽은 글자 자리
    const bottom = Math.max(top + r * 2.2, A.y + A.h + r * 0.4 - r * 1.6);
    const balloons = [];
    for (const c of cols) {
      let x, y, k = 0;
      do { x = rand(A.x + r, A.x + A.w - r); y = rand(top + r, bottom); k++; } while (k < 60 && balloons.some(b => Math.hypot(b.x - x, b.y - y) < r * 2.5));
      balloons.push({ x, y, r, c, vx: rand(-1, 1), vy: rand(-1, 1), alive: true, dw: 0 });
    }
    this.st[i].trial = { ink, word, balloons, t0: this.t, timeout: p.timeout, drift: p.drift, A, top, bottom, size };
    if (Math.random() < (this.bossOn ? 0.25 : 0.1)) this.golds.push({ i, x: rand(A.x + r, A.x + A.w - r), y: A.y + A.h + r, r: r * 0.85, vy: -rand(50, 80), dw: 0 });
  }
  hint(i) { const tr = this.st[i].trial; if (tr) FX.text(`글자 색: ${STROOP[tr.ink].n}`, tr.A.x + tr.A.w / 2, tr.A.y + 120, STROOP[tr.ink].c, 40, 2); }
  step(dt) {
    this.activeIdx().forEach(i => {
      const S = this.st[i];
      if (!S.trial) { S.wait -= dt; if (S.wait <= 0) this.newTrial(i); return; }
      const tr = S.trial;
      for (const b of tr.balloons) {
        if (!b.alive) continue;
        if (tr.drift) { b.x += b.vx * tr.drift * dt; b.y += b.vy * tr.drift * dt * 0.6; if (b.x < tr.A.x + b.r || b.x > tr.A.x + tr.A.w - b.r) b.vx *= -1; if (b.y < tr.top + b.r || b.y > tr.bottom) b.vy *= -1; }
        const H = this.handOver(i, b.x, b.y, b.r * 1.05);
        if (H) { b.dw += dt; H.dwell = b.dw / 0.15; } else b.dw = 0;
        if (b.dw >= 0.15) {
          b.alive = false; if (H) H.dwell = 0;
          if (b.c === tr.ink) { this.correct(i, b.x, b.y, this.t - tr.t0); S.trial = null; S.wait = 0.55; FX.burst(b.x, b.y, [STROOP[b.c].c, '#fff'], 22); }
          else { this.wrong(i, b.x, b.y, 'commission', b.c === tr.word ? '글자 말고 색깔!' : null); FX.burst(b.x, b.y, [STROOP[b.c].c], 10); FX.doShake(6); }
          return;
        }
      }
      if (S.trial && this.t - tr.t0 > tr.timeout) { this.wrong(i, null, null, 'omission'); FX.text('시간이 지났어요', tr.A.x + tr.A.w / 2, tr.A.y + tr.A.h / 2, PAL.ivory2, 36); S.trial = null; S.wait = 0.5; }
    });
    // 황금 풍선(보너스)
    for (const gb of this.golds) {
      gb.y += gb.vy * dt; const H = this.handOver(gb.i, gb.x, gb.y, gb.r * 1.05);
      if (H) gb.dw += dt; else gb.dw = 0;
      if (gb.dw >= 0.15) { gb.dead = true; const pts = 300; this.ps[gb.i].score += pts; if (this.coop) this.addTeam(pts); FX.burst(gb.x, gb.y, ['#FFD23F', '#FFF6C0', '#fff'], 40); FX.text('황금 풍선 +300', gb.x, gb.y - 40, PAL.gold2, 46); Sound.coin(); Sound.cheer(); }
      if (gb.y < -gb.r * 3) gb.dead = true;
    }
    this.golds = this.golds.filter(g => !g.dead);
    // 협동: 쌍둥이 풍선(둘이 동시에 터치)
    if (this.coop && this.players.length === 2) {
      this.nextTwin -= dt;
      if (!this.twin && this.nextTwin <= 0) { this.twin = { x: View.W / 2, y: View.H * 0.32, r: Math.min(View.W, View.H) * 0.11, born: this.t, hit: [-9, -9] }; Narr.say('twin'); }
      if (this.twin) {
        const tw = this.twin;
        [0, 1].forEach(i => { if (this.handOver(i, tw.x + (i ? tw.r * 0.5 : -tw.r * 0.5), tw.y, tw.r * 1.1)) tw.hit[i] = this.t; });
        if (Math.abs(tw.hit[0] - tw.hit[1]) < 1.5 && tw.hit[0] > 0 && tw.hit[1] > 0) {
          FX.burst(tw.x, tw.y, ['#E8456E', '#FF8A1F', '#FFC83A', '#38B07A', '#2F7CF6', PAL.plum], 70, 'mix', 1.3); FX.showBanner('쌍둥이 풍선 성공!', PAL.gold2, '팀 +500'); this.addTeam(500); this.team.harmony++; Sound.fanfare(); FX.doShake(10);
          this.twin = null; this.nextTwin = 25;
        } else if (this.t - tw.born > 9) { this.twin = null; this.nextTwin = 20; }
      }
    }
  }
  draw(g, t) {
    this.activeIdx().forEach(i => {
      const tr = this.st[i].trial; if (!tr) return;
      for (const b of tr.balloons) if (b.alive) balloon(g, b.x, b.y, b.r, STROOP[b.c].c, t, { shape: Store.settings.shapes ? STROOP[b.c].s : null });
      const cx = tr.A.x + tr.A.w / 2, size = tr.size, y0 = tr.A.y - 8;
      g.save(); g.shadowColor = 'rgba(4,6,18,0.45)'; g.shadowBlur = 16; g.shadowOffsetY = 6; roundRect(g, cx - size * 1.6, y0, size * 3.2, size * 1.2, 20); g.fillStyle = '#F4ECDD'; g.fill(); g.restore();
      g.lineWidth = 2; g.strokeStyle = PAL.gold; roundRect(g, cx - size * 1.6 + 7, y0 + 7, size * 3.2 - 14, size * 1.2 - 14, 14); g.stroke();
      plainText(g, STROOP[tr.word].n, cx, y0 + size * 0.6, size * 0.9, STROOP[tr.ink].c, 'center', 800, SERIF);
      if (Store.settings.shapes) shapeMark(g, STROOP[tr.ink].s, cx + size * 1.32, y0 + size * 0.3, size * 0.16, STROOP[tr.ink].c);
      const left = clamp(1 - (this.t - tr.t0) / tr.timeout, 0, 1);
      roundRect(g, cx - size * 1.4, y0 + size * 1.2 - 14, size * 2.8 * left, 7, 3); g.fillStyle = left < 0.3 ? COLORS.berry : COLORS.leaf; g.fill();
    });
    for (const gb of this.golds) balloon(g, gb.x, gb.y, gb.r, '#FFC83A', t, { gold: true, shape: 'star' });
    if (this.twin) {
      const tw = this.twin, gr = g.createLinearGradient(tw.x - tw.r, 0, tw.x + tw.r, 0);
      ['#E8456E', '#FF8A1F', '#FFC83A', '#38B07A', '#2F7CF6', PAL.plum].forEach((c, k) => gr.addColorStop(k / 5, c));
      balloon(g, tw.x, tw.y, tw.r, gr, t); outlineText(g, '둘이 같이!', tw.x, tw.y - tw.r * 1.35, 40, PAL.plum);
    }
  }
  drawGuide(g) {
    const s = Math.min(30, View.W * 0.022);
    outlineText(g, '글자의 색깔과 같은 풍선을 터뜨려요', View.W / 2, View.H - 100, s, COLORS.ink);
  }
}

/* ---------- ② 흥부자 댄스 무대 (동작 순서 기억) ---------- */
class DanceGame extends BaseGame {
  // 관리자 설정 '댄스 따라 하기 시간'(보통 1 · 넉넉하게 1.5 · 아주 넉넉하게 2)
  get ease() { return clamp(+(Store.settings.danceEase ?? 1.5) || 1.5, 1, 2.5); }
  get moveLimit() { return 8 * this.ease * (this.bossOn ? 0.85 : 1); }
  constructor(ctx) {
    super('dance', ctx); this.bossText = '한 동작 더 길게!';
    // 앉아서: 의자에서 할 수 있는 동작만(스쿼트 없음, 앉은 무릎 들기) / 서서: 스쿼트 포함
    this.pool = ctx.posture === 'seat' ? ['up', 'left', 'right', 'tee', 'clap', 'cross', 'knee'] : ['up', 'left', 'right', 'tee', 'clap', 'squat'];
    this.st = this.ps.map(() => ({ phase: 'wait', wait: 1.5, seq: [], idx: 0, showT: 0, t0: 0, wrongHold: 0, fails: 0, doneAt: [] }));
    this.shared = this.coop && this.players.length === 2;
    this.syncHits = 0; this.syncMoves = 0;
  }
  spanFor(i) { return clamp(2 + Math.floor((this.lv(i) - 1) * 5 / 9) + (this.bossOn ? 1 : 0), 2, 8); }
  makeSeq(n) { const s = []; while (s.length < n) { const m = pick(this.pool); if (m !== s[s.length - 1]) s.push(m); } return s; }
  begin(idxs) {
    const n = Math.min(...idxs.map(i => this.spanFor(i)));
    const seq = this.makeSeq(this.shared ? n : this.spanFor(idxs[0]));
    const showDur = Math.max(1.0, 1.7 - this.lv(idxs[0]) * 0.07) * (this.bossOn ? 0.85 : 1);
    idxs.forEach(i => Object.assign(this.st[i], { phase: 'demo', seq: this.shared ? seq : this.makeSeq(this.spanFor(i)), idx: 0, showT: 0, showDur, t0: this.t, wrongHold: 0, doneAt: [] }));
    if (idxs[0] === this.activeIdx()[0] || this.shared) Narr.say('danceWatch', { n: this.st[idxs[0]].seq.length });
  }
  hint(i) { }
  step(dt) {
    const act = this.activeIdx();
    if (this.shared) {
      const allWait = act.every(i => this.st[i].phase === 'wait');
      if (allWait) { this.st[0].wait -= dt; if (this.st[0].wait <= 0) this.begin(act); }
    }
    act.forEach(i => {
      const S = this.st[i], P = this.players[i], A = this.areaFor(i);
      if (S.phase === 'wait' && !this.shared) { S.wait -= dt; if (S.wait <= 0) this.begin([i]); return; }
      if (S.phase === 'demo') {
        const k = Math.floor((this.t - S.t0) / S.showDur);
        if (k !== S.showIdx) { S.showIdx = k; if (k < S.seq.length) { Sound.beat(k === 0); if (i === act[0]) Narr.plain(MOVES[S.seq[k]].name); } }
        // 시범이 끝나면 바로 판정하지 않고 '준비' 시간을 줌(팔을 내리고 숨 고르기)
        if (k >= S.seq.length) { S.phase = 'ready'; S.t0 = this.t; S.idx = 0; if (i === act[0]) Narr.say('danceGo'); Sound.coin(); }
        return;
      }
      if (S.phase === 'ready') {
        const ready = 2.2 * this.ease, left = ready - (this.t - S.t0), sec = Math.ceil(left);
        if (sec !== S.cd && sec > 0 && sec <= 3) { S.cd = sec; Sound.tick(); }
        if (left <= 0) { S.phase = 'go'; S.t0 = this.t; S.moveT = this.t; S.idx = 0; S.cd = null; Sound.beat(true); }
        return;
      }
      if (S.phase === 'go') {
        const want = S.seq[S.idx];
        const tx = A.x + A.w / 2, ty = A.y + A.h * 0.35;
        if (heldFor(P, want, this.t) >= 0.3) {
          const rt = this.t - S.moveT;
          this.correct(i, tx, ty, rt, { noAdapt: true, noHarmony: this.shared });
          FX.text(rt < 1.8 ? 'PERFECT!' : 'GOOD!', tx, ty - 90, rt < 1.8 ? PAL.gold2 : COLORS.leaf, 58);
          S.doneAt.push(this.t); S.idx++; S.moveT = this.t; S.wrongHold = 0; this.crowd++;
          if (this.shared) { const o = this.st[1 - i]; if (o.doneAt.length >= S.idx) { this.syncMoves++; if (Math.abs(o.doneAt[S.idx - 1] - this.t) < 1.0) { this.syncHits++; FX.text('척척!', View.W / 2, View.H * 0.5, PAL.plum, 52); } } }
          if (S.idx >= S.seq.length) this.finish(i, true);
          return;
        }
        // 동작을 바꾸는 사이(처음 1.5초)는 다른 자세여도 봐 줌. 틀린 자세를 오래 유지할 때만 실패
        const g2 = P.gesture, grace = this.t - S.moveT < 1.5 * this.ease;
        if (!grace && g2 !== 'none' && g2 !== want && g2 !== S.seq[S.idx - 1] && this.pool.includes(g2)) S.wrongHold += dt; else S.wrongHold = Math.max(0, S.wrongHold - dt);
        if (S.wrongHold > 1.8 * this.ease) { this.wrong(i, tx, ty, 'commission', `${MOVES[want].name} 차례였어요`); this.finish(i, false); return; }
        if (this.t - S.moveT > this.moveLimit) { this.wrong(i, tx, ty, 'omission', `${MOVES[want].name} 차례였어요`); this.finish(i, false); }
      }
    });
  }
  finish(i, ok) {
    const S = this.st[i], ps = this.ps[i];
    S.phase = 'wait'; S.wait = 1.6 + this.ease; S.lastOk = ok; S.lastT = this.t;
    if (ok) {
      ps.maxSpan = Math.max(ps.maxSpan, S.seq.length); S.fails = 0;
      if (!Store.settings.fixedLevel) ps.tempLv = Math.min(ps.tempLv + 1, 3);
      Sound.cheer(); FX.showBanner('공연 성공!', PAL.gold2, `${S.seq.length}동작 완성`, 1.3); Narr.say('danceDone'); window.Avatar?.celebrate?.(this.shared ? 'main' : 'p' + i, 1.6);
      if (this.shared && this.st[1 - i].phase === 'wait' && this.st[1 - i].lastOk && this.t - this.st[1 - i].lastT < 8) { FX.showBanner('합동 공연 성공!', PAL.gold2, '팀 +400', 1.5); this.addTeam(400); this.team.harmony++; Sound.fanfare(); }
    } else {
      Narr.flavor('danceFail'); S.fails++; if (S.fails >= 2 && !Store.settings.fixedLevel) { ps.tempLv = Math.max(ps.tempLv - 1, -2); S.fails = 0; }
    }
    if (this.shared) this.st[0].wait = 1.8 + this.ease;
    ps.extra.sync = this.syncMoves ? this.syncHits / this.syncMoves : null;
  }
  draw(g, t) {
    const act = this.activeIdx();
    act.forEach(i => {
      const S = this.st[i];
      const halfW = this.split ? View.W / 2 : View.W, cx = this.split ? (i ? View.W * 0.75 : View.W * 0.25) : View.W / 2;
      // 순서 칸(각자 자기 쪽 아래): 번호 · 동작 그림 · 동작 이름. 아직 안 나온/외워서 할 칸은 '?'
      const n = S.seq.length; if (!n) return;
      const seated = this.ctx.posture === 'seat', gap = 12;
      const cw = Math.min(150, (halfW * 0.86) / n - gap), ch = Math.min(168, cw * 1.18), y = View.H - ch - 96;
      const x0 = cx - (n * (cw + gap) - gap) / 2;
      if (S.phase === 'demo') plainText(g, '동작 순서 — 잘 보고 외워요', cx, y - 16, 19, PAL.ivory2, 'center', 600);
      for (let k = 0; k < n; k++) {
        const x = x0 + k * (cw + gap), mv = S.seq[k];
        const shown = S.phase === 'demo' ? k <= S.showIdx : k < S.idx;
        const now = (S.phase === 'demo' && k === S.showIdx) || (S.phase === 'go' && k === S.idx);
        const done = S.phase === 'go' && k < S.idx;
        lacquerPanel(g, x, y, cw, ch, 16, shown || now ? 0.94 : 0.7, now ? PAL.gold2 : done ? '#7FE0A8' : undefined);
        // 번호
        g.fillStyle = now ? PAL.gold2 : 'rgba(244,236,221,0.18)'; g.beginPath(); g.arc(x + 18, y + 18, 13, 0, 7); g.fill();
        plainText(g, String(k + 1), x + 18, y + 19, 15, now ? '#1A1530' : PAL.ivory, 'center', 800);
        const nameH = cw >= 96 ? 30 : 0;
        if (shown) {
          drawPicto(g, x + cw / 2, y + ch - nameH - 10, (ch - nameH - 30) * 0.98, mv, done ? '#7FE0A8' : PAL.gold2, seated);
          if (nameH) { const nm = MOVES[mv].name, fs = Math.min(18, (cw - 12) / Math.max(nm.length, 3) * 1.6); plainText(g, nm, x + cw / 2, y + ch - 17, fs, PAL.ivory, 'center', 700); }
          if (done) { g.fillStyle = '#2E9E6A'; g.beginPath(); g.arc(x + cw - 18, y + 18, 13, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + cw - 24, y + 18); g.lineTo(x + cw - 19, y + 23); g.lineTo(x + cw - 11, y + 13); g.stroke(); }
        } else {
          plainText(g, '?', x + cw / 2, y + ch / 2 - (nameH ? 6 : 0), Math.min(cw, ch) * 0.48, now ? PAL.gold2 : 'rgba(244,236,221,0.45)', 'center', 700, SERIF);
          if (nameH && now) plainText(g, '지금 차례', x + cw / 2, y + ch - 17, 16, PAL.gold2, 'center', 700);
        }
      }
      if (S.phase === 'demo') {
        if (this.shared && i !== act[0]) return; // 함께 추는 춤은 시범을 가운데 한 번만
        const k = Math.min(S.showIdx ?? 0, n - 1);
        const fx = this.shared ? View.W / 2 : (this.split ? cx : View.W * 0.22), hp = Math.min(View.H * (this.split && !this.shared ? 0.5 : 0.58), y - 18 - 110);
        drawStageFigure(g, fx, y - 18, hp, S.seq[k], t, this.shared ? 'main' : 'p' + i, '');
        outlineText(g, `${k + 1}. ${MOVES[S.seq[k]].name}`, cx, y - 54, Math.min(40, halfW * 0.05), PAL.gold2);
      } else if (S.phase === 'ready') {
        const left = Math.max(1, Math.ceil(2.2 * this.ease - (this.t - S.t0)));
        outlineText(g, '주인공 차례! 팔을 내리고 준비해요', cx, y - 96, Math.min(40, halfW * 0.05), PAL.gold2);
        goldText(g, String(left), cx, y - 190, Math.min(120, halfW * 0.14));
      } else if (S.phase === 'go') {
        outlineText(g, `${S.idx + 1}번째 동작은?`, cx, y - 30, Math.min(38, halfW * 0.05), PAL.gold2);
        // 지금 인식된 자세 + 유지 진행
        const P = this.players[i], want = S.seq[S.idx], cur = P.present ? P.gesture : null;
        const nm = cur == null ? '몸이 안 보여요' : cur === 'none' ? '차렷' : (MOVES[cur]?.name || cur);
        const ok = cur === want, hold = ok ? clamp(heldFor(P, want, this.t) / 0.3, 0, 1) : 0;
        const bw = Math.min(halfW * 0.8, 300), bx = cx - bw / 2, by = y - 118;
        lacquerPanel(g, bx, by, bw, 46, 23, 0.85, ok ? PAL.gold2 : undefined);
        plainText(g, '지금 자세', bx + 22, by + 23, 15, PAL.ivory2, 'left', 600);
        plainText(g, nm, bx + bw - 22, by + 24, 20, ok ? PAL.gold2 : (cur == null ? COLORS.berry : PAL.ivory), 'right', 700);
        if (hold > 0) { g.fillStyle = nacreStroke(g, bx, 0, bx + bw, 0); roundRect(g, bx + 12, by + 40, (bw - 24) * hold, 4, 2); g.fill(); }
        // 이 동작에 남은 시간(넉넉하게 보여 줌)
        const tl = clamp(1 - (this.t - S.moveT) / this.moveLimit, 0, 1);
        g.fillStyle = 'rgba(244,236,221,.12)'; roundRect(g, bx, by + 52, bw, 6, 3); g.fill();
        g.fillStyle = tl < 0.25 ? COLORS.berry : COLORS.leaf; roundRect(g, bx, by + 52, bw * tl, 6, 3); g.fill();
        if (want === 'knee' && P.present && P.kneesSeen) drawKneeMeter(g, cx, by - 34, Math.min(bw, 300), P.kneeLevel || 0);
        if (want === 'knee' && P.present && P.kneesSeen === false) outlineText(g, '무릎이 화면에 보이게 의자를 조금 뒤로 빼 주세요', cx, by - 30, Math.min(26, halfW * 0.032), COLORS.berry);
      } else if (S.phase === 'wait' && S.lastT && this.t - S.lastT < 1.5) {
        if (S.lastOk && (!this.shared || i === act[0])) { const fx = this.shared ? View.W / 2 : (this.split ? cx : View.W * 0.22); drawStageFigure(g, fx, y - 18, Math.min(View.H * (this.split && !this.shared ? 0.5 : 0.58), y - 18 - 110), 'none', t, this.shared ? 'main' : 'p' + i, '짝짝짝!'); }
        else if (!S.lastOk) outlineText(g, '다음엔 할 수 있어요', cx, View.H * 0.5, Math.min(54, halfW * 0.07), PAL.ivory2);
      }
    });
  }
  drawGuide(g) { }
}

/* ---------- ③ 밤하늘 별자리 잇기 (길 만들기) ---------- */
class StarsGame extends BaseGame {
  constructor(ctx) { super('stars', ctx); this.bossText = '별이 더 많아져요!'; this.st = this.ps.map(() => ({ board: null, wait: 0.8, reveal: 0 })); this.cIdx = randi(0, CONSTELLATIONS.length - 1); }
  newBoard(i) {
    const lv = this.lv(i), A = this.areaFor(i, 1.45);
    let n = [5, 6, 7, 8, 9, 10, 10, 11, 12, 12][lv - 1] + (this.bossOn ? 2 : 0);
    const alt = lv >= 6;
    const labels = []; for (let k = 0; k < n; k++) labels.push(alt ? (k % 2 ? KLETTERS[(k - 1) / 2 % KLETTERS.length] : String(k / 2 + 1)) : String(k + 1));
    const r = clamp(Math.min(A.w, A.h) * 0.07, 34, 56), pts = [];
    for (let k = 0; k < n; k++) { let x, y, c = 0; do { x = rand(A.x + r, A.x + A.w - r); y = rand(A.y + r, A.y + A.h - r); c++; } while (c < 200 && pts.some(p => Math.hypot(p.x - x, p.y - y) < r * 2.6)); pts.push({ x, y, label: labels[k], done: false, dw: 0, bad: 0 }); }
    this.st[i].board = { pts, next: 0, t0: this.t, lastT: this.t, name: CONSTELLATIONS[this.cIdx++ % CONSTELLATIONS.length], hinted: false, r };
  }
  hint(i) { const b = this.st[i].board; if (b) b.hintT = this.t; }
  step(dt) {
    this.activeIdx().forEach(i => {
      const S = this.st[i];
      if (S.reveal > 0) { S.reveal -= dt; if (S.reveal <= 0) { S.board = null; S.wait = 0.4; } return; }
      if (!S.board) { S.wait -= dt; if (S.wait <= 0) this.newBoard(i); return; }
      const B = S.board;
      B.pts.forEach((p, k) => {
        if (p.done) return; const H = this.handOver(i, p.x, p.y, B.r * 1.15);
        if (H) { p.dw += dt; if (k === B.next) H.dwell = p.dw / 0.25; } else { p.dw = 0; p.bad = 0; }
        if (k === B.next && p.dw >= 0.25) {
          p.done = true; this.correct(i, p.x, p.y, this.t - B.lastT, { base: 80 }); B.lastT = this.t; B.next++; B.hinted = false;
          Sound.tone(Sound.scale[Math.min(B.next, 10)], 0.4, 'sine', 0.2);
          if (B.next >= B.pts.length) { const bonus = Math.max(0, Math.round(300 - (this.t - B.t0) * 8)); this.ps[i].score += bonus; if (this.coop) this.addTeam(bonus); this.ps[i].constellations.push(B.name); Narr.say('constellation', { star: B.name }); FX.showBanner(`${B.name} 완성!`, PAL.gold2, bonus ? `시간 보너스 +${bonus}` : '', 1.8); Sound.harp(); S.reveal = 2.2; FX.rain(['#FFF6C0', '#fff', '#9EC5FF'], 30); }
        } else if (k !== B.next && p.dw >= 0.5 && !p.bad) { p.bad = 1; this.wrong(i, p.x, p.y, 'commission', `다음은 ${B.pts[B.next].label}`); }
      });
      if (S.board && !B.hinted && this.t - B.lastT > 8) { B.hinted = true; B.hintT = this.t; this.ps[i].omission++; this.ps[i].trials++; this.ps[i].combo = 0; Narr.plain(`${B.pts[B.next].label}번 별을 찾아요`); }
    });
  }
  draw(g, t) {
    this.activeIdx().forEach(i => {
      const B = this.st[i].board; if (!B) return; const rev = this.st[i].reveal > 0;
      g.lineCap = 'round';
      for (let k = 1; k < B.next; k++) { const a = B.pts[k - 1], b = B.pts[k]; g.strokeStyle = rev ? `rgba(255,214,90,${0.6 + 0.4 * Math.sin(t * 8)})` : 'rgba(255,224,130,0.95)'; g.lineWidth = rev ? 10 : 7; g.shadowColor = '#FFD23F'; g.shadowBlur = 18; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
      g.shadowBlur = 0;
      B.pts.forEach((p, k) => {
        const isNext = k === B.next && !rev, hintPulse = B.hintT && this.t - B.hintT < 3 && isNext;
        const R = B.r * (isNext ? 1 + 0.08 * Math.sin(t * 6) : 1) * (hintPulse ? 1.25 : 1);
        g.shadowColor = p.done ? '#F3D88C' : '#CFE4FF'; g.shadowBlur = p.done ? 28 : 14;
        const sg = g.createRadialGradient(p.x, p.y - R * 0.2, 1, p.x, p.y, R); sg.addColorStop(0, '#FFFFFF'); sg.addColorStop(1, p.done ? '#E2B04A' : (p.bad ? '#F2A2AE' : '#DCE6FF'));
        star5(g, p.x, p.y, R, R * 0.5, sg);
        g.shadowBlur = 0; plainText(g, p.label, p.x, p.y + 4, R * 0.58, '#1B2044', 'center', 800, SERIF);
        if (isNext) { g.beginPath(); g.arc(p.x, p.y, R * 1.35, 0, 7); g.lineWidth = 2; g.strokeStyle = nacreStroke(g, p.x - R, p.y - R, p.x + R, p.y + R); g.stroke(); }
      });
      if (rev) { const A = B.pts.reduce((m, p) => ({ x: m.x + p.x / B.pts.length, y: m.y + p.y / B.pts.length }), { x: 0, y: 0 }); outlineText(g, B.name, A.x, Math.min(...B.pts.map(p => p.y)) - 60, 56, '#2F7CF6'); }
      if (!rev && B.next < B.pts.length) { const cx = this.split ? (i ? View.W * 0.75 : View.W * 0.25) : View.W / 2; lacquerPanel(g, cx - 92, View.H - 196, 184, 52, 26, 0.85); plainText(g, '다음 별', cx - 30, View.H - 170, 18, PAL.ivory2, 'center', 600); g.font = `800 30px ${SERIF}`; g.textAlign = 'center'; g.fillStyle = PAL.gold2; g.fillText(B.pts[B.next].label, cx + 46, View.H - 168); }
    });
  }
  drawGuide(g) { outlineText(g, '순서대로 별을 터치해 별자리를 완성해요', View.W / 2, View.H - 100, Math.min(30, View.W * 0.022), COLORS.ink); }
}

/* ---------- ④ 징검다리 OX 계산 ---------- */
function makeEquation(lv) {
  let a, b, op, ans;
  if (lv <= 2) { a = randi(1, 9); b = randi(1, 9 - Math.min(a, 8)) ; op = '+'; }
  else if (lv <= 4) { a = randi(2, 12); b = randi(2, 9); op = '+'; }
  else if (lv <= 6) { op = pick(['+', '-']); a = randi(5, 20); b = randi(2, op === '-' ? a - 1 : 15); }
  else if (lv <= 8) { op = pick(['+', '-']); a = randi(12, 60); b = randi(5, op === '-' ? a - 2 : 39); }
  else { op = pick(['×', '×', '+', '-']); if (op === '×') { a = randi(2, 9); b = randi(2, 9); } else { a = randi(20, 90); b = randi(10, op === '-' ? a - 5 : 60); } }
  ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const truth = Math.random() < 0.5; let shown = ans;
  if (!truth) { do { shown = ans + pick([-3, -2, -1, 1, 2, 3, op === '×' ? a : 10]); } while (shown < 0 || shown === ans); }
  return { text: `${a} ${op} ${b} = ${shown}`, truth };
}
class OxGame extends BaseGame {
  constructor(ctx) {
    super('ox', ctx); this.bossText = '물살이 빨라져요!';
    this.shared = this.coop && this.players.length === 2;
    this.st = this.ps.map(() => ({ q: null, wait: 1, ans: null, stone: 0, release: false, fb: null }));
    this.team.stone = 0;
  }
  timeout(i) { return Math.max(3.5, 8.5 - this.lv(i) * 0.5) * (this.bossOn ? 0.75 : 1); }
  ask(idxs) {
    const q = makeEquation(Math.min(...idxs.map(i => this.lv(i))));
    idxs.forEach(i => { const S = this.st[i]; S.q = this.shared ? q : makeEquation(this.lv(i)); S.t0 = this.t; S.ans = null; S.release = true; });
  }
  step(dt) {
    const act = this.activeIdx();
    if (this.shared) {
      const S0 = this.st[0];
      if (!S0.q) { S0.wait -= dt; if (S0.wait <= 0) this.ask(act); }
    }
    act.forEach(i => {
      const S = this.st[i], P = this.players[i];
      if (!S.q && !this.shared) { S.wait -= dt; if (S.wait <= 0) this.ask([i]); return; }
      if (!S.q || S.ans) return;
      if (S.release) { if (P.gesture !== 'up' && P.gesture !== 'cross') S.release = false; else if (this.t - S.t0 > 1.2) S.release = false; return; }
      let a = null; if (heldFor(P, 'up', this.t) >= 0.45) a = 'O'; else if (heldFor(P, 'cross', this.t) >= 0.45) a = 'X';
      const A = this.areaFor(i), cx = A.x + A.w / 2, cy = A.y + A.h * 0.4;
      if (a) {
        S.ans = a; const ok = (a === 'O') === S.q.truth; S.fb = { ok, t: this.t, a };
        if (ok) { this.correct(i, cx, cy, this.t - S.t0); if (!this.shared) this.hop(i); }
        else { this.wrong(i, cx, cy, 'commission', S.q.truth ? '맞는 식이었어요' : '틀린 식이었어요'); Sound.splash(); FX.burst(cx, View.H * 0.85, ['#7FC8FF', '#fff', '#3D8BE0'], 20, 'mix', 0.7); }
      } else if (this.t - S.t0 > this.timeout(i)) { S.ans = '-'; S.fb = { ok: false, t: this.t, a: '-' }; this.wrong(i, cx, cy, 'omission', '시간이 지났어요'); }
      if (S.ans && !this.shared) S.doneT = this.t;
    });
    // 다음 문제
    act.forEach(i => { const S = this.st[i]; if (!this.shared && S.ans && this.t - S.doneT > 0.9) { S.q = null; S.wait = 0.1; } });
    if (this.shared && this.st[0].q && act.every(i => this.st[i].ans)) {
      if (!this.st[0].resolved) {
        this.st[0].resolved = this.t;
        if (act.every(i => this.st[i].fb?.ok)) { this.hop(-1); this.team.harmony++; this.addTeam(80); FX.text('함께 한 칸!', View.W / 2, View.H * 0.62, COLORS.leaf, 50); }
      } else if (this.t - this.st[0].resolved > 1.0) { act.forEach(i => { this.st[i].q = null; }); this.st[0].resolved = 0; this.st[0].wait = 0.2; }
    }
  }
  hop(i) {
    const S = i < 0 ? this.team : this.st[i]; S.stone++;
    if (S.stone >= 5) {
      S.stone = 0; const bonus = 200;
      if (i < 0) { this.addTeam(bonus * 2); this.ps.forEach(p => p.score += bonus); } else { this.ps[i].score += bonus; if (this.coop) this.addTeam(bonus); }
      FX.showBanner('보물 상자!', PAL.gold2, `+${bonus}`, 1.4); Sound.coin(); Sound.fanfare(); Narr.flavor('treasure');
      const x = i < 0 ? View.W * 0.9 : (this.split ? (i ? View.W * 0.93 : View.W * 0.43) : View.W * 0.9); FX.burst(x, View.H * 0.78, ['#FFD23F', '#FFF6C0', PAL.gold2], 50);
    }
  }
  drawRiver(g, t, x0, x1, stone, color) {
    const y = View.H * 0.8, n = 5, step = (x1 - x0) / (n + 1);
    for (let k = 1; k <= n; k++) { const x = x0 + k * step; g.fillStyle = '#B9B2A3'; g.beginPath(); g.ellipse(x, y + 30, step * 0.32, 18, 0, 0, 7); g.fill(); g.fillStyle = '#D9D3C4'; g.beginPath(); g.ellipse(x, y + 24, step * 0.3, 14, 0, 0, 7); g.fill(); }
    // 보물 상자
    const bx = x1 - step * 0.35; g.fillStyle = '#9A5B2A'; roundRect(g, bx - 30, y - 30, 60, 40, 8); g.fill(); g.fillStyle = '#FFC83A'; g.fillRect(bx - 30, y - 14, 60, 6); g.fillRect(bx - 5, y - 30, 10, 40);
    const px = x0 + (stone === 0 ? step * 0.35 : stone * step), hop = Math.abs(Math.sin(t * 4)) * 8;
    drawFairy(g, px, y - 70 - hop, 16, 'none', t, color);
  }
  draw(g, t) {
    const act = this.activeIdx();
    if (this.shared) this.drawRiver(g, t, View.W * 0.05, View.W * 0.95, this.team.stone, PAL.plum);
    act.forEach(i => {
      const S = this.st[i], A = this.areaFor(i);
      const x0 = this.split ? (i ? View.W / 2 + 20 : 20) : View.W * 0.05, x1 = this.split ? (i ? View.W - 20 : View.W / 2 - 20) : View.W * 0.95;
      if (!this.shared) this.drawRiver(g, t, x0, x1, S.stone, this.players[i].color);
      if (!S.q) return; if (this.shared && i === 1) return;
      const cx = this.shared ? View.W / 2 : (x0 + x1) / 2, w = Math.min((x1 - x0) * 0.9, 620), y = View.H * 0.8 - 150;
      // 나무 팻말
      g.fillStyle = '#8A5A33'; g.fillRect(cx - 8, y + 90, 16, 60);
      g.save(); g.shadowColor = 'rgba(4,6,18,0.45)'; g.shadowBlur = 16; g.shadowOffsetY = 6; roundRect(g, cx - w / 2, y, w, 100, 16); g.fillStyle = '#EAD7B0'; g.fill(); g.restore(); g.lineWidth = 5; g.strokeStyle = '#7A4E2C'; roundRect(g, cx - w / 2, y, w, 100, 16); g.stroke(); g.lineWidth = 1.5; g.strokeStyle = PAL.gold; roundRect(g, cx - w / 2 + 8, y + 8, w - 16, 84, 10); g.stroke();
      plainText(g, S.q.text, cx, y + 52, Math.min(60, w * 0.11), '#2A1E14', 'center', 800, SERIF);
      const left = S.ans ? 0 : clamp(1 - (this.t - S.t0) / this.timeout(i), 0, 1);
      roundRect(g, cx - w / 2 + 20, y + 84, (w - 40) * left, 8, 4); g.fillStyle = left < 0.3 ? COLORS.berry : COLORS.leaf; g.fill();
    });
    act.forEach(i => {
      const S = this.st[i]; if (!S.fb || this.t - S.fb.t > 1.0) return; const A = this.areaFor(i);
      const cx = this.shared ? (i ? View.W * 0.75 : View.W * 0.25) : A.x + A.w / 2;
      goldText(g, S.fb.a === '-' ? '…' : S.fb.a, cx, View.H * 0.4, 150, S.fb.ok ? undefined : PAL.ivory2);
    });
    // 큰 O/X 안내
    act.forEach(i => {
      if (this.shared && i === 1) return; const S = this.st[i]; if (!S.q || S.ans) return;
      const cx = this.shared ? View.W / 2 : (this.split ? (i ? View.W * 0.75 : View.W * 0.25) : View.W / 2);
      outlineText(g, '맞으면 만세 O   ·   틀리면 팔로 X', cx, View.H * 0.8 - 176, Math.min(32, View.W * (this.split ? 0.016 : 0.025)), COLORS.ink);
    });
  }
  drawGuide(g) { }
}

/* ---------- ⑤ 과수원 수확 (Go/No-Go) ---------- */
class OrchardGame extends BaseGame {
  constructor(ctx) { super('orchard', ctx); this.bossText = '황금 사과 나무!'; this.st = this.ps.map(() => ({ items: [], next: 1 })); }
  params(i) { const lv = this.lv(i); let iv = Math.max(0.6, 1.7 - lv * 0.1), life = Math.max(1.25, 3.1 - lv * 0.18); if (this.bossOn) iv /= 1.3; if (this.ps[i].fever > 0) iv /= 1.6; return { iv, life, bee: Math.min(0.45, 0.18 + lv * 0.025), gold: this.bossOn ? 0.2 : 0.04 }; }
  spawn(i) {
    const p = this.params(i), A = this.areaFor(i), S = this.st[i]; if (S.items.length >= 4) return;
    const r = clamp(Math.min(A.w, A.h) * 0.075, 38, 62); let x, y, c = 0;
    do { x = rand(A.x + r, A.x + A.w - r); y = rand(A.y + r, A.y + A.h - r); c++; } while (c < 40 && S.items.some(it => Math.hypot(it.x - x, it.y - y) < r * 3));
    const roll = Math.random(); const kind = roll < p.bee ? 'bee' : roll < p.bee + p.gold ? 'gold' : 'fruit';
    S.items.push({ kind, fk: pick(['apple', 'pear', 'grape', 'orange', 'peach']), x, y, r, born: this.t, life: p.life * (kind === 'bee' ? 1.1 : 1), dw: 0 });
  }
  step(dt) {
    this.activeIdx().forEach(i => {
      const S = this.st[i]; S.next -= dt; if (S.next <= 0) { this.spawn(i); S.next = this.params(i).iv * rand(0.8, 1.2); }
      for (const it of S.items) {
        const age = this.t - it.born;
        if (it.kind === 'bee') { it.x += Math.sin(this.t * 3 + it.born) * 40 * dt; it.y += Math.cos(this.t * 2.3 + it.born) * 25 * dt; }
        const H = age > 0.15 ? this.handOver(i, it.x, it.y, it.r * 1.15) : null;
        if (H) { it.dw += dt; } else it.dw = 0;
        if (it.dw >= 0.12) {
          it.dead = true;
          if (it.kind === 'bee') { this.wrong(i, it.x, it.y, 'commission', '앗, 벌이에요!'); FX.doShake(8); Sound.noise(0.3, 0.15, 400, 0, 3); }
          else { const gold = it.kind === 'gold'; this.correct(i, it.x, it.y, age, { base: gold ? 300 : 100 }); this.ps[i].fruits++; if (gold) { FX.text('황금 사과!', it.x, it.y - 90, PAL.gold2, 50); Sound.coin(); } }
        } else if (age > it.life) {
          it.dead = true;
          if (it.kind === 'bee') { this.ps[i].trials++; this.ps[i].correct++; this.ps[i].score += 50; if (this.coop) this.addTeam(50); if (Math.random() < 0.35) FX.text('잘 참았어요', it.x, it.y, COLORS.leaf, 34); }
          else if (it.kind === 'fruit') { this.ps[i].trials++; this.ps[i].omission++; this.ps[i].combo = 0; }
        }
      }
      S.items = S.items.filter(it => !it.dead);
    });
  }
  draw(g, t) {
    this.activeIdx().forEach(i => {
      for (const it of this.st[i].items) {
        const age = this.t - it.born, s = Math.min(1, age / 0.2), fade = clamp((it.life - age) / 0.4, 0, 1);
        g.globalAlpha = fade;
        if (it.kind === 'bee') bee(g, it.x, it.y, it.r * 0.8 * s, t);
        else fruit(g, it.kind === 'gold' ? 'gold' : it.fk, it.x, it.y, it.r * s);
        if (it.dw > 0) { g.beginPath(); g.arc(it.x, it.y, it.r * 1.3, -Math.PI / 2, -Math.PI / 2 + it.dw / 0.12 * Math.PI * 2); g.lineWidth = 6; g.strokeStyle = COLORS.sun; g.stroke(); }
        g.globalAlpha = 1;
      }
    });
  }
  drawGuide(g) { outlineText(g, '과일은 터치!  벌은 손을 내리고 참아요', View.W / 2, View.H - 100, Math.min(30, View.W * 0.022), COLORS.ink); }
}

const GAME_CLASS = { balloon: BalloonGame, dance: DanceGame, stars: StarsGame, ox: OxGame, orchard: OrchardGame };  // 새 게임은 games2.js 에서 덧붙임

/* ================= 체조·휴식·스트레칭 단계 ================= */
class WarmupStage {
  constructor(ctx) {
    this.ctx = ctx; this.t = 0; this.done = false; this.kind = 'warmup';
    const low = ctx.posture === 'seat' ? 'knee' : 'squat';
    const steps = [
      { g: null, demo: 'neck', say: '목을 천천히 좌우로 돌려요', label: '목 천천히 돌리기', d: 10 },
      { g: 'up', say: '양팔을 위로 쭉 뻗어요', label: '양팔 위로 쭉', d: 10 },
      { g: null, demo: 'shoulder', say: '어깨를 앞뒤로 크게 돌려요', label: '어깨 돌리기', d: 10 },
      { g: 'tee', say: '양팔을 옆으로 넓게 벌려요', label: '양팔 옆으로', d: 10 },
      { g: 'left', say: '왼팔을 위로 들어요', label: '왼팔 위로', d: 8 },
      { g: 'right', say: '오른팔을 위로 들어요', label: '오른팔 위로', d: 8 },
      { g: 'clap', say: '두 손을 앞으로 모아요', label: '두 손 모으기', d: 8 },
      { g: low, say: low === 'squat' ? '무릎을 살짝 굽혔다 펴요' : '앉은 채로 무릎을 하나씩 들어요', label: low === 'squat' ? '무릎 굽혔다 펴기' : '앉아서 무릎 들기', d: 10 },
      { g: 'up', say: '마지막으로 만세!', label: '만세', d: 8 }
    ];
    let tot = 0; this.steps = []; for (const s of steps) { if (tot + s.d > ctx.duration && this.steps.length >= 3) break; this.steps.push({ ...s, t0: tot }); tot += s.d; }
    this.duration = tot; this.cur = -1; this.hold = ctx.players.map(() => 0); this.good = ctx.players.map(() => 0);
  }
  start() { FX.showBanner('아침 체조', PAL.gold2, '몸을 깨워요', 1.6); Sound.startMusic(92); Narr.say('warmup'); this.t = -2.5; }
  update(dt) {
    this.t += dt; const k = this.steps.findIndex(s => this.t >= s.t0 && this.t < s.t0 + s.d);
    if (k !== this.cur && k >= 0) { this.cur = k; Narr.plain(this.steps[k].say); Sound.beat(true); this.hold = this.hold.map(() => 0); }
    const s = this.steps[this.cur];
    if (s && s.g) this.ctx.players.forEach((P, i) => {
      if (P.gesture === s.g) { this.hold[i] += dt; if (Math.random() < dt * 6) { const h = P.hands[Math.random() < 0.5 ? 0 : 1]; if (h.px) FX.sparkle(h.px, h.py, '#FFF2A8', 3); } if (this.hold[i] > 1.5 && !s['ok' + i]) { s['ok' + i] = true; this.good[i]++; FX.text('좋아요!', View.W * (this.ctx.split ? (i ? 0.75 : 0.25) : 0.5), View.H * 0.35, P.color, 56); Sound.pop(this.good[i]); } }
    });
    if (this.t >= this.duration) this.done = true;
  }
  draw(g, t) {
    Scenes.morning(g, View.W, View.H, t);
    const s = this.steps[this.cur]; if (!s) return;
    const fs = Math.min(View.H * 0.09, 80), fx = View.W * 0.5, fy = View.H * 0.2;
    drawStageFigure(g, View.W * 0.2, View.H * 0.86, View.H * 0.62, s.g || s.demo, t, 'main', `${s.label} · ${Math.max(0, Math.ceil(s.t0 + s.d - this.t))}초`);
    outlineText(g, `아침 체조 ${this.cur + 1} / ${this.steps.length}`, View.W / 2, 40, 34, COLORS.ink);
    if (s.g === 'knee') this.ctx.players.forEach((P, i) => { if (P.present && P.kneesSeen) drawKneeMeter(g, View.W * (this.ctx.split ? (i ? 0.75 : 0.25) : 0.5), View.H * 0.2 + 30, 320, P.kneeLevel || 0); });
    if (s.g === 'knee' && this.ctx.players.some(P => P.present && P.kneesSeen === false)) outlineText(g, '무릎이 화면에 보이게 의자를 조금 뒤로 빼 주세요', View.W / 2, View.H * 0.14, 28, COLORS.berry);
  }
}
class CooldownStage {
  constructor(ctx) { this.ctx = ctx; this.t = 0; this.done = false; this.kind = 'cooldown'; this.duration = ctx.duration; this.phase = ''; }
  start() { FX.showBanner('노을 스트레칭', '#E8456E', '천천히 숨을 골라요', 1.6); Sound.setTempo(70); Narr.say('cooldown'); this.t = -3; this.phase = ''; }
  update(dt) {
    this.t += dt; if (this.t < 0) return; const c = this.t % 8, ph = c < 4 ? 'in' : 'out';
    if (ph !== this.phase) { this.phase = ph; Narr.plain(ph === 'in' ? '코로 천천히 들이마시며 팔을 올려요' : '입으로 후 내쉬며 팔을 내려요'); }
    if (this.t >= this.duration) this.done = true;
  }
  draw(g, t) {
    Scenes.sunset(g, View.W, View.H, t);
    const c = Math.max(0, this.t) % 8, k = c < 4 ? c / 4 : 1 - (c - 4) / 4, R = Math.min(View.W, View.H) * (0.08 + 0.1 * k);
    g.beginPath(); g.arc(View.W / 2, View.H * 0.28, R, 0, 7); g.fillStyle = 'rgba(244,236,221,0.16)'; g.fill(); g.lineWidth = 3; g.strokeStyle = nacreStroke(g, View.W / 2 - R, 0, View.W / 2 + R, 0); g.stroke();
    outlineText(g, c < 4 ? '들이마시고…' : '내쉬고…', View.W / 2, View.H * 0.28, 52, '#E8456E');
    outlineText(g, `노을 스트레칭 · ${Math.ceil(this.duration - Math.max(0, this.t))}초`, View.W / 2, 40, 34, COLORS.ink);
  }
}
class RestStage {
  constructor(ctx, nextName, relayNext) { this.ctx = ctx; this.t = 0; this.done = false; this.kind = 'rest'; this.duration = ctx.duration; this.next = nextName; this.relayNext = relayNext; this.five = false; }
  start() {
    Sound.setTempo(80); setTimeout(() => window.Avatar?.celebrate?.('main', this.duration), 0);
    const two = this.ctx.players.length === 2;
    Narr.say('rest', { next: this.next }); if (two) setTimeout(() => Narr.flavor('highfive'), 4500);
    const W = View.W, H = View.H; HandButtons.set([{ label: '바로 계속하기', x: W / 2 - 180, y: H - 150, w: 360, h: 90, on: () => this.done = true }]);
  }
  update(dt) {
    this.t += dt;
    const ps = this.ctx.players;
    if (ps.length === 2 && !this.five) {
      for (const a of ps[0].hands) for (const b of ps[1].hands) {
        if (a.ok && b.ok && a.px != null && b.px != null && ps[0].present && ps[1].present && Math.hypot(a.px - b.px, a.py - b.py) < 110 && Math.abs((a.px + b.px) / 2 - View.W / 2) < View.W * 0.15) {
          this.five = true; FX.burst((a.px + b.px) / 2, (a.py + b.py) / 2, ['#FFD23F', '#fff', COLORS.p1, COLORS.p2], 60, 'mix', 1.2); FX.showBanner('하이파이브!', PAL.gold2, '팀 보너스 +100', 1.5); Sound.clap(); Sound.cheer(); Narr.say('highfive'); this.bonus = 100;
        }
      }
    }
    if (this.t >= this.duration) this.done = true;
  }
  draw(g, t) {
    Scenes.rest(g, View.W, View.H, t);
    drawStageFigure(g, View.W * 0.16, View.H * 0.9, View.H * 0.6, 'none', t, 'main', '');
    outlineText(g, '쉬는 시간', View.W / 2, View.H * 0.18, 72, COLORS.ink);
    outlineText(g, `물 한 모금 마시고 숨을 골라요 · ${Math.ceil(this.duration - this.t)}초`, View.W / 2, View.H * 0.18 + 70, 34, PAL.ivory2);
    outlineText(g, `다음: ${this.next}`, View.W / 2, View.H * 0.18 + 120, 40, PAL.gold2);
    if (this.relayNext != null) outlineText(g, `${this.relayNext}P 차례예요`, View.W / 2, View.H * 0.18 + 170, 44, PCOL[this.relayNext - 1]);
    if (this.ctx.players.length === 2 && !this.five) {
      const x = View.W / 2, y = View.H * 0.52, p = 1 + 0.08 * Math.sin(t * 5);
      g.beginPath(); g.arc(x, y, 80 * p, 0, 7); g.fillStyle = 'rgba(255,200,58,0.35)'; g.fill(); g.lineWidth = 6; g.setLineDash([12, 10]); g.strokeStyle = COLORS.sun; g.stroke(); g.setLineDash([]);
      outlineText(g, '여기서 하이파이브!', x, y + 120, 36, PAL.gold2);
    }
  }
}

/* 무릎 들기 높이 막대: 얼마나 올라왔는지 보여 줘서 '조금만 더'를 알 수 있게 */
function drawKneeMeter(g, cx, y, w, lv) {
  const h = 16, x = cx - w / 2, f = clamp(lv, 0, 1);
  g.save(); lacquerPanel(g, x - 12, y - 30, w + 24, h + 44, 16, 0.85);
  plainText(g, f >= 1 ? '좋아요! 그대로 유지' : '무릎을 더 높이', cx, y - 13, 17, f >= 1 ? '#7FE0A8' : PAL.ivory, 'center', 700);
  g.fillStyle = 'rgba(244,236,221,.15)'; roundRect(g, x, y + 2, w, h, 8); g.fill();
  g.fillStyle = f >= 1 ? '#2E9E6A' : f > 0.6 ? PAL.gold : '#C9962E'; roundRect(g, x, y + 2, Math.max(h, w * f), h, 8); g.fill();
  g.restore();
}
