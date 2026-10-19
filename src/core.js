'use strict';
/* ================= 공통 유틸 ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const now = () => performance.now() / 1000;
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt1 = v => (v == null || isNaN(v)) ? '–' : (Math.round(v * 10) / 10).toFixed(1);
const pct = v => (v == null || isNaN(v)) ? '–' : Math.round(v * 100) + '%';

// 캔버스 색: 어두운 옻칠 바탕 위에서 읽히는 값
const COLORS = { p1: '#5AB0FF', p2: '#FF9F4A', ink: '#F4ECDD', sun: '#F3D88C', leaf: '#6CC79F', berry: '#E2604F', sky: '#1B2244', white: '#FFFFFF' };
// 민화 일러스트(같은 폴더의 assets/). 한 파일 버전에서는 빌드 때 그림이 파일 안에 들어감
const ASSETS = { hero: 'assets/hero.jpg', market: 'assets/market.jpg', stage: 'assets/stage.jpg', night: 'assets/night.jpg', river: 'assets/river.jpg', orchard: 'assets/orchard.jpg', garden: 'assets/garden.jpg', yard: 'assets/yard.jpg', jars: 'assets/jars.jpg', lantern: 'assets/lantern.jpg', shop: 'assets/shop.jpg', video: 'assets/title.mp4' };
const IMG = {};
for (const [k, src] of Object.entries(ASSETS)) { if (k === 'video') continue; const im = new Image(); im.decoding = 'async'; im.src = src; IMG[k] = im; }
const PCOL = [COLORS.p1, COLORS.p2];

/* ================= 저장소 ================= */
// v2: 참여자 등록·관리자 모드 도입과 함께 기록을 새로 시작 (예전 v1 기록은 처음 열 때 지움)
const STORE_KEY = 'brainmove.v2', OLD_KEYS = ['brainmove.v1'];
const DEFAULT_SETTINGS = {
  roundSec: 180, danceEase: 1.5, courseGames: 3, restSec: 20, fixedLevel: 0, fx: 'mid', voice: true, voiceRate: 0.95,
  volSfx: 0.8, volMusic: 0.55, volVoice: 1, shapes: false, skeleton: true, model: 'lite', cameraId: '', unlockAll: false, warmupSec: 90, cooldownSec: 50,
  selfRegister: true, narrator: 'basic', voiceTune: {}, orgName: '', ver: 3
};
const normName = n => String(n || '').replace(/\s+/g, ' ').trim();
// 화면에는 실명을 가려서(김O호) 보여 줌. 두 글자는 '김O', 네 글자는 '남궁O수'처럼 첫 글자·끝 글자만 남김
const maskName = n => { const c = [...normName(n)]; if (c.length <= 1) return c.join(''); if (c.length === 2) return c[0] + 'O'; if (c.length === 4 && !/\s/.test(c.join(''))) return c[0] + c[1] + 'O' + c[3]; return c[0] + c.slice(1, -1).map(x => /\s/.test(x) ? ' ' : 'O').join('') + c[c.length - 1]; };
const birthTxt = b => b ? String(b).replace('-', '.') : '';
// 열쇠 → 화면 표시: who '김O호', whoFull '김O호 · 1948.03'
const who = key => { const p = Store.data?.profiles?.[key]; return maskName((p && p.name) || key); };
const whoFull = key => { const p = Store.data?.profiles?.[key]; const b = p && p.birth; return who(key) + (b ? ' · ' + birthTxt(b) : ''); };
const Store = {
  data: null,
  load() {
    try { for (const k of OLD_KEYS) localStorage.removeItem(k); } catch (e) { }
    try { this.data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { this.data = null; }
    if (!this.data || typeof this.data !== 'object') this.data = {};
    this.data.profiles ||= {};
    const raw = this.data.settings || {}, old = Object.keys(raw).length && (raw.ver || 0) < 3;
    this.data.settings = Object.assign({}, DEFAULT_SETTINGS, raw);
    // v3: 배경음악이 너무 작게 들리던 값(0.35)을 올리고, 준비 화면에서 바로 등록할 수 있게 바꿈
    if (old) { const s = this.data.settings; if (s.volMusic <= 0.35) s.volMusic = 0.55; s.selfRegister = true; s.ver = 3; }
    this.data.admin ||= {};
    return this.data;
  },
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; } },
  get settings() { return this.data.settings; },
  // 저장 열쇠: 실명 + 생년월(동명이인 구분). 예전 기록은 이름만으로 된 열쇠도 그대로 씀
  keyOf(name, birth) { return birth ? normName(name) + ' ' + birth : normName(name); },
  realName(key) { const p = this.data.profiles[key]; return (p && p.name) || key; },
  // 이름으로 찾기(앞뒤 공백·영문 대소문자 무시) → 이름이 똑같은 사람들의 열쇠 목록
  matches(name) { const n = normName(name).toLowerCase(); if (!n) return []; return this.names().filter(k => normName(this.realName(k)).toLowerCase() === n || k.toLowerCase() === n); },
  find(name) { const m = this.matches(name); return m.length === 1 ? m[0] : null; },
  checkBirth(b) { if (!b) return null; const m = /^(\d{4})-(\d{2})$/.exec(b); if (!m) return '생년월을 골라 주세요'; const y = +m[1], mo = +m[2], ny = new Date().getFullYear(); if (y < 1900 || y > ny || mo < 1 || mo > 12) return '생년월이 올바르지 않아요'; return null; },
  register(name, opt = {}) {
    name = normName(name); if (!name) return { ok: false, msg: '이름을 적어 주세요' };
    if ([...name].length > 20) return { ok: false, msg: '이름은 20자까지 적을 수 있어요' };
    const birth = opt.birth || ''; if (opt.needBirth && !birth) return { ok: false, msg: '생년월을 골라 주세요' };
    const be = this.checkBirth(birth); if (be) return { ok: false, msg: be };
    const key = this.keyOf(name, birth);
    if (this.data.profiles[key]) return { ok: false, msg: `${whoFull(key)} 님은 이미 등록되어 있어요` };
    const p = this.profile(key); p.name = name; p.birth = birth; p.memo = normName(opt.memo); p.defaultPosture = opt.posture === 'seat' ? 'seat' : 'stand'; p.registered = Date.now();
    if (opt.consent) p.consent = Date.now();
    this.save(); return { ok: true, name: key };
  },
  rename(oldKey, newName, birth) {
    newName = normName(newName); if (!newName) return { ok: false, msg: '이름을 적어 주세요' };
    const ps = this.data.profiles, p = ps[oldKey]; if (!p) return { ok: false, msg: '참여자를 찾지 못했어요' };
    if (birth === undefined) birth = p.birth || '';
    const be = this.checkBirth(birth); if (be) return { ok: false, msg: be };
    const key = this.keyOf(newName, birth); if (key !== oldKey && ps[key]) return { ok: false, msg: `${maskName(newName)}${birth ? ' · ' + birthTxt(birth) : ''} 님은 이미 등록되어 있어요` };
    delete ps[oldKey]; p.name = newName; p.birth = birth; ps[key] = p;
    for (const q of Object.values(ps)) for (const s of q.sessions || []) if (s.partner === oldKey) s.partner = key;
    this.save(); return { ok: true, name: key };
  },
  remove(name) { delete this.data.profiles[name]; this.save(); },
  clearRecords() {
    for (const p of Object.values(this.data.profiles)) Object.assign(p, { levels: {}, best: {}, sessions: [], seeds: 0, drops: 0, garden: [], collection: [], titles: [], days: [], totals: { fruits: 0, raises: 0, constellations: 0, games: 0 }, missions: null });
    this.save();
  },
  profile(name) {
    name = normName(name) || '손님';
    const ps = this.data.profiles;
    if (!ps[name]) ps[name] = { name, created: Date.now(), levels: {}, best: {}, sessions: [], seeds: 0, drops: 0, garden: [], collection: [], titles: [], days: [], totals: { fruits: 0, raises: 0, constellations: 0, games: 0 }, missions: null };
    const p = ps[name];
    p.levels ||= {}; p.best ||= {}; p.sessions ||= []; p.garden ||= []; p.collection ||= []; p.titles ||= []; p.days ||= []; p.totals ||= { fruits: 0, raises: 0, constellations: 0, games: 0 };
    return p;
  },
  names() { return Object.keys(this.data.profiles).sort((a, b) => a.localeCompare(b, 'ko')); }
};

/* ================= 관리자 PIN ================= */
const Admin = {
  unlocked: false, fails: 0, lockUntil: 0,
  get hasPin() { return !!Store.data.admin.pinHash; },
  async hash(text) {
    try { if (crypto?.subtle) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); } } catch (e) { }
    let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return 'f' + h.toString(16);
  },
  async setPin(pin) {
    const A = Store.data.admin; A.salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    A.pinHash = await this.hash(A.salt + ':' + pin);
    const code = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    A.recoveryHash = await this.hash(A.salt + ':rc:' + code); Store.save(); return code;
  },
  async check(pin) {
    if (Date.now() < this.lockUntil) return { ok: false, msg: `잠시 후 다시 시도해 주세요 (${Math.ceil((this.lockUntil - Date.now()) / 1000)}초)` };
    const A = Store.data.admin; const ok = (await this.hash(A.salt + ':' + pin)) === A.pinHash;
    if (ok) { this.fails = 0; this.unlocked = true; return { ok: true }; }
    this.fails++; if (this.fails >= 5) { this.fails = 0; this.lockUntil = Date.now() + 30000; return { ok: false, msg: '5번 틀렸어요. 30초 뒤에 다시 시도해 주세요' }; }
    return { ok: false, msg: `PIN이 맞지 않아요 (${this.fails}/5)` };
  },
  async checkRecovery(code) { const A = Store.data.admin; return (await this.hash(A.salt + ':rc:' + String(code).trim().toUpperCase())) === A.recoveryHash; },
  lock() { this.unlocked = false; }
};

/* ================= 소리 (Web Audio 합성) ================= */
const Sound = {
  ctx: null, master: null, sfx: null, music: null, musicOn: false, tempo: 100, nextBeat: 0, step: 0, timer: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
      this.music = this.ctx.createGain(); this.music.connect(this.master);
      this.applyVolumes();
    } catch (e) { this.ctx = null; }
  },
  applyVolumes() { if (this.el) this.el.volume = clamp(this.musicVol(), 0, 1); if (!this.ctx) return; const s = Store.settings; this.sfx.gain.value = s.volSfx; this.music.gain.value = s.volMusic * 0.5; },
  tone(freq, dur = 0.15, type = 'sine', vol = 0.3, when = 0, dest) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.02);
    return o;
  },
  noise(dur = 0.2, vol = 0.2, freq = 1200, when = 0, q = 1) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start(t);
  },
  // 펜타토닉 음계: 콤보가 오를수록 한 칸씩 높아짐
  scale: [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093],
  pop(combo = 0) {
    this.noise(0.07, 0.25, 2600, 0, 0.8);
    const f = this.scale[Math.min(combo, this.scale.length - 1)];
    this.tone(f, 0.18, 'triangle', 0.28, 0.01);
  },
  soft() { this.tone(330, 0.16, 'sine', 0.14); this.tone(262, 0.2, 'sine', 0.1, 0.07); },
  tick() { this.tone(1400, 0.05, 'square', 0.05); },
  beat(accent) { this.tone(accent ? 110 : 90, 0.18, 'sine', 0.45); this.noise(0.05, 0.12, 3000, 0, 2); },
  cheer() { this.noise(0.5, 0.18, 1800, 0, 0.6); this.noise(0.4, 0.12, 900, 0.05, 0.6); [0, 0.1, 0.2].forEach((w, i) => this.tone(this.scale[4 + i * 2], 0.25, 'triangle', 0.15, w)); },
  fanfare() { [0, 4, 7, 12].forEach((s, i) => this.tone(523.25 * Math.pow(2, s / 12), 0.35, 'triangle', 0.25, i * 0.11)); this.tone(1046.5, 0.8, 'triangle', 0.22, 0.48); },
  harp() { for (let i = 0; i < 8; i++) this.tone(this.scale[i] * 0.5, 0.6, 'sine', 0.15, i * 0.06); },
  clap() { this.noise(0.08, 0.35, 1500, 0, 0.7); this.noise(0.08, 0.3, 1500, 0.09, 0.7); },
  splash() { this.noise(0.45, 0.18, 700, 0, 0.5); },
  coin() { this.tone(988, 0.08, 'square', 0.12); this.tone(1319, 0.25, 'square', 0.12, 0.08); },
  // ---- 배경 음악: assets/music/<곡>.mp3 (Lyria로 작곡한 테마곡). 파일이 없으면 합성 루프로 대신함 ----
  trackId: 'game', el: null, elId: null, bad: {}, duck: 1,
  // 말할 때는 음악을 55%로만 줄임(예전 40%×0.55배는 거의 안 들렸음)
  musicVol() { return Store.settings.volMusic * this.duck; },
  TRACKS: ['title', 'game', 'dance', 'warmup', 'cooldown'],
  track(id) { if (!this.TRACKS.includes(id)) id = 'title'; this.trackId = id; if (this.musicOn && this.elId !== id) { this.stopMusic(); this.startMusic(this.tempo); } },
  // 브라우저가 첫 클릭 전 재생을 막으면(autoplay) 다음 클릭·키 입력 때 다시 틀어 줌
  blocked: false,
  tryPlay(a) { const p = a.play(); if (p && p.then) p.then(() => { this.blocked = false; }).catch(e => { if (e && e.name === 'NotAllowedError') this.blocked = true; }); },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); if (this.musicOn && this.el && this.el.paused) this.tryPlay(this.el); },
  fileMusic() {
    const id = this.trackId; if (this.bad[id] || location.protocol === 'about:') return false;
    if (this.el && this.elId === id) { this.el.volume = clamp(this.musicVol(), 0, 1); this.tryPlay(this.el); return true; }
    try {
      if (this.el) { try { this.el.pause(); } catch (e) { } }
      const a = new Audio('assets/music/' + id + '.mp3'); a.loop = true; a.preload = 'auto'; a.volume = clamp(this.musicVol(), 0, 1); a.preservesPitch = true;
      a.onerror = () => { this.bad[id] = true; if (this.el === a) { this.el = null; this.elId = null; if (this.musicOn) { this.musicOn = false; this.startMusic(this.tempo); } } };
      this.el = a; this.elId = id; this.tryPlay(a); return true;
    } catch (e) { return false; }
  },
  setDuck(on) { this.duck = on ? 0.55 : 1; if (this.el) this.el.volume = clamp(this.musicVol(), 0, 1); if (this.music) this.music.gain.value = Store.settings.volMusic * 0.5 * this.duck; },
  // 이긴 화면 팡파르(파일이 있으면 파일로)
  fanfareTrack() { if (this.bad.fanfare) return this.fanfare(); try { const a = new Audio('assets/music/fanfare.mp3'); a.volume = clamp(Store.settings.volMusic * 1.3, 0, 1); a.onerror = () => { this.bad.fanfare = true; this.fanfare(); }; a.play().catch(() => this.fanfare()); } catch (e) { this.fanfare(); } },
  startMusic(tempo = 100) {
    this.tempo = tempo; if (this.musicOn) return;
    if (this.fileMusic()) { this.musicOn = true; this.setTempo(tempo); return; }
    if (!this.ctx) return;
    this.musicOn = true; this.nextBeat = this.ctx.currentTime + 0.1; this.step = 0;
    const mel = [0, 2, 4, 2, 5, 4, 2, 0, 3, 2, 0, 2, 4, 5, 4, 2];
    const bass = [130.81, 130.81, 174.61, 196, 130.81, 130.81, 196, 174.61];
    this.timer = setInterval(() => {
      if (!this.musicOn || !this.ctx) return;
      while (this.nextBeat < this.ctx.currentTime + 0.25) {
        const spb = 60 / this.tempo / 2, when = this.nextBeat - this.ctx.currentTime;
        const n = mel[this.step % mel.length];
        if (this.step % 2 === 0) this.tone(this.scale[n] * 0.5, spb * 1.6, 'triangle', 0.16, Math.max(0, when), this.music);
        if (this.step % 4 === 0) this.tone(bass[(this.step / 4) % bass.length], spb * 3, 'sine', 0.25, Math.max(0, when), this.music);
        this.nextBeat += spb; this.step++;
      }
    }, 60);
  },
  setTempo(t) { this.tempo = t; if (this.el) this.el.playbackRate = t >= 140 ? 1.1 : 1; },
  stopMusic() { this.musicOn = false; clearInterval(this.timer); if (this.el) { try { this.el.pause(); } catch (e) { } } }
};

/* ================= 음성 안내 ================= */
const Voice = {
  voices: { google: null, ms: null, any: null },
  init() {
    if (!('speechSynthesis' in window)) return;
    const pickV = () => {
      const ko = speechSynthesis.getVoices().filter(v => /^ko/i.test(v.lang));
      this.voices = { google: ko.find(v => /google/i.test(v.name)) || null, ms: ko.find(v => /microsoft|heami/i.test(v.name)) || null, any: ko[0] || null };
    };
    pickV(); speechSynthesis.onvoiceschanged = pickV;
  },
  // 이 컴퓨터에서 쓸 수 있는 한국어 음성 이름(설정 화면 표시용)
  available() { return { google: this.voices.google?.name || '', ms: this.voices.ms?.name || '' }; },
  // engine: 'google'(크롬 음성) | 'ms'(윈도우 해미). 없으면 있는 쪽으로.
  // 음높이는 실제로 쓰는 음성에 맞춰 묶음 — 크롬 음성은 1.1, 해미는 1.3을 넘으면 떨리거나 기계음이 됨
  say(text, opts = {}) {
    const s = Store.settings; if (!s.voice || !('speechSynthesis' in window) || !text) return;
    try {
      if (opts.interrupt !== false) speechSynthesis.cancel();
      const V = this.voices, u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR';
      u.voice = (opts.engine === 'ms' ? V.ms || V.google : V.google || V.ms) || V.any;
      const isMs = u.voice ? /microsoft|heami/i.test(u.voice.name) : opts.engine === 'ms';
      u.pitch = isMs ? clamp(opts.pitch ?? 1, 0.75, 1.3) : clamp(opts.pitch ?? 1, 0.85, 1.1);
      u.rate = clamp((opts.rate ?? 0.95) * (s.voiceRate / 0.95), 0.6, 1.5); u.volume = s.volVoice;
      speechSynthesis.speak(u);
    } catch (e) { }
  },
  // fromNarr: 해설이 스스로 부른 경우(대기 중인 대사 예약은 해설 쪽에서 정리)
  stop(fromNarr) { try { speechSynthesis.cancel(); } catch (e) { } if (!fromNarr && typeof Narr !== 'undefined') Narr.cancel(); }
};

/* ================= 토스트 ================= */
let toastTimer = null;
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.opacity = 0, ms); }
