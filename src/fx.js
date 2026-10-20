/* ================= 화면·효과(게임 필) — 나전칠기 마을 ================= */
const PAL = { lacquer: '#121830', lacquer2: '#1B2244', ivory: '#F4ECDD', ivory2: '#CFC8DA', mute: '#9C97B8', gold: '#DDB04F', gold2: '#F3D88C', verm: '#D44A3A', pine: '#4FA383', plum: '#B98AE8' };
const NACRE = ['#A6EDE4', '#B9B8F6', '#F5C9E2', '#F8E6B6', '#AEE7CB'];
const OBANG = ['#D44A3A', '#E7B53C', '#3F8F6B', '#3E6FD1', '#F4ECDD', '#E58FB0'];
const SERIF = 'Hahmlet, "Nanum Myeongjo", Batang, serif';
const SANS = '"IBM Plex Sans KR", "Malgun Gothic", sans-serif';

const View = {
  cv: null, g: null, W: 0, H: 0, dpr: 1, ox: 0, oy: 0, dw: 0, dh: 0,
  init() { this.cv = $('#game'); this.g = this.cv.getContext('2d'); this.resize(); addEventListener('resize', () => this.resize()); },
  resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.W = innerWidth; this.H = innerHeight;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fit(); Bands.cache = {};
  },
  fit() {
    const vw = Pose.vw || 1280, vh = Pose.vh || 720;
    const s = Math.max(this.W / vw, this.H / vh);
    this.dw = vw * s; this.dh = vh * s; this.ox = (this.W - this.dw) / 2; this.oy = (this.H - this.dh) / 2;
  },
  toPx(x, y) { return { x: this.ox + x * this.dw, y: this.oy + y * this.dh }; },
  drawVideo() {
    const g = this.g, W = this.W, H = this.H;
    if (Pose.mode === 'camera' && Pose.video && Pose.video.readyState >= 2) {
      g.save(); g.translate(this.ox + this.dw, this.oy); g.scale(-1, 1); g.drawImage(Pose.video, 0, 0, this.dw, this.dh); g.restore();
    } else {
      // 시연 모드: 마을 그림을 흐리게 깔아 무대처럼
      drawCover(g, IMG.hero, 0, 0, W, H, 0.55); g.fillStyle = 'rgba(18,24,48,0.55)'; g.fillRect(0, 0, W, H);
    }
    // 가장자리 옻칠 비네트
    const v = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H * 0.48, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(10,13,30,0)'); v.addColorStop(1, 'rgba(10,13,30,0.6)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  },
  // 플레이어 손이 닿는 범위(몸 기준) — 2인일 때는 자기 쪽 반만
  area(P, opt = {}) {
    const W = this.W, H = this.H, n = opt.split ? 2 : 1, i = opt.side ?? P?.idx ?? 0;
    let x0 = W * 0.06, x1 = W * 0.94;
    if (n === 2) { const mid = W / 2, gap = W * 0.05; if (i === 0) x1 = mid - gap; else x0 = mid + gap; }
    let y0 = Math.max(H * 0.22, 170), y1 = H * 0.8;
    const reach = opt.reach ?? 1.45;
    if (P && P.lm && P.present) {
      const lm = P.lm, s = this.toPx((lm[L.ls].x + lm[L.rs].x) / 2, (lm[L.ls].y + lm[L.rs].y) / 2);
      const T = Math.max(H * 0.12, (P.base?.t ?? torsoLen(lm)) * this.dh);
      x0 = Math.max(x0, s.x - reach * T); x1 = Math.min(x1, s.x + reach * T);
      y0 = Math.max(H * 0.2, 170, s.y - 1.25 * T); y1 = Math.min(H * 0.84, s.y + 0.85 * T);
      if (y1 - y0 < H * 0.3) y1 = Math.min(H * 0.88, y0 + H * 0.3);
      if (x1 - x0 < W * 0.16) { const c = (x0 + x1) / 2; x0 = c - W * 0.08; x1 = c + W * 0.08; }
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
};

/* 그림을 상자에 꽉 채워(cover) 그리기 */
function drawCover(g, img, x, y, w, h, alpha = 1, focusY = 0.5) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s;
  const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) * focusY;
  g.save(); g.globalAlpha = alpha; g.drawImage(img, sx, sy, sw, sh, x, y, w, h); g.restore();
}

/* 장소 그림 띠: 위(하늘)나 아래(땅) 일부를 잘라 카메라 위에 부드럽게 겹침 */
const Bands = {
  cache: {},
  get(key, where, frac) {
    const k = key + where + frac + View.W + 'x' + View.H; if (this.cache[k]) return this.cache[k];
    const img = IMG[key]; if (!img || !img.naturalWidth) return null;
    const W = View.W, h = Math.round(View.H * frac), c = document.createElement('canvas'); c.width = W; c.height = h; const g = c.getContext('2d');
    const s = W / img.naturalWidth, srcH = h / s;
    const sy = where === 'top' ? 0 : img.naturalHeight - srcH;
    g.drawImage(img, 0, Math.max(0, sy), img.naturalWidth, Math.min(srcH, img.naturalHeight), 0, 0, W, h);
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (where === 'top') { gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
    else { gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.92)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, h);
    return this.cache[k] = c;
  },
  draw(g, key, where, frac, alpha = 1) { const c = this.get(key, where, frac); if (!c) return; g.save(); g.globalAlpha = alpha; g.drawImage(c, 0, where === 'top' ? 0 : View.H - c.height); g.restore(); }
};

const FX = {
  parts: [], texts: [], banner: null, shake: 0,
  get mult() { return { low: 0.4, mid: 1, high: 1.5 }[Store.settings.fx] || 1; },
  // 꽃잎 + 금박 + 자개 반짝이
  burst(x, y, color, n = 24, kind = 'mix', speed = 1) {
    n = Math.round(n * this.mult); if (this.parts.length > 500) n = Math.min(n, 6);
    const cols = Array.isArray(color) ? color : [color, PAL.gold2, PAL.ivory];
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(120, 420) * speed;
      const k = kind === 'mix' ? (i % 3 === 0 ? 'leaf' : i % 3 === 1 ? 'petal' : 'spark') : kind;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 110, life: rand(0.7, 1.3), max: 1.3, color: k === 'leaf' ? pick([PAL.gold, PAL.gold2, '#C9963A']) : k === 'spark' ? pick(NACRE) : pick(cols), size: rand(6, 13), rot: rand(0, 6), vr: rand(-7, 7), kind: k, grav: k === 'petal' || k === 'leaf' ? 0.35 : 0.8 });
    }
  },
  sparkle(x, y, n = 6) { this.burst(x, y, NACRE, n, 'spark', 0.35); },
  rain(color, n = 40) { for (let i = 0; i < n * this.mult; i++) this.parts.push({ x: rand(0, View.W), y: rand(-View.H * 0.3, 0), vx: rand(-40, 40), vy: rand(120, 260), life: 3, max: 3, color: pick(color), size: rand(8, 14), rot: rand(0, 6), vr: rand(-3, 3), kind: i % 2 ? 'petal' : 'leaf', grav: 0.08 }); },
  text(t, x, y, color = PAL.ivory, size = 42, life = 1.1) { if (this.texts.length > 14) this.texts.shift(); this.texts.push({ t, x, y, color, size, life, max: life }); },
  // 배너는 한 번에 하나만 (새 배너가 앞 배너를 대신함)
  showBanner(t, color = PAL.gold2, sub = '', life = 1.8) { this.banner = { t, color, sub, life, max: life }; },
  doShake(a) { if (Store.settings.fx === 'low') return; this.shake = Math.max(this.shake, a * (Store.settings.fx === 'high' ? 1.4 : 1)); },
  update(dt) {
    for (const p of this.parts) { p.life -= dt; p.vx *= 0.985; p.x += p.vx * dt + (p.kind === 'petal' ? Math.sin(p.life * 6) * 30 * dt : 0); p.y += p.vy * dt; p.vy += 700 * p.grav * dt; p.rot += p.vr * dt; }
    this.parts = this.parts.filter(p => p.life > 0 && p.y < View.H + 40);
    for (const t of this.texts) { t.life -= dt; t.y -= 55 * dt; }
    this.texts = this.texts.filter(t => t.life > 0);
    if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
    this.shake = Math.max(0, this.shake - dt * 30);
  },
  draw(g) {
    for (const p of this.parts) {
      g.globalAlpha = clamp(p.life / p.max * 1.4, 0, 1);
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
      if (p.kind === 'spark') star4(g, 0, 0, p.size, p.color);
      else if (p.kind === 'leaf') { g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-p.size / 2, -p.size / 3, p.size * 0.4, p.size * 0.2); }
      else if (p.kind === 'heart') heart(g, 0, 0, p.size * 1.2, p.color);
      else { g.fillStyle = p.color; g.beginPath(); g.ellipse(0, 0, p.size * 0.75, p.size * 0.4, 0, 0, 7); g.fill(); }
      g.restore();
    }
    g.globalAlpha = 1;
    for (const t of this.texts) { g.globalAlpha = clamp(t.life / t.max * 1.6, 0, 1); outlineText(g, t.t, t.x, t.y, t.size * (1 + (1 - t.life / t.max) * 0.12), t.color); }
    g.globalAlpha = 1;
    const b = this.banner;
    if (b) {
      const p = 1 - b.life / b.max, a = clamp(Math.min(p / 0.12, b.life / 0.3), 0, 1), s = p < 0.12 ? 0.85 + p / 0.12 * 0.15 : 1;
      const W = View.W, cy = View.H * 0.42, fs = Math.min(W * 0.075, 92) * s;
      g.save(); g.globalAlpha = a;
      g.font = `800 ${fs}px ${SERIF}`; const tw = g.measureText(b.t).width; const bw = Math.min(W - 60, Math.max(tw + 140, 420)), bh = fs * (b.sub ? 2.05 : 1.55);
      lacquerPanel(g, W / 2 - bw / 2, cy - fs * 0.85, bw, bh, 26, 0.9);
      // 양쪽 금 장식선
      g.strokeStyle = PAL.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - bw / 2 + 26, cy - fs * 0.85 + 12); g.lineTo(W / 2 + bw / 2 - 26, cy - fs * 0.85 + 12); g.moveTo(W / 2 - bw / 2 + 26, cy - fs * 0.85 + bh - 12); g.lineTo(W / 2 + bw / 2 - 26, cy - fs * 0.85 + bh - 12); g.stroke();
      goldText(g, b.t, W / 2, cy - fs * 0.85 + fs * 0.82, fs, b.color);
      if (b.sub) { g.font = `600 ${fs * 0.36}px ${SANS}`; g.textAlign = 'center'; g.fillStyle = PAL.ivory2; g.fillText(b.sub, W / 2, cy - fs * 0.85 + fs * 1.6); }
      g.restore();
    }
  },
  clear() { this.parts = []; this.texts = []; this.banner = null; this.shake = 0; }
};

/* ---------- 그리기 도구 ---------- */
function outlineText(g, t, x, y, size, color = PAL.ivory, align = 'center', weight = 700) {
  g.font = `${weight} ${Math.round(size)}px ${SERIF}`; g.textAlign = align; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = Math.max(4, size * 0.18); g.strokeStyle = 'rgba(12,15,34,0.88)'; g.strokeText(t, x, y);
  g.fillStyle = color; g.fillText(t, x, y);
}
function goldText(g, t, x, y, size, color) {
  g.font = `800 ${Math.round(size)}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const gr = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  if (color && color !== PAL.gold2) { gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, color); gr.addColorStop(1, color); }
  else { gr.addColorStop(0, '#FFF3C8'); gr.addColorStop(0.5, '#E9C063'); gr.addColorStop(1, '#B9832C'); }
  g.lineJoin = 'round'; g.lineWidth = size * 0.12; g.strokeStyle = 'rgba(12,15,34,0.9)'; g.strokeText(t, x, y);
  g.fillStyle = gr; g.fillText(t, x, y);
}
function plainText(g, t, x, y, size, color = PAL.ivory, align = 'center', weight = 600, font = SANS) {
  g.font = `${weight} ${Math.round(size)}px ${font}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(t, x, y);
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function nacreStroke(g, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); NACRE.forEach((c, k) => gr.addColorStop(k / (NACRE.length - 1), c)); return gr; }
// 옻칠 판 + 자개 테두리
function lacquerPanel(g, x, y, w, h, r = 18, alpha = 0.86, edge) {
  g.save(); roundRect(g, x, y, w, h, r);
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, `rgba(40,49,92,${alpha})`); gr.addColorStop(1, `rgba(18,24,48,${alpha})`);
  g.shadowColor = 'rgba(4,6,18,0.45)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.fillStyle = gr; g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.lineWidth = edge ? 2.5 : 1.5; g.strokeStyle = edge || nacreStroke(g, x, y, x + w, y + h); if (!edge) g.globalAlpha *= 0.75; g.stroke();
  g.restore();
}
function pill(g, x, y, w, h, fill, stroke) { roundRect(g, x, y, w, h, h / 2); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = 2; g.strokeStyle = stroke; g.stroke(); } }
function star5(g, x, y, R, r, fill, rot = -Math.PI / 2, n = 5) {
  g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fillStyle = fill; g.fill();
}
function star4(g, x, y, s, fill) { g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fillStyle = fill; g.fill(); }
function heart(g, x, y, s, fill) { g.beginPath(); g.moveTo(x, y + s * 0.3); g.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.4, y - s, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.4, x, y + s * 0.3); g.fillStyle = fill; g.fill(); }
function shapeMark(g, kind, x, y, r, fill) {
  g.fillStyle = fill; g.beginPath();
  if (kind === 'circle') g.arc(x, y, r, 0, 7);
  else if (kind === 'square') g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else if (kind === 'tri') { g.moveTo(x, y - r); g.lineTo(x + r * 0.95, y + r * 0.7); g.lineTo(x - r * 0.95, y + r * 0.7); g.closePath(); }
  else if (kind === 'star') { star5(g, x, y, r * 1.1, r * 0.48, fill); return; }
  else if (kind === 'diamond') { g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath(); }
  g.fill();
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = n >> 8 & 255, b = n & 255; const f = v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)); return `rgb(${f(r)},${f(gg)},${f(b)})`; }
function balloon(g, x, y, r, color, t, opts = {}) {
  const w = Math.sin(t * 1.8 + x * 0.01) * 0.06;
  g.save(); g.translate(x, y); g.rotate(w);
  g.strokeStyle = 'rgba(243,216,140,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, r * 1.15); g.bezierCurveTo(r * 0.25, r * 1.5, -r * 0.2, r * 1.8, r * 0.05, r * 2.2); g.stroke();
  let fill = color;
  if (typeof color === 'string') { const gr = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.15); gr.addColorStop(0, shade(color, 0.45)); gr.addColorStop(0.55, color); gr.addColorStop(1, shade(color, -0.35)); fill = gr; }
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
  g.beginPath(); g.ellipse(0, 0, r * 0.88, r * 1.05, 0, 0, 7); g.fillStyle = fill; g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.fillStyle = typeof color === 'string' ? shade(color, -0.25) : PAL.gold; g.beginPath(); g.moveTo(-r * 0.12, r * 1.0); g.lineTo(r * 0.12, r * 1.0); g.lineTo(0, r * 1.17); g.closePath(); g.fill();
  g.globalAlpha = 0.55; g.beginPath(); g.ellipse(-r * 0.34, -r * 0.42, r * 0.14, r * 0.28, -0.5, 0, 7); g.fillStyle = '#fff'; g.fill(); g.globalAlpha = 1;
  if (opts.gold) { g.lineWidth = 3; g.strokeStyle = nacreStroke(g, -r, -r, r, r); g.beginPath(); g.ellipse(0, 0, r * 0.94, r * 1.11, 0, 0, 7); g.stroke(); }
  if (opts.shape) shapeMark(g, opts.shape, 0, r * 0.05, r * 0.36, 'rgba(255,250,240,0.95)');
  g.restore();
}
/* ---------- 과수원 캐릭터: 얼굴 있는 과일·장난꾸러기 벌 ---------- */
const FRUITS = {
  apple: { n: '사과', c: '#E0393B', leaf: '#3F9A55' }, pear: { n: '배', c: '#E8C85A', leaf: '#4C9A4A' }, peach: { n: '복숭아', c: '#F59A8C', leaf: '#4FA35C' },
  orange: { n: '귤', c: '#F38B23', leaf: '#3F8F4A' }, persimmon: { n: '감', c: '#EE7A22', leaf: '#2F6F3A' }, grape: { n: '포도', c: '#7B47C4', leaf: '#3F8F4A' },
  gold: { n: '황금 사과', c: '#EBC05A', leaf: '#3F9A55' }
};
// 얼굴: mood 'happy'(기본) · 'wow'(손이 다가오면) · 'sad'(떨어질 때) · 'yum'(딸 때)
function fruitFace(g, x, y, r, t, mood = 'happy', seed = 0, light = false) {
  const blink = ((t + seed * 1.7) % 3.4) < 0.13 && mood !== 'wow';
  const ex = r * 0.27, ey = y - r * 0.02, ink = light ? '#FFFFFF' : '#2A1B22';
  g.fillStyle = 'rgba(255,120,140,0.42)';
  g.beginPath(); g.ellipse(x - r * 0.5, y + r * 0.2, r * 0.17, r * 0.1, 0, 0, 7); g.ellipse(x + r * 0.5, y + r * 0.2, r * 0.17, r * 0.1, 0, 0, 7); g.fill();
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = Math.max(2, r * 0.07);
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex;
    if (blink || mood === 'yum') { g.beginPath(); g.arc(cx, ey + r * 0.03, r * 0.09, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else {
      const big = mood === 'wow' ? 1.35 : 1; g.beginPath(); g.ellipse(cx, ey, r * 0.085 * big, r * 0.12 * big, 0, 0, 7); g.fill();
      g.fillStyle = light ? '#2A0E4A' : '#fff'; g.beginPath(); g.arc(cx + (light ? r * 0.01 : -r * 0.025), ey + (light ? r * 0.02 : -r * 0.045), r * (light ? 0.05 : 0.035) * big, 0, 7); g.fill(); g.fillStyle = ink;
    }
  }
  g.beginPath();
  if (mood === 'wow') { g.ellipse(x, y + r * 0.26, r * 0.08, r * 0.11, 0, 0, 7); g.fill(); }
  else if (mood === 'sad') { g.arc(x, y + r * 0.36, r * 0.12, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  else { g.arc(x, y + r * 0.13, r * 0.14, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); if (mood === 'yum') { g.fillStyle = '#E8607A'; g.beginPath(); g.ellipse(x, y + r * 0.3, r * 0.06, r * 0.05, 0, 0, 7); g.fill(); } }
}
function fruitLeaf(g, x, y, r, rot, col) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(r * 0.28, -r * 0.2, r * 0.6, 0); g.quadraticCurveTo(r * 0.28, r * 0.2, 0, 0); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(r * 0.05, 0); g.lineTo(r * 0.5, 0); g.stroke(); g.restore();
}
// 과일 몸통 + 얼굴. 그림자·하이라이트로 동글동글하게
function fruit(g, kind, x, y, r, t = 0, mood = 'happy', seed = 0) {
  const F = FRUITS[kind] || FRUITS.apple, c = F.c;
  g.save();
  if (kind === 'grape') {
    const pts = [[-0.42, -0.42], [0, -0.48], [0.42, -0.42], [-0.62, -0.02], [-0.21, -0.06], [0.21, -0.06], [0.62, -0.02], [-0.4, 0.36], [0, 0.32], [0.4, 0.36], [-0.2, 0.7], [0.2, 0.7], [0, 1.0]];
    g.strokeStyle = '#5A3C22'; g.lineWidth = Math.max(3, r * 0.08); g.beginPath(); g.moveTo(x, y - r * 0.75); g.quadraticCurveTo(x + r * 0.1, y - r * 1.05, x + r * 0.05, y - r * 1.25); g.stroke();
    fruitLeaf(g, x + r * 0.05, y - r * 0.95, r * 1.2, -0.4, F.leaf);
    for (const [dx, dy] of pts) { const gx = x + dx * r, gy = y + dy * r * 0.9, gr = g.createRadialGradient(gx - r * 0.1, gy - r * 0.1, 1, gx, gy, r * 0.3); gr.addColorStop(0, '#C9A7F5'); gr.addColorStop(0.55, '#8656CF'); gr.addColorStop(1, '#4F2A92'); g.fillStyle = gr; g.beginPath(); g.arc(gx, gy, r * 0.27, 0, 7); g.fill(); }
    fruitFace(g, x, y - r * 0.02, r * 0.95, t, mood, seed, true); g.restore(); return;
  }
  // 그림자
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = r * 0.3; g.shadowOffsetY = r * 0.12;
  const gr = g.createRadialGradient(x - r * 0.38, y - r * 0.4, r * 0.08, x, y, r * 1.1);
  gr.addColorStop(0, shade(c, 0.55)); gr.addColorStop(0.55, c); gr.addColorStop(1, shade(c, -0.32)); g.fillStyle = gr;
  g.beginPath();
  if (kind === 'apple' || kind === 'gold') { // 위가 살짝 들어간 사과 모양
    g.moveTo(x, y - r * 0.72);
    g.bezierCurveTo(x + r * 0.5, y - r * 1.12, x + r * 1.18, y - r * 0.6, x + r * 0.98, y + r * 0.22);
    g.bezierCurveTo(x + r * 0.82, y + r * 0.92, x + r * 0.3, y + r * 1.05, x, y + r * 0.9);
    g.bezierCurveTo(x - r * 0.3, y + r * 1.05, x - r * 0.82, y + r * 0.92, x - r * 0.98, y + r * 0.22);
    g.bezierCurveTo(x - r * 1.18, y - r * 0.6, x - r * 0.5, y - r * 1.12, x, y - r * 0.72);
  } else if (kind === 'pear') { // 위가 좁은 배 모양
    g.moveTo(x, y - r * 1.0);
    g.bezierCurveTo(x + r * 0.42, y - r * 1.0, x + r * 0.5, y - r * 0.45, x + r * 0.62, y - r * 0.1);
    g.bezierCurveTo(x + r * 1.1, y + r * 0.35, x + r * 0.85, y + r * 1.02, x, y + r * 1.0);
    g.bezierCurveTo(x - r * 0.85, y + r * 1.02, x - r * 1.1, y + r * 0.35, x - r * 0.62, y - r * 0.1);
    g.bezierCurveTo(x - r * 0.5, y - r * 0.45, x - r * 0.42, y - r * 1.0, x, y - r * 1.0);
  } else if (kind === 'peach') { // 끝이 살짝 뾰족한 복숭아
    g.moveTo(x, y - r * 0.82);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.08, y - r * 0.2, x + r * 0.9, y + r * 0.35);
    g.bezierCurveTo(x + r * 0.7, y + r * 0.95, x + r * 0.2, y + r * 1.02, x, y + r * 0.98);
    g.bezierCurveTo(x - r * 0.2, y + r * 1.02, x - r * 0.7, y + r * 0.95, x - r * 0.9, y + r * 0.35);
    g.bezierCurveTo(x - r * 1.08, y - r * 0.2, x - r * 0.7, y - r * 1.1, x, y - r * 0.82);
  } else if (kind === 'persimmon') g.ellipse(x, y + r * 0.04, r * 1.02, r * 0.86, 0, 0, 7); // 납작한 감
  else g.arc(x, y, r, 0, 7);
  g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  // 표면 무늬
  if (kind === 'orange') { g.fillStyle = 'rgba(160,70,0,0.18)'; for (let k = 0; k < 14; k++) { const a = k * 2.4, d = r * (0.3 + (k % 4) * 0.15); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, r * 0.03, 0, 7); g.fill(); } }
  if (kind === 'peach') { g.strokeStyle = 'rgba(190,80,80,0.35)'; g.lineWidth = Math.max(2, r * 0.05); g.beginPath(); g.moveTo(x + r * 0.02, y - r * 0.76); g.quadraticCurveTo(x + r * 0.3, y - r * 0.45, x + r * 0.42, y - r * 0.05); g.stroke(); g.fillStyle = 'rgba(255,90,110,0.25)'; g.beginPath(); g.ellipse(x + r * 0.35, y - r * 0.2, r * 0.45, r * 0.5, 0.4, 0, 7); g.fill(); }
  if (kind === 'pear') { g.fillStyle = 'rgba(120,90,20,0.22)'; for (let k = 0; k < 9; k++) { const a = k * 2.1; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + r * 0.3 + Math.sin(a) * r * 0.45, r * 0.025, 0, 7); g.fill(); } }
  // 하이라이트
  g.globalAlpha = 0.6; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - r * 0.42, y - r * 0.38, r * 0.13, r * 0.24, -0.6, 0, 7); g.fill(); g.globalAlpha = 1;
  // 꼭지·잎
  if (kind === 'persimmon' || kind === 'orange') {
    g.fillStyle = shade(F.leaf, -0.1); const top = y - r * (kind === 'persimmon' ? 0.8 : 0.95);
    for (let k = 0; k < 4; k++) { g.save(); g.translate(x, top); g.rotate(k * Math.PI / 2 + Math.PI / 4); g.beginPath(); g.ellipse(0, -r * 0.16, r * 0.11, r * 0.2, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#4A3320'; g.fillRect(x - r * 0.04, top - r * 0.18, r * 0.08, r * 0.16);
  } else {
    const top = y - r * (kind === 'pear' ? 0.98 : 0.74);
    g.strokeStyle = '#5A3C22'; g.lineWidth = Math.max(3, r * 0.09); g.lineCap = 'round'; g.beginPath(); g.moveTo(x, top + r * 0.06); g.quadraticCurveTo(x + r * 0.04, top - r * 0.2, x + r * 0.14, top - r * 0.36); g.stroke();
    fruitLeaf(g, x + r * 0.1, top - r * 0.22, r, -0.35, F.leaf);
  }
  if (kind === 'gold') { // 황금 사과: 반짝이 왕관 + 자개 테두리
    g.lineWidth = 3; g.strokeStyle = nacreStroke(g, x - r, y - r, x + r, y + r); g.beginPath(); g.arc(x, y + r * 0.08, r * 1.12, 0, 7); g.stroke();
    for (let k = 0; k < 4; k++) { const a = t * 1.6 + k * Math.PI / 2; star4(g, x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35, r * (0.13 + 0.05 * Math.sin(t * 6 + k)), '#FFF3C8'); }
  }
  fruitFace(g, x, y + (kind === 'pear' ? r * 0.22 : r * 0.08), r, t, mood, seed);
  g.restore();
}
// 벌: 동글동글 털복숭이 몸, 큰 눈, 더듬이. 경고 표시(붉은 점선 테 + '!')는 그대로 둬서 한눈에 구분
function bee(g, x, y, r, t, opts = {}) {
  const dir = opts.dir || 1, angry = !!opts.angry, f = Math.sin(t * 46);
  g.save();
  // 경고 테
  g.setLineDash([r * 0.32, r * 0.22]); g.lineDashOffset = -t * 30; g.lineWidth = 3; g.strokeStyle = 'rgba(226,96,79,0.9)'; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#E2604F'; g.beginPath(); g.arc(x + r * 1.15, y - r * 1.15, r * 0.3, 0, 7); g.fill(); plainText(g, '!', x + r * 1.15, y - r * 1.13, r * 0.42, '#fff', 'center', 800);
  g.translate(x, y + Math.sin(t * 7 + (opts.seed || 0)) * r * 0.08); g.scale(dir, 1); g.rotate(Math.sin(t * 5) * 0.06);
  // 날개(뒤)
  g.fillStyle = 'rgba(225,240,255,0.7)'; g.strokeStyle = 'rgba(160,190,230,0.9)'; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(-r * 0.15, -r * 0.82, r * 0.42, r * (0.26 + f * 0.1), -0.5 + f * 0.25, 0, 7); g.fill(); g.stroke();
  // 침
  g.fillStyle = '#2A2233'; g.beginPath(); g.moveTo(-r * 0.98, r * 0.02); g.lineTo(-r * 1.32, r * 0.12); g.lineTo(-r * 0.96, r * 0.26); g.fill();
  // 몸
  const gr = g.createRadialGradient(r * 0.1, -r * 0.3, r * 0.1, 0, 0, r * 1.1); gr.addColorStop(0, '#FFE58A'); gr.addColorStop(0.7, '#F2B829'); gr.addColorStop(1, '#C98A12');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 1.02, r * 0.82, 0, 0, 7); g.fill();
  g.save(); g.beginPath(); g.ellipse(0, 0, r * 1.02, r * 0.82, 0, 0, 7); g.clip(); g.fillStyle = '#2A2233';
  for (const dx of [-0.55, -0.12]) { g.beginPath(); g.ellipse(dx * r, 0, r * 0.13, r * 0.9, 0.12, 0, 7); g.fill(); } g.restore();
  // 날개(앞)
  g.fillStyle = 'rgba(235,246,255,0.8)'; g.beginPath(); g.ellipse(r * 0.18, -r * 0.86, r * 0.46, r * (0.28 - f * 0.1), 0.45 - f * 0.25, 0, 7); g.fill(); g.stroke();
  // 더듬이
  g.strokeStyle = '#2A2233'; g.lineWidth = Math.max(2, r * 0.06); g.lineCap = 'round';
  for (const [ax, ay] of [[0.55, -0.62], [0.8, -0.5]]) { g.beginPath(); g.moveTo(r * ax, r * ay); g.quadraticCurveTo(r * (ax + 0.1), r * (ay - 0.35), r * (ax + 0.28), r * (ay - 0.42)); g.stroke(); g.fillStyle = '#2A2233'; g.beginPath(); g.arc(r * (ax + 0.28), r * (ay - 0.42), r * 0.08, 0, 7); g.fill(); }
  // 눈(큰 흰자 + 눈동자) · 볼 · 입
  for (const ex of [0.38, 0.72]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(r * ex, -r * 0.18, r * 0.17, r * 0.2, 0, 0, 7); g.fill();
    g.fillStyle = '#1C1626'; g.beginPath(); g.arc(r * (ex + 0.05), -r * 0.15, r * 0.09, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(r * (ex + 0.03), -r * 0.19, r * 0.03, 0, 7); g.fill();
    if (angry) { g.strokeStyle = '#1C1626'; g.lineWidth = Math.max(2, r * 0.06); g.beginPath(); g.moveTo(r * (ex - 0.14), -r * 0.44); g.lineTo(r * (ex + 0.14), -r * 0.36 + (ex > 0.5 ? -r * 0.08 : r * 0.04)); g.stroke(); }
  }
  g.fillStyle = 'rgba(255,110,90,0.5)'; g.beginPath(); g.ellipse(r * 0.82, r * 0.18, r * 0.11, r * 0.07, 0, 0, 7); g.fill();
  g.strokeStyle = '#1C1626'; g.lineWidth = Math.max(2, r * 0.05); g.beginPath();
  if (angry) g.arc(r * 0.6, r * 0.32, r * 0.1, Math.PI * 1.15, Math.PI * 1.85); else g.arc(r * 0.6, r * 0.12, r * 0.12, Math.PI * 0.2, Math.PI * 0.8);
  g.stroke();
  g.restore();
}
// 꿀단지(벌을 잘 참으면 나오는 선물)
function honeyPot(g, x, y, r, t) {
  g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = r * 0.3; g.shadowOffsetY = r * 0.1;
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.2, r * 0.1, x, y + r * 0.1, r * 1.1); gr.addColorStop(0, '#E9B36A'); gr.addColorStop(1, '#8A4E1C');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + r * 0.15, r * 0.95, r * 0.85, 0, 0, 7); g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.fillStyle = '#6B3A14'; roundRect(g, x - r * 0.62, y - r * 0.82, r * 1.24, r * 0.32, r * 0.12); g.fill();
  g.fillStyle = '#FFC93A'; g.beginPath(); g.moveTo(x - r * 0.62, y - r * 0.55); g.quadraticCurveTo(x - r * 0.3, y - r * 0.2 + Math.sin(t * 3) * r * 0.05, x - r * 0.15, y - r * 0.5); g.quadraticCurveTo(x + r * 0.2, y - r * 0.15, x + r * 0.62, y - r * 0.55); g.closePath(); g.fill();
  g.fillStyle = '#F4ECDD'; roundRect(g, x - r * 0.5, y - r * 0.05, r, r * 0.42, r * 0.08); g.fill();
  plainText(g, '꿀', x, y + r * 0.17, r * 0.34, '#6B3A14', 'center', 800, SERIF);
  for (let k = 0; k < 3; k++) { const a = t * 2 + k * 2.1; star4(g, x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.15, r * 0.12, '#FFE58A'); }
  g.restore();
}
// 바구니(딴 과일이 쌓임)
function basket(g, x, y, w, items, t, glow = 0) {
  g.save(); const h = w * 0.5;
  // 쌓인 과일
  // 과일이 바구니 위로 소복이 쌓여 보이게(아래 줄 4개 → 3개 → 2개)
  items.slice(-9).forEach((k, n) => { const row = n < 4 ? 0 : n < 7 ? 1 : 2, col = row === 0 ? n : row === 1 ? n - 4 : n - 7, cnt = [4, 3, 2][row]; const fx = x + (col - (cnt - 1) / 2) * w * 0.22, fy = y - h * 0.5 - row * w * 0.17; fruit(g, k, fx, fy, w * 0.12, t, 'happy', n); });
  if (glow > 0) { g.shadowColor = '#FFE58A'; g.shadowBlur = 30 * glow; }
  const gr = g.createLinearGradient(0, y - h * 0.4, 0, y + h * 0.6); gr.addColorStop(0, '#C98B48'); gr.addColorStop(1, '#7A4A1E'); g.fillStyle = gr;
  g.beginPath(); g.moveTo(x - w / 2, y - h * 0.35); g.lineTo(x + w / 2, y - h * 0.35); g.lineTo(x + w * 0.38, y + h * 0.55); g.lineTo(x - w * 0.38, y + h * 0.55); g.closePath(); g.fill(); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(70,40,15,0.55)'; g.lineWidth = 2;
  for (let k = 1; k < 4; k++) { const yy = y - h * 0.35 + k * h * 0.22, ww = w / 2 - k * w * 0.03; g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x + ww, yy); g.stroke(); }
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * w * 0.13, y - h * 0.35); g.lineTo(x + k * w * 0.1, y + h * 0.55); g.stroke(); }
  g.fillStyle = '#B07434'; roundRect(g, x - w / 2 - 4, y - h * 0.42, w + 8, h * 0.14, h * 0.07); g.fill();
  g.restore();
}
// 몸 위 빛 뼈대(청·주황), 관절은 금빛
function drawAura(g, P, color, glow = 0, gold = false) {
  if (!P.lm || !P.present) return;
  const pts = P.lm.map(p => View.toPx(p.x, p.y));
  const c = gold ? PAL.gold2 : color;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (Store.settings.skeleton) {
    g.globalAlpha = 0.22 + glow * 0.25; g.strokeStyle = c; g.lineWidth = 22; if (glow > 0) { g.shadowColor = c; g.shadowBlur = 18; }
    for (const [a, b] of BONES) { if (P.lm[a].v < 0.3 || P.lm[b].v < 0.3) continue; g.beginPath(); g.moveTo(pts[a].x, pts[a].y); g.lineTo(pts[b].x, pts[b].y); g.stroke(); }
    g.shadowBlur = 0; g.globalAlpha = 0.9; g.lineWidth = 3; g.strokeStyle = 'rgba(244,236,221,0.9)';
    for (const [a, b] of BONES) { if (P.lm[a].v < 0.3 || P.lm[b].v < 0.3) continue; g.beginPath(); g.moveTo(pts[a].x, pts[a].y); g.lineTo(pts[b].x, pts[b].y); g.stroke(); }
    for (const k of [11, 12, 13, 14, 23, 24, 25, 26]) { if (P.lm[k].v < 0.3) continue; g.beginPath(); g.arc(pts[k].x, pts[k].y, 5, 0, 7); g.fillStyle = PAL.gold2; g.fill(); }
  }
  // 머리 위 이름표(노리개 모양)
  const n = pts[0], sw = Math.abs(pts[11].x - pts[12].x), hy = n.y - Math.max(56, sw * 0.8);
  g.globalAlpha = 1; g.strokeStyle = PAL.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(n.x, hy + 22); g.lineTo(n.x, hy + 40); g.stroke();
  g.beginPath(); g.arc(n.x, hy, 22, 0, 7); g.fillStyle = PAL.lacquer; g.fill(); g.lineWidth = 3; g.strokeStyle = color; g.stroke();
  plainText(g, P.idx === 0 ? '1P' : '2P', n.x, hy + 1, 17, color, 'center', 700);
  for (const dx of [-5, 0, 5]) { g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); g.moveTo(n.x + dx, hy + 40); g.lineTo(n.x + dx * 1.6, hy + 56); g.stroke(); }
  g.restore();
}
function drawHands(g, P, color, t) {
  if (!P.present) return;
  for (const H of P.hands) {
    if (!H.ok || H.px == null) continue;
    g.save(); g.lineCap = 'round';
    for (let i = 1; i < H.trail.length; i++) { const a = H.trail[i - 1], b = H.trail[i]; g.globalAlpha = i / H.trail.length * 0.45; g.strokeStyle = color; g.lineWidth = 4 + i * 1.4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    g.globalAlpha = 0.35; g.beginPath(); g.arc(H.px, H.py, 30, 0, 7); g.fillStyle = color; g.fill();
    g.globalAlpha = 1; g.beginPath(); g.arc(H.px, H.py, 20, 0, 7); g.fillStyle = 'rgba(244,236,221,0.92)'; g.fill();
    g.lineWidth = 5; g.strokeStyle = color; g.stroke(); g.shadowBlur = 0;
    g.beginPath(); g.arc(H.px, H.py, 6, 0, 7); g.fillStyle = color; g.fill();
    if (H.dwell > 0) { g.beginPath(); g.arc(H.px, H.py, 30, -Math.PI / 2, -Math.PI / 2 + Math.min(1, H.dwell) * Math.PI * 2); g.lineWidth = 6; g.strokeStyle = PAL.gold2; g.stroke(); }
    g.restore();
  }
}
// 안내 인물 '무브' — 저고리 입은 꼭두각시 모양 시범 인물
function drawFairy(g, x, y, s, gesture, t, color = PAL.gold, label, live) {
  const AVt = window.Avatar;
  if (AVt && AVt.ready) {
    // 3D 인물: 머리 위(y-0.8s)부터 발끝(y+2.9s)까지 같은 자리를 차지하도록 맞춤
    const hpx = s * 3.95, bottom = y + s * 3.05;
    g.save(); const sh = g.createRadialGradient(x, bottom - hpx * 0.05, 1, x, bottom - hpx * 0.05, s * 1.1); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.beginPath(); g.ellipse(x, bottom - hpx * 0.05, s * 1.1, s * 0.28, 0, 0, 7); g.fill(); g.restore();
    let ok = false;
    if (live) ok = AVt.draw(g, live, gesture || 'none', x, bottom, hpx, t);
    else { const c = AVt.thumb(gesture || 'none'); if (c) { g.drawImage(c, x - hpx * 0.375, bottom - hpx, hpx * 0.75, hpx); ok = true; } }
    if (ok) { if (label) outlineText(g, label, x, y + s * 3.35, Math.max(24, s * 0.5), PAL.gold2); return; }
  }
  if (gesture === 'wave' || gesture === 'neck' || gesture === 'shoulder') gesture = 'none';
  const lm = makePose(0, 0, 1, gesture || 'none', null, -1, t);
  const A = 16 / 9; const P = i => ({ x: x + lm[i].x * A * s, y: y + lm[i].y * s });
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const limb = (a, b, w) => { const A1 = P(a), B1 = P(b); g.beginPath(); g.moveTo(A1.x, A1.y); g.lineTo(B1.x, B1.y); g.lineWidth = w + 5; g.strokeStyle = color; g.stroke(); g.lineWidth = w; g.strokeStyle = '#232C55'; g.stroke(); };
  [[23, 25], [25, 27], [24, 26], [26, 28]].forEach(([a, b]) => limb(a, b, s * 0.22));
  // 치마
  const h1 = P(23), h2 = P(24), k1 = P(25), k2 = P(26);
  g.beginPath(); g.moveTo(h1.x - s * 0.05, h1.y - s * 0.2); g.lineTo(h2.x + s * 0.05, h2.y - s * 0.2); g.lineTo(k2.x + s * 0.35, k2.y - s * 0.1); g.lineTo(k1.x - s * 0.35, k1.y - s * 0.1); g.closePath();
  const sk = g.createLinearGradient(0, h1.y, 0, k1.y); sk.addColorStop(0, '#3E6FD1'); sk.addColorStop(1, '#2A4C9E'); g.fillStyle = sk; g.fill(); g.lineWidth = 2; g.strokeStyle = color; g.stroke();
  // 저고리
  const s1 = P(11), s2 = P(12);
  g.beginPath(); g.moveTo(s1.x, s1.y - s * 0.05); g.lineTo(s2.x, s2.y - s * 0.05); g.lineTo(h2.x + s * 0.08, h2.y - s * 0.25); g.lineTo(h1.x - s * 0.08, h1.y - s * 0.25); g.closePath();
  g.fillStyle = PAL.ivory; g.fill(); g.lineWidth = 2; g.strokeStyle = color; g.stroke();
  // 고름
  const mx = (s1.x + s2.x) / 2, my = (s1.y + h1.y) / 2; g.strokeStyle = PAL.verm; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(mx, my - s * 0.15); g.lineTo(mx + s * 0.1, my + s * 0.35); g.moveTo(mx, my - s * 0.15); g.lineTo(mx - s * 0.12, my + s * 0.3); g.stroke();
  [[11, 13], [13, 15], [12, 14], [14, 16]].forEach(([a, b]) => { const A1 = P(a), B1 = P(b); g.beginPath(); g.moveTo(A1.x, A1.y); g.lineTo(B1.x, B1.y); g.lineWidth = s * 0.24 + 5; g.strokeStyle = color; g.stroke(); g.lineWidth = s * 0.24; g.strokeStyle = PAL.ivory; g.stroke(); });
  for (const k of [15, 16]) { const p = P(k); g.beginPath(); g.arc(p.x, p.y, s * 0.11, 0, 7); g.fillStyle = '#F3D9BE'; g.fill(); }
  // 얼굴·머리
  const n = P(0); g.beginPath(); g.arc(n.x, n.y, s * 0.4, 0, 7); g.fillStyle = '#F3D9BE'; g.fill(); g.lineWidth = 2; g.strokeStyle = color; g.stroke();
  g.beginPath(); g.arc(n.x, n.y - s * 0.06, s * 0.42, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(n.x + s * 0.3, n.y - s * 0.15); g.lineTo(n.x - s * 0.3, n.y - s * 0.15); g.closePath(); g.fillStyle = '#1B1A2A'; g.fill();
  g.beginPath(); g.arc(n.x, n.y - s * 0.5, s * 0.15, 0, 7); g.fillStyle = '#1B1A2A'; g.fill();
  g.strokeStyle = PAL.gold; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(n.x - s * 0.3, n.y - s * 0.5); g.lineTo(n.x + s * 0.3, n.y - s * 0.5); g.stroke();
  g.fillStyle = '#1B1A2A'; g.beginPath(); g.arc(n.x - s * 0.13, n.y + s * 0.02, s * 0.045, 0, 7); g.arc(n.x + s * 0.13, n.y + s * 0.02, s * 0.045, 0, 7); g.fill();
  g.fillStyle = 'rgba(229,120,140,0.6)'; g.beginPath(); g.arc(n.x - s * 0.22, n.y + s * 0.13, s * 0.07, 0, 7); g.arc(n.x + s * 0.22, n.y + s * 0.13, s * 0.07, 0, 7); g.fill();
  g.strokeStyle = PAL.verm; g.lineWidth = 2.5; g.beginPath(); g.arc(n.x, n.y + s * 0.12, s * 0.1, 0.25, Math.PI - 0.25); g.stroke();
  if (label) outlineText(g, label, x, y + s * 3.25, Math.max(24, s * 0.5), PAL.gold2);
  g.restore();
}

/* 무대 조명 아래 크게 선 3D 인물 (발끝 bottom, 키 hpx) */
function drawStageFigure(g, x, bottom, hpx, gesture, t, live, label) {
  const s = hpx / 3.95, y = bottom - s * 3.05;
  g.save();
  const sp = g.createRadialGradient(x, bottom - hpx * 0.45, hpx * 0.05, x, bottom - hpx * 0.45, hpx * 0.75);
  sp.addColorStop(0, 'rgba(255,236,190,0.22)'); sp.addColorStop(1, 'rgba(255,236,190,0)'); g.fillStyle = sp;
  g.beginPath(); g.moveTo(x - hpx * 0.08, bottom - hpx * 1.25); g.lineTo(x + hpx * 0.08, bottom - hpx * 1.25); g.lineTo(x + hpx * 0.55, bottom); g.lineTo(x - hpx * 0.55, bottom); g.closePath(); g.fill();
  const fl = g.createRadialGradient(x, bottom, 1, x, bottom, hpx * 0.42); fl.addColorStop(0, 'rgba(243,216,140,0.35)'); fl.addColorStop(1, 'rgba(243,216,140,0)');
  g.fillStyle = fl; g.beginPath(); g.ellipse(x, bottom, hpx * 0.42, hpx * 0.07, 0, 0, 7); g.fill();
  g.restore();
  drawFairy(g, x, y, s, gesture, t, PAL.gold, '', live);
  if (label) { const w = Math.max(220, label.length * 30 + 60); lacquerPanel(g, x - w / 2, bottom - hpx - 62, w, 54, 27, 0.88); g.font = `800 30px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = PAL.gold2; g.fillText(label, x, bottom - hpx - 34); }
}

/* ---------- 장소별 장면: 그림 띠 + 약간의 움직임 ---------- */
const Scenes = {
  market(g, W, H, t) { Bands.draw(g, 'market', 'top', 0.2, 0.95); },
  stage(g, W, H, t, crowd = 0) {
    Bands.draw(g, 'stage', 'top', 0.22, 0.95);
    g.save(); g.globalAlpha = 0.1 + 0.04 * Math.sin(t * 2); g.fillStyle = '#FFF0C8';
    for (const cx of [W * 0.3, W * 0.7]) { g.beginPath(); g.moveTo(cx - 24, H * 0.12); g.lineTo(cx + 24, H * 0.12); g.lineTo(cx + W * 0.15, H); g.lineTo(cx - W * 0.15, H); g.closePath(); g.fill(); }
    g.restore();
  },
  night(g, W, H, t) {
    drawCover(g, IMG.night, 0, 0, W, H, 0.62, 0.2);
    g.fillStyle = 'rgba(12,16,40,0.25)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 50; i++) { const x = (i * 97.3 % 100) / 100 * W, y = (i * 53.7 % 100) / 100 * H * 0.8; g.globalAlpha = 0.25 + 0.35 * Math.sin(t * 2 + i); star4(g, x, y, 3, '#fff'); }
    g.globalAlpha = 1;
  },
  river(g, W, H, t) {
    Bands.draw(g, 'river', 'top', 0.18, 0.9);
    const y = H * 0.78;
    const gr = g.createLinearGradient(0, y, 0, H); gr.addColorStop(0, 'rgba(44,96,150,0.0)'); gr.addColorStop(0.25, 'rgba(44,96,150,0.82)'); gr.addColorStop(1, 'rgba(24,52,104,0.95)');
    g.fillStyle = gr; g.fillRect(0, y - 20, W, H - y + 20);
    g.strokeStyle = 'rgba(220,240,255,0.55)'; g.lineWidth = 2.5;
    // 민화식 물결
    for (let k = 0; k < 3; k++) { const yy = y + 34 + k * 26; for (let x = -40; x < W + 40; x += 80) { const ph = (t * 30 + k * 30) % 80; g.beginPath(); g.arc(x + ph, yy, 18, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
  },
  orchard(g, W, H, t) { Bands.draw(g, 'orchard', 'top', 0.2, 0.92); Bands.draw(g, 'orchard', 'bottom', 0.14, 0.85); },
  morning(g, W, H, t) { Bands.draw(g, 'hero', 'top', 0.26, 0.85); },
  yard(g, W, H, t) { Bands.draw(g, 'yard', 'top', 0.22, 0.95); },
  jars(g, W, H, t) { Bands.draw(g, 'jars', 'top', 0.2, 0.95); },
  lantern(g, W, H, t) { Bands.draw(g, 'lantern', 'top', 0.2, 0.95); },
  shop(g, W, H, t) { Bands.draw(g, 'shop', 'top', 0.2, 0.95); },
  sunset(g, W, H, t) {
    drawCover(g, IMG.hero, 0, 0, W, H, 0.35);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(232,120,90,0.32)'); gr.addColorStop(0.6, 'rgba(120,80,170,0.18)'); gr.addColorStop(1, 'rgba(18,24,48,0.4)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  },
  rest(g, W, H, t) { drawCover(g, IMG.hero, 0, 0, W, H, 0.78); g.fillStyle = 'rgba(14,18,40,0.45)'; g.fillRect(0, 0, W, H); }
};

/* ---------- 동작 그림(픽토그램): 굵은 선 사람 그림 + 움직임 화살표 ----------
   화면은 거울처럼 보이므로 '왼팔'은 그림의 화면 왼쪽 팔. seated=true면 의자에 앉은 그림 */
function drawPicto(g, x, bottom, h, move, color = PAL.gold2, seated = false) {
  const lw = Math.max(3, h * 0.075), top = bottom - h;
  const sq = move === 'squat' && !seated, dy = sq ? h * 0.16 : 0;
  const headR = h * 0.095, hy = top + headR + dy, ys = top + h * 0.27 + dy, yh = top + (seated ? 0.58 : 0.6) * h + dy, sw = h * 0.13, hw = h * 0.07, A = h * 0.3;
  const segs = [];
  const line = (...pts) => segs.push(pts);
  // 몸통
  line([x, ys - h * 0.02], [x, yh]); line([x - sw, ys], [x + sw, ys]);
  // 팔
  const arm = (side, kind) => { const sx = x + side * sw;
    if (kind === 'up') line([sx, ys], [sx + side * A * 0.35, ys - A * 0.94]);
    else if (kind === 'tee') line([sx, ys], [sx + side * A, ys - A * 0.04]);
    else if (kind === 'clap') line([sx, ys], [x + side * h * 0.17, ys + h * 0.15], [x + side * h * 0.02, ys + h * 0.05]);
    else if (kind === 'cross') line([sx, ys], [x + side * h * 0.16, ys + h * 0.17], [x - side * h * 0.1, ys + h * 0.01]);
    else if (kind === 'fwd') line([sx, ys], [sx + side * A * 0.5, ys + A * 0.55]);
    else line([sx, ys], [sx + side * h * 0.05, ys + A * 0.95]); };
  const arms = { up: ['up', 'up'], left: ['up', 'down'], right: ['down', 'up'], tee: ['tee', 'tee'], clap: ['clap', 'clap'], cross: ['cross', 'cross'], squat: ['fwd', 'fwd'] }[move] || ['down', 'down'];
  arm(-1, arms[0]); arm(1, arms[1]);
  // 다리
  const leg = (side, lift) => { const hx = x + side * hw;
    if (seated) {
      if (lift) line([hx, yh], [hx + side * h * 0.1, yh - h * 0.14], [hx + side * h * 0.12, bottom - h * 0.16]);
      else line([hx, yh], [hx + side * h * 0.05, yh + h * 0.04], [hx + side * h * 0.05, bottom]);
    } else if (sq) line([hx, yh], [hx + side * h * 0.15, bottom - h * 0.17], [hx + side * h * 0.08, bottom]);
    else if (lift) line([hx, yh], [hx + side * h * 0.1, yh + h * 0.07], [hx + side * h * 0.06, yh + h * 0.3]);
    else line([hx, yh], [hx + side * h * 0.03, bottom]); };
  leg(-1, move === 'knee'); leg(1, false);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  // 의자
  if (seated) { g.strokeStyle = 'rgba(244,236,221,0.45)'; g.lineWidth = lw * 0.55;
    g.beginPath(); g.moveTo(x - h * 0.2, yh + h * 0.06); g.lineTo(x + h * 0.2, yh + h * 0.06); g.moveTo(x - h * 0.17, yh + h * 0.06); g.lineTo(x - h * 0.17, bottom); g.moveTo(x + h * 0.17, yh + h * 0.06); g.lineTo(x + h * 0.17, bottom); g.stroke(); }
  // 바닥선(발이 바닥에서 떨어진 게 보이도록)
  if (seated || move === 'knee') { g.strokeStyle = 'rgba(244,236,221,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - h * 0.3, bottom + lw * 0.6); g.lineTo(x + h * 0.3, bottom + lw * 0.6); g.stroke(); }
  const stroke = (w, c) => { g.strokeStyle = c; g.lineWidth = w; for (const pts of segs) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.stroke(); } g.beginPath(); g.arc(x, hy, headR, 0, 7); g.stroke(); };
  stroke(lw + 4, 'rgba(10,12,30,0.85)'); stroke(lw, color);
  g.fillStyle = color; g.beginPath(); g.arc(x, hy, headR - lw / 2, 0, 7); g.fill();
  // 움직임 화살표
  const arrow = (ax, ay, dir) => { const L = h * 0.22, w = h * 0.085; g.fillStyle = '#7FE0A8'; g.strokeStyle = 'rgba(10,12,30,0.85)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ax, ay + dir * -L / 2); g.lineTo(ax + w, ay); g.lineTo(ax + w * 0.4, ay); g.lineTo(ax + w * 0.4, ay + dir * L / 2); g.lineTo(ax - w * 0.4, ay + dir * L / 2); g.lineTo(ax - w * 0.4, ay); g.lineTo(ax - w, ay); g.closePath(); g.stroke(); g.fill(); };
  if (move === 'knee') arrow(x - h * (seated ? 0.33 : 0.3), seated ? yh - h * 0.02 : yh + h * 0.08, 1);
  if (sq) arrow(x + h * 0.33, yh - h * 0.05, -1);
  g.restore();
}

/* 화면 테두리 금 모서리 장식 */
function drawCorners(g, W, H) {
  const m = 12, L = 46; g.save(); g.strokeStyle = PAL.gold; g.lineWidth = 3; g.globalAlpha = 0.85;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
    g.beginPath(); g.arc(x + sx * 10, y + sy * 10, 3.5, 0, 7); g.fillStyle = PAL.gold2; g.fill();
  }
  g.restore();
}

/* ---------- 손으로 누르는 화면 버튼(0.8초 머무르기) ---------- */
const HandButtons = {
  list: [],
  set(btns) { this.list = btns.map(b => ({ dwell: 0, ...b })); },
  clear() { this.list = []; },
  update(dt, players) {
    for (const b of this.list) {
      let over = false;
      for (const P of players) for (const H of P.hands) { if (P.present && H.ok && H.px > b.x && H.px < b.x + b.w && H.py > b.y && H.py < b.y + b.h) over = true; }
      b.dwell = over ? b.dwell + dt / 0.8 : Math.max(0, b.dwell - dt * 2);
      if (b.dwell >= 1) { b.dwell = 0; Sound.coin(); const f = b.on; this.clear(); f && f(); return; }
    }
  },
  click(x, y) { for (const b of this.list) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { Sound.coin(); const f = b.on; this.clear(); f && f(); return true; } return false; },
  draw(g) {
    for (const b of this.list) {
      roundRect(g, b.x, b.y, b.w, b.h, b.h / 2); const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h); gr.addColorStop(0, '#F0CF7A'); gr.addColorStop(1, '#C9963A'); g.fillStyle = gr; g.fill();
      if (b.dwell > 0) { g.save(); roundRect(g, b.x, b.y, b.w, b.h, b.h / 2); g.clip(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(b.x, b.y, b.w * b.dwell, b.h); g.restore(); }
      plainText(g, b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, Math.min(32, b.h * 0.38), '#1A1530', 'center', 700);
      plainText(g, '손을 올려 두거나 누르세요', b.x + b.w / 2, b.y + b.h + 22, 16, PAL.ivory2, 'center', 500);
    }
  }
};
