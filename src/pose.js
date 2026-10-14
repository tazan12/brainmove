/* ================= 포즈 인식 · 플레이어 · 동작 판정 ================= */
const MP_VER = '0.10.14';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL_URL = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
};
const L = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, li: 19, ri: 20, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

// 동작 이름(화면·음성용)
const MOVES = {
  up: { name: '만세', say: '양팔을 위로 만세' },
  left: { name: '왼팔 위로', say: '왼팔을 위로' },
  right: { name: '오른팔 위로', say: '오른팔을 위로' },
  tee: { name: '양팔 옆으로', say: '양팔을 옆으로 쭉' },
  clap: { name: '두 손 모으기', say: '두 손을 앞으로 모아요' },
  cross: { name: 'X 자', say: '팔로 엑스' },
  squat: { name: '스쿼트', say: '무릎을 굽혀 앉았다 일어나요' },
  knee: { name: '무릎 들기', say: '무릎을 들어요' }
};

// 자세 모드(서서/앉아서)에 맞춰 동작 이름·안내와 시범 인물 자세를 바꿈
function applyPosture(posture) {
  const seat = posture === 'seat';
  MOVES.knee = seat ? { name: '앉아서 무릎 들기', say: '앉은 채로 한쪽 무릎을 위로 들어요' } : { name: '무릎 들기', say: '선 채로 한쪽 무릎을 들어요' };
  window.BM_POSTURE = posture; if (window.Avatar) window.Avatar.posture = posture;
}
const Pose = {
  mode: 'camera', // camera | mouse
  ready: false, loading: false, error: '',
  landmarker: null, video: null, stream: null, lastVideoTime: -1,
  vw: 1280, vh: 720, numPlayers: 1, posture: 'stand',
  players: [],
  detections: 0,
  demo: { mouse: { x: 0.5, y: 0.5, inside: false }, keys: {} },

  makePlayers(n) {
    this.numPlayers = n;
    this.players = [];
    for (let i = 0; i < n; i++) this.players.push(newPlayer(i));
  },

  async startCamera() {
    this.error = '';
    if (!navigator.mediaDevices?.getUserMedia) { this.error = '이 브라우저는 카메라를 쓸 수 없어요. 크롬에서 열어 주세요.'; return false; }
    try {
      const s = Store.settings;
      const c = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
      if (s.cameraId) c.deviceId = { exact: s.cameraId };
      this.stream = await navigator.mediaDevices.getUserMedia({ video: c, audio: false });
    } catch (e) {
      try { this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      catch (e2) {
        this.error = e2.name === 'NotAllowedError' ? '카메라 사용이 허용되지 않았어요. 주소창 왼쪽 자물쇠 아이콘에서 카메라를 허용해 주세요.'
          : e2.name === 'NotFoundError' ? '연결된 카메라를 찾지 못했어요.' : '카메라를 켜지 못했어요: ' + e2.message;
        return false;
      }
    }
    this.video = $('#video'); this.video.srcObject = this.stream;
    await this.video.play().catch(() => { });
    await new Promise(r => { if (this.video.readyState >= 2) r(); else this.video.onloadeddata = () => r(); });
    this.vw = this.video.videoWidth || 1280; this.vh = this.video.videoHeight || 720;
    return true;
  },
  stopCamera() { try { this.stream?.getTracks().forEach(t => t.stop()); } catch (e) { } this.stream = null; },

  async loadModel() {
    if (this.landmarker) return true;
    this.loading = true; this.error = '';
    try {
      const mp = await import(`${MP_URL}/vision_bundle.mjs`);
      const files = await mp.FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
      const opts = d => ({ baseOptions: { modelAssetPath: MODEL_URL[Store.settings.model] || MODEL_URL.lite, delegate: d }, runningMode: 'VIDEO', numPoses: 2, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
      try { this.landmarker = await mp.PoseLandmarker.createFromOptions(files, opts('GPU')); }
      catch (e) { this.landmarker = await mp.PoseLandmarker.createFromOptions(files, opts('CPU')); }
      this.loading = false; return true;
    } catch (e) {
      this.loading = false;
      this.error = '동작 인식 프로그램을 불러오지 못했어요. 인터넷 연결을 확인하거나 마우스 시연 모드로 해 보세요.';
      console.error(e); return false;
    }
  },

  // 매 프레임 호출: 인식 결과를 플레이어에 반영
  update(t, view) {
    let poses = [];
    if (this.mode === 'camera') {
      if (!this.landmarker || !this.video || this.video.readyState < 2) return;
      if (this.video.currentTime === this.lastVideoTime) { this.refreshHands(view); return; }
      this.lastVideoTime = this.video.currentTime;
      let res;
      try { res = this.landmarker.detectForVideo(this.video, performance.now()); } catch (e) { return; }
      poses = (res.landmarks || []).map(lm => lm.map(p => ({ x: 1 - p.x, y: p.y, v: p.visibility ?? 1 })));
      this.detections++;
    } else {
      poses = this.demoPoses();
    }
    this.assign(poses, t);
    this.refreshHands(view);
    for (const P of this.players) classify(P, this.posture, t);
  },

  assign(poses, t) {
    const ps = this.players; if (!ps.length) return;
    const cx = lm => { const h = (lm[L.lh].x + lm[L.rh].x) / 2, s = (lm[L.ls].x + lm[L.rs].x) / 2; return (lm[L.lh].v > 0.4 ? h : s); };
    const size = lm => Math.abs(lm[L.ls].x - lm[L.rs].x) + Math.abs(lm[L.ls].y - lm[L.lh].y);
    let assigned = [];
    if (ps.length === 1) {
      if (poses.length) {
        let best = null, bs = -1;
        for (const lm of poses) { const sc = size(lm) - Math.abs(cx(lm) - 0.5) * 0.3; if (sc > bs) { bs = sc; best = lm; } }
        assigned = [best];
      }
    } else {
      const xs = poses.map(cx);
      const last = ps.map((P, i) => P.lastX ?? (i === 0 ? 0.3 : 0.7));
      if (poses.length >= 2) {
        // 가장 큰 두 명만 사용
        const idx = poses.map((lm, i) => [size(lm), i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(a => a[1]);
        const [a, b] = idx;
        const c1 = Math.abs(xs[a] - last[0]) + Math.abs(xs[b] - last[1]);
        const c2 = Math.abs(xs[b] - last[0]) + Math.abs(xs[a] - last[1]);
        assigned = c1 <= c2 ? [poses[a], poses[b]] : [poses[b], poses[a]];
      } else if (poses.length === 1) {
        const d0 = Math.abs(xs[0] - last[0]), d1 = Math.abs(xs[0] - last[1]);
        assigned = d0 <= d1 ? [poses[0], null] : [null, poses[0]];
      }
    }
    ps.forEach((P, i) => {
      const lm = assigned[i];
      if (!lm) { if (t - P.lastSeen > 0.4) P.present = false; return; }
      P.present = true; P.lastSeen = t; P.lastX = cx(lm);
      if (!P.lm) P.lm = lm.map(p => ({ ...p }));
      else { const a = 0.55; for (let k = 0; k < lm.length; k++) { const q = P.lm[k], p = lm[k]; q.x = lerp(q.x, p.x, a); q.y = lerp(q.y, p.y, a); q.v = p.v; } }
    });
    if (ps.length === 2 && ps[0].present && ps[1].present) {
      const swapped = ps[0].lastX > ps[1].lastX + 0.04;
      if (swapped) { ps[0].swapSince ??= t; } else ps[0].swapSince = null;
      this.swapped = swapped && t - ps[0].swapSince > 1;
      this.tooClose = Math.abs(ps[0].lastX - ps[1].lastX) < 0.2;
    } else { this.swapped = false; this.tooClose = false; }
  },

  refreshHands(view) {
    for (const P of this.players) {
      if (!P.lm) continue;
      const pairs = [[L.lw, L.le, L.li], [L.rw, L.re, L.ri]];
      pairs.forEach(([w, e, ix], h) => {
        const W = P.lm[w], E = P.lm[e], I = P.lm[ix];
        const ext = this.mode === 'camera' ? 0.28 : 0;
        let x = W.x + (W.x - E.x) * ext, y = W.y + (W.y - E.y) * ext;
        if (I && I.v > 0.5) { x = (x + I.x) / 2; y = (y + I.y) / 2; }
        const p = view.toPx(x, y), H = P.hands[h];
        H.ok = W.v > 0.35;
        if (H.px == null) { H.px = p.x; H.py = p.y; }
        const prevx = H.px, prevy = H.py;
        H.px = lerp(H.px, p.x, 0.6); H.py = lerp(H.py, p.y, 0.6);
        const mv = Math.hypot(H.px - prevx, H.py - prevy);
        if (P.present && H.ok && mv < view.H * 0.2) P.motion += mv / view.H; // 화면 높이 기준 상대 이동량
        H.trail.push({ x: H.px, y: H.py }); if (H.trail.length > 10) H.trail.shift();
      });
    }
  },

  // ---------- 마우스 시연 모드: 가상의 몸을 만들어 같은 판정 로직을 탄다 ----------
  demoPoses() {
    const n = this.players.length, m = this.demo.mouse;
    const res = [];
    for (let i = 0; i < n; i++) {
      const cx = n === 1 ? 0.5 : (i === 0 ? 0.3 : 0.7);
      const active = n === 1 || (m.x < 0.5 ? i === 0 : i === 1);
      const g = active ? (this.demo.gesture || 'none') : 'none';
      const target = active && g === 'none' && m.inside ? m : null;
      res.push(makePose(cx, 0.36, 0.14, g === 'squat' && this.posture === 'seat' ? 'knee' : g, target, i === 0 ? -1 : 1, now() + i));
    }
    return res;
  }
};

function newPlayer(i) {
  return { idx: i, color: PCOL[i], lm: null, present: false, lastSeen: -9, lastX: null, base: null, baseSamples: [], gesture: 'none', gestureSince: 0, motion: 0, raises: 0, squats: 0, maxArm: 0, wasUp: false, wasLow: false, hands: [{ px: null, py: null, trail: [], ok: false }, { px: null, py: null, trail: [], ok: false }] };
}

/* 기준 자세(선 자세 어깨 높이·무릎 높이·몸통 길이) */
// x는 화면 너비 기준이므로 화면비(AR)를 곱해 세로와 같은 단위로 맞춘다
function AR() { return (Pose.vw || 1280) / (Pose.vh || 720); }
function torsoLen(lm) { const ar = AR(); const s = { x: (lm[L.ls].x + lm[L.rs].x) / 2, y: (lm[L.ls].y + lm[L.rs].y) / 2 }, h = { x: (lm[L.lh].x + lm[L.rh].x) / 2, y: (lm[L.lh].y + lm[L.rh].y) / 2 }; const t = Math.hypot((s.x - h.x) * ar, (s.y - h.y)); const sw = Math.abs(lm[L.ls].x - lm[L.rs].x) * ar * 1.7; return lm[L.lh].v > 0.4 ? Math.max(t, sw * 0.8) : sw; }
function sampleBase(P) {
  if (!P.lm) return; const lm = P.lm;
  P.baseSamples.push({ sy: (lm[L.ls].y + lm[L.rs].y) / 2, lk: lm[L.lk].y, rk: lm[L.rk].y, t: torsoLen(lm) });
  if (P.baseSamples.length > 45) P.baseSamples.shift();
  const med = k => { const a = P.baseSamples.map(s => s[k]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  P.base = { sy: med('sy'), lk: med('lk'), rk: med('rk'), t: med('t') };
}

function classify(P, posture, t) {
  if (!P.lm || !P.present) { commitGesture(P, 'none', t); return; }
  const lm = P.lm, ar = AR();
  if (!P.base) sampleBase(P);
  const T = Math.max(0.05, torsoLen(lm));
  const sL = lm[L.ls], sR = lm[L.rs], wL = lm[L.lw], wR = lm[L.rw], nose = lm[L.nose];
  const hipsSeen = lm[L.lh].v > 0.4 && lm[L.rh].v > 0.4;
  const hipY = hipsSeen ? (lm[L.lh].y + lm[L.rh].y) / 2 : (sL.y + sR.y) / 2 + T;
  const sy = (sL.y + sR.y) / 2;
  const vis = p => p.v > 0.3;
  const dt = Math.min(0.2, Math.max(0, t - (P.lastClassT ?? t))); P.lastClassT = t;

  // ---- 팔 자세 (어깨 기준 상대 위치라 서 있는 거리·카메라 각도와 무관) ----
  const upL = vis(wL) && wL.y < Math.min(nose.y + 0.05 * T, sL.y - 0.3 * T);
  const upR = vis(wR) && wR.y < Math.min(nose.y + 0.05 * T, sR.y - 0.3 * T);
  let arm = 'none';
  if (upL && upR) arm = 'up';
  else if (upL) arm = 'left';
  else if (upR) arm = 'right';
  else if (vis(wL) && vis(wR) && (sL.x - wL.x) * ar > 0.45 * T && (wR.x - sR.x) * ar > 0.45 * T && Math.abs(wL.y - sL.y) < 0.45 * T && Math.abs(wR.y - sR.y) < 0.45 * T) arm = 'tee';
  else if (vis(wL) && vis(wR) && wL.y > sy - 0.35 * T && wR.y > sy - 0.35 * T && wL.y < hipY + 0.15 * T && wR.y < hipY + 0.15 * T) {
    if ((wL.x - wR.x) * ar > 0.1 * T) arm = 'cross';
    else if (Math.hypot((wL.x - wR.x) * ar, wL.y - wR.y) < 0.42 * T) arm = 'clap';
  }

  // ---- 다리 자세 ----
  const kneeAng = (h, k, a) => { if (lm[h].v < 0.5 || lm[k].v < 0.5 || lm[a].v < 0.5) return null; const v1 = { x: (lm[h].x - lm[k].x) * ar, y: lm[h].y - lm[k].y }, v2 = { x: (lm[a].x - lm[k].x) * ar, y: lm[a].y - lm[k].y }; const c = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) + 1e-9); return Math.acos(clamp(c, -1, 1)) * 180 / Math.PI; };
  const aL = kneeAng(L.lh, L.lk, L.la), aR = kneeAng(L.rh, L.rk, L.ra);
  // 선 자세 기준: 최근 가장 높았던 어깨 높이(천천히 현재 쪽으로 따라옴) → 다가서거나 각도가 바뀌어도 몇 초 안에 스스로 맞춰짐
  P.topY = P.topY == null ? sy : Math.min(sy, P.topY + 0.25 * T * dt);
  let leg = 'none';
  if (posture === 'stand') {
    if (aL != null && aR != null) { if ((aL + aR) / 2 < 150) leg = 'squat'; }
    else if (sy > P.topY + 0.22 * T) leg = 'squat';
    // 무릎 들기(선 자세): 한쪽 무릎이 엉덩이 높이 가까이 올라옴
    if (leg === 'none' && hipsSeen) {
      const kl = lm[L.lk].v > 0.5 && lm[L.lk].y < hipY + 0.4 * T, kr = lm[L.rk].v > 0.5 && lm[L.rk].y < hipY + 0.4 * T;
      if (kl !== kr) leg = 'knee';
    }
  } else {
    // 앉은 자세 무릎 들기 — 세 가지 신호 중 하나라도 넘으면 인식
    //  ① 두 무릎의 높이 차이(한쪽만 올라감)  ② 두 발목의 높이 차이  ③ (한쪽 무릎만 보일 때) 평소보다 올라간 무릎
    //  ①② 는 몸통이 앞뒤로 기울거나 엉덩이가 의자에 가려져도 흔들리지 않음. 길이 단위는 어깨너비(앉아도 늘 보임)
    //  들고 있는 동안은 기준을 얼려 두고(천천히 들어도·오래 들고 있어도 인식), 내릴 때 문턱을 낮춰(되돌이) 깜빡이지 않게
    const lifting = P.gesture === 'knee' || P.cand === 'knee';
    const swRaw = Math.abs(sL.x - sR.x) * ar * 1.7;
    P.sTs = P.sTs == null ? swRaw : P.sTs + (swRaw - P.sTs) * Math.min(1, dt * 2);
    const Ts = Math.max(0.05, P.sTs), vis2 = k => lm[k].v > 0.2;
    const sm = (key, raw) => (P[key] = P[key] == null ? raw : P[key] + (raw - P[key]) * Math.min(1, dt * 8));
    let lift = false, level = 0, seen = false;
    const pair = (a, b, key, on, off) => {
      if (!vis2(a) || !vis2(b)) return;
      const d = sm(key, (lm[a].y - lm[b].y) / Ts), k0 = key + '0';
      if (P[k0] == null) P[k0] = d;
      const dev = Math.abs(d - P[k0]); level = Math.max(level, dev / on);
      if (dev > (lifting ? off : on)) lift = true;
      else if (!lifting && dev < on * 0.5) P[k0] += (d - P[k0]) * Math.min(1, dt * 0.5);   // 평소 짝짝이 자세는 천천히 따라감
    };
    pair(L.lk, L.rk, 'kDiff', 0.07, 0.045); if (vis2(L.lk) && vis2(L.rk)) seen = true;
    pair(L.la, L.ra, 'aDiff', 0.10, 0.07);
    if (!(vis2(L.lk) && vis2(L.rk))) for (const k of [L.lk, L.rk]) {
      if (!vis2(k)) continue; seen = true;
      const r = sm('kAb' + k, (lm[k].y - sy) / Ts), key = 'kRest' + k;
      if (P[key] == null || r > P[key]) P[key] = r;
      const dev = P[key] - r; level = Math.max(level, dev / 0.12);
      if (dev > (lifting ? 0.08 : 0.12)) lift = true; else if (!lifting) P[key] -= 0.02 * dt;
    }
    P.kneesSeen = seen; P.kneeLevel = clamp(level, 0, 1.5);
    if (lift) leg = 'knee';
  }

  // 팔 동작이 분명하면 팔이 우선, 아니면 다리 동작
  let g = arm;
  if (leg !== 'none' && (arm === 'none' || arm === 'clap')) g = leg;

  // 신체 지표
  if (g === 'up' && !P.wasUp) P.raises++; P.wasUp = g === 'up';
  const low = g === 'squat' || g === 'knee';
  if (low && !P.wasLow) P.squats++; P.wasLow = low;
  const ang = (s, w) => { const a = Math.atan2(-(w.y - s.y), Math.abs((w.x - s.x) * ar)); return clamp(90 + a * 180 / Math.PI, 0, 180); };
  if (vis(wL)) P.maxArm = Math.max(P.maxArm, ang(sL, wL));
  if (vis(wR)) P.maxArm = Math.max(P.maxArm, ang(sR, wR));
  commitGesture(P, g, t);
}
// 흔들림 방지: 새 자세가 0.12초 이어져야 바뀜, 'none'으로 잠깐 튀는 것(0.2초)은 무시
function commitGesture(P, g, t) {
  if (g === P.gesture) { P.cand = null; return; }
  if (P.cand !== g) { P.cand = g; P.candSince = t; return; }
  if (t - P.candSince >= (g === 'none' ? 0.2 : 0.12)) { setGesture(P, g, t); P.cand = null; }
}
function setGesture(P, g, t) { if (P.gesture !== g) { P.gesture = g; P.gestureSince = t; } }
// 유지 시간은 자세가 기록된 시계(now)로 잼 — 게임 안 경과시간과 섞지 않음
function heldFor(P, g) { return P.gesture === g ? now() - P.gestureSince : 0; }

/* 자세 틀: 시연 모드의 가상 몸, 동작 시범 캐릭터에 함께 사용 */
function makePose(cx, sy, u, g, target, side = -1, tt = 0) {
  const A = 16 / 9; // x는 화면 너비 기준이라 비율 보정
  const P = (dx, dy) => ({ x: cx + dx * u / A, y: sy + dy * u, v: 1 });
  let drop = 0; if (g === 'squat') drop = 0.45;
  const lm = new Array(33).fill(0).map(() => ({ x: cx, y: sy, v: 0.2 }));
  const set = (i, dx, dy) => { const p = P(dx, dy + drop); lm[i] = p; };
  const bob = Math.sin(tt * 2) * 0.02;
  set(0, 0, -0.62 + bob); set(2, -0.12, -0.72 + bob); set(5, 0.12, -0.72 + bob); set(7, -0.22, -0.66); set(8, 0.22, -0.66);
  set(11, -0.55, 0); set(12, 0.55, 0);
  set(23, -0.35, 1.3); set(24, 0.35, 1.3);
  set(25, -0.36, 2.05); set(26, 0.36, 2.05); set(27, -0.36, 2.8); set(28, 0.36, 2.8);
  if (g === 'squat') { set(25, -0.55, 1.75); set(26, 0.55, 1.75); set(23, -0.35, 1.25); set(24, 0.35, 1.25); set(27, -0.4, 2.35); set(28, 0.4, 2.35); }
  if (g === 'knee') { set(25, -0.36, 1.55); set(27, -0.36, 2.2); }
  const arm = (s, e, w, el, wr) => { set(e, el[0], el[1]); set(w, wr[0], wr[1]); };
  const down = sd => arm(0, sd < 0 ? 13 : 14, sd < 0 ? 15 : 16, [sd * 0.68, 0.6], [sd * 0.72, 1.12]);
  const upA = sd => arm(0, sd < 0 ? 13 : 14, sd < 0 ? 15 : 16, [sd * 0.75, -0.6], [sd * 0.55, -1.2]);
  switch (g) {
    case 'up': upA(-1); upA(1); break;
    case 'left': upA(-1); down(1); break;
    case 'right': down(-1); upA(1); break;
    case 'tee': arm(0, 13, 15, [-1.05, 0], [-1.6, -0.05]); arm(0, 14, 16, [1.05, 0], [1.6, -0.05]); break;
    case 'cross': arm(0, 13, 15, [-0.6, 0.55], [0.3, 0.4]); arm(0, 14, 16, [0.6, 0.55], [-0.3, 0.4]); break;
    case 'clap': arm(0, 13, 15, [-0.5, 0.6], [-0.06, 0.38]); arm(0, 14, 16, [0.5, 0.6], [0.06, 0.38]); break;
    case 'squat': arm(0, 13, 15, [-0.45, 0.5], [-0.3, 0.45]); arm(0, 14, 16, [0.45, 0.5], [0.3, 0.45]); break;
    default: down(-1); down(1);
  }
  if (target) {
    // 마우스 쪽 손이 마우스를 따라감
    const useR = target.x > cx; const sI = useR ? 12 : 11, eI = useR ? 14 : 13, wI = useR ? 16 : 15, iI = useR ? 20 : 19;
    const s = lm[sI]; const wx = target.x, wy = target.y;
    lm[wI] = { x: wx, y: wy, v: 1 }; lm[eI] = { x: (s.x + wx) / 2 + (useR ? 0.02 : -0.02), y: (s.y + wy) / 2 + 0.03, v: 1 };
  }
  for (const [w, e, ix] of [[15, 13, 19], [16, 14, 20]]) { const W = lm[w], E = lm[e]; lm[ix] = { x: W.x + (W.x - E.x) * 0.25, y: W.y + (W.y - E.y) * 0.25, v: target ? 0 : 1 }; }
  return lm;
}
