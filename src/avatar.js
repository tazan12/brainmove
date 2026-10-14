/* ================= 3D 안내 인물 (three.js · 뼈대 있는 실사풍 캐릭터) =================
   동작마다 '팔·다리가 향할 방향'을 정해 두고, 관절을 그 방향으로 돌려(조준) 자세를 만든다.
   화면 기준으로 정의: 시범 인물이 거울처럼 서 있으므로 '왼팔 위로'는 화면 왼쪽 팔이 올라감. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const AV = window.Avatar = Object.assign(window.Avatar || {}, { ready: false, error: '' });
const seated = () => (AV.posture || window.BM_POSTURE) === 'seat';
const RW = 360, RH = 480;
let renderer, camera, base, envTex, sambaClip, height = 1.7, SL = 'Right', SR = 'Left';
const actors = {}, targetCache = {}, thumbs = {};
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const DOWN = { sl: [V(-0.16, -1, 0.06), V(-0.08, -1, 0.14)], sr: [V(0.16, -1, 0.06), V(0.08, -1, 0.14)] };
const UPA = { sl: [V(-0.3, 1, 0.05), V(-0.1, 1, 0)], sr: [V(0.3, 1, 0.05), V(0.1, 1, 0)] };
const LEGS = { sl: [V(-0.06, -1, 0), V(0, -1, 0)], sr: [V(0.06, -1, 0), V(0, -1, 0)] };
const POSES = {
  none: { sl: DOWN.sl, sr: DOWN.sr },
  wave: { sl: DOWN.sl, sr: [V(0.75, 0.55, 0.15), V(0.15, 1, 0.1)] },
  up: { sl: UPA.sl, sr: UPA.sr },
  left: { sl: UPA.sl, sr: DOWN.sr },
  right: { sl: DOWN.sl, sr: UPA.sr },
  tee: { sl: [V(-1, 0.06, 0), V(-1, 0.1, 0)], sr: [V(1, 0.06, 0), V(1, 0.1, 0)] },
  clap: { sl: [V(-0.3, -0.55, 0.78), V(0.38, 0.22, 0.9)], sr: [V(0.3, -0.55, 0.78), V(-0.38, 0.22, 0.9)] },
  cross: { sl: [V(-0.42, -0.4, 0.8), V(0.95, 0.42, 0.22)], sr: [V(0.42, -0.42, 0.78), V(-0.95, 0.34, 0.36)] },
  squat: { sl: [V(-0.14, -0.08, 1), V(-0.06, 0, 1)], sr: [V(0.14, -0.08, 1), V(0.06, 0, 1)], legs: { sl: [V(-0.16, -0.38, 0.92), V(-0.02, -1, -0.32)], sr: [V(0.16, -0.38, 0.92), V(0.02, -1, -0.32)] }, drop: 0.2, lean: 0.28 },
  knee: { sl: [V(-0.5, -0.85, 0.12), V(-0.3, -0.95, 0.12)], sr: [V(0.5, -0.85, 0.12), V(0.3, -0.95, 0.12)], legs: { sl: [V(-0.08, -0.05, 1), V(0, -1, 0.05)], sr: LEGS.sr } },
  neck: { sl: DOWN.sl, sr: DOWN.sr },
  shoulder: { sl: [V(-0.3, -1, 0.1), V(-0.2, -0.6, 0.8)], sr: [V(0.3, -1, 0.1), V(0.2, -0.6, 0.8)] }
};
// 앉은 자세: 엉덩이를 내리고 허벅지는 앞으로, 정강이는 아래로. 팔을 쓰지 않는 동작은 손을 무릎 위에
const SEAT_DROP = 0.235;
const SEAT_LEGS = { sl: [V(-0.12, -0.04, 1), V(-0.02, -1, 0.06)], sr: [V(0.12, -0.04, 1), V(0.02, -1, 0.06)] };
const LAP = { sl: [V(-0.12, -1, 0.35), V(-0.02, -0.35, 1)], sr: [V(0.12, -1, 0.35), V(0.02, -0.35, 1)] };
const SEAT_KNEE = { legs: { sl: [V(-0.1, 0.5, 0.86), V(-0.02, -0.92, 0.38)], sr: SEAT_LEGS.sr }, sl: LAP.sl, sr: LAP.sr };
const KEYS = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];

function findBones(root) { const B = {}; root.traverse(o => { if (!o.isBone) return; const k = o.name.replace(/^mixamorig[:_]?/i, ''); if (KEYS.includes(k) && !B[k]) B[k] = o; }); return B; }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function aim(bone, child, dir) {
  if (!bone || !child) return;
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  const cur = _b.sub(_a).normalize();
  _q.setFromUnitVectors(cur, dir);
  bone.getWorldQuaternion(_wq); _wq.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq); _pq.invert();
  bone.quaternion.copy(_pq.multiply(_wq));
  bone.updateMatrixWorld(true);
}
function makeActor(id) {
  const root = SkeletonUtils.clone(base);
  const scene = new THREE.Scene(); scene.environment = envTex;
  const pivot = new THREE.Group(); pivot.add(root); scene.add(pivot);
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x1b2244, 0.9));
  const key = new THREE.DirectionalLight(0xffe7c4, 2.0); key.position.set(-1.5, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 1.6); rim.position.set(2, 2.5, -3); scene.add(rim);
  const B = findBones(root), bind = {};
  for (const k in B) bind[k] = B[k].quaternion.clone();
  const mixer = new THREE.AnimationMixer(root);
  const a = { id, root, scene, pivot, B, bind, hip0: B.Hips.position.clone(), hipCur: B.Hips.position.clone(), cur: {}, pose: 'none', danceUntil: 0, mixer, samba: sambaClip ? mixer.clipAction(sambaClip) : null, last: performance.now() / 1000 };
  // 나무 의자(앉은 자세일 때만 보임)
  root.updateMatrixWorld(true);
  const hipW = B.Hips.getWorldPosition(new THREE.Vector3()), h = height, seatY = hipW.y - SEAT_DROP * h - 0.035 * h;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6B4426, roughness: 0.55, metalness: 0.05 }), cushion = new THREE.MeshStandardMaterial({ color: 0x8E2F2A, roughness: 0.8 });
  const chair = new THREE.Group(), box = (w, hh, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); o.position.set(x, y, z); chair.add(o); };
  const W = 0.3 * h, D = 0.26 * h, cz = hipW.z + 0.07 * h, t = 0.03 * h;
  box(W, t, D, hipW.x, seatY - t / 2, cz, wood); box(W * 0.92, t * 0.6, D * 0.9, hipW.x, seatY + t * 0.2, cz, cushion);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(t, seatY - t, t, hipW.x + sx * (W / 2 - t), (seatY - t) / 2, cz + sz * (D / 2 - t), wood);
  box(W, 0.3 * h, t, hipW.x, seatY + 0.15 * h, cz - D / 2 + t / 2, wood);
  chair.visible = false; pivot.add(chair); a.chair = chair;
  for (const k in bind) a.cur[k] = bind[k].clone();
  return a;
}
function targets(a, name) {
  const seat = seated(), key = (seat ? 'S:' : '') + name;
  if (targetCache[key]) return targetCache[key];
  let P = POSES[name] || POSES.none;
  if (seat) {
    if (name === 'knee' || name === 'squat') P = SEAT_KNEE;
    else { const armsIdle = name === 'none' || name === 'neck'; P = { sl: armsIdle ? LAP.sl : P.sl, sr: armsIdle ? LAP.sr : P.sr, legs: SEAT_LEGS }; }
    P = Object.assign({}, P, { legs: P.legs || SEAT_LEGS, drop: SEAT_DROP, lean: 0 });
  }
  const B = a.B, yaw = a.pivot.rotation.y; a.pivot.rotation.y = 0; a.pivot.updateMatrixWorld(true);
  for (const k in a.bind) B[k].quaternion.copy(a.bind[k]);
  B.Hips.position.copy(a.hip0); a.root.updateMatrixWorld(true);
  if (P.drop) { const wp = B.Hips.getWorldPosition(new THREE.Vector3()); wp.y -= P.drop * height; B.Hips.parent.worldToLocal(wp); B.Hips.position.copy(wp); a.root.updateMatrixWorld(true); }
  if (P.lean) aim(B.Spine, B.Spine1, V(0, 1, P.lean));
  aim(B[SL + 'Arm'], B[SL + 'ForeArm'], P.sl[0]); aim(B[SL + 'ForeArm'], B[SL + 'Hand'], P.sl[1]);
  aim(B[SR + 'Arm'], B[SR + 'ForeArm'], P.sr[0]); aim(B[SR + 'ForeArm'], B[SR + 'Hand'], P.sr[1]);
  const lg = P.legs || LEGS;
  aim(B[SL + 'UpLeg'], B[SL + 'Leg'], lg.sl[0]); aim(B[SL + 'Leg'], B[SL + 'Foot'], lg.sl[1]);
  aim(B[SR + 'UpLeg'], B[SR + 'Leg'], lg.sr[0]); aim(B[SR + 'Leg'], B[SR + 'Foot'], lg.sr[1]);
  const out = { q: {}, hip: B.Hips.position.clone() };
  for (const k in a.bind) out.q[k] = B[k].quaternion.clone();
  for (const k in a.bind) B[k].quaternion.copy(a.cur[k]); B.Hips.position.copy(a.hipCur);
  a.pivot.rotation.y = yaw; a.pivot.updateMatrixWorld(true);
  return targetCache[key] = out;
}
const _e = new THREE.Euler(), _x = new THREE.Quaternion();
function step(a, name, t, dt, instant) {
  const B = a.B, seat = seated();
  if (a.chair) a.chair.visible = seat;
  // 앉은 자세는 비스듬히(약 35°) 보여 줘야 의자에 앉은 모습이 읽힘
  const yawT = seat ? -0.62 : 0; a.pivot.rotation.y = instant ? yawT : a.pivot.rotation.y + (yawT - a.pivot.rotation.y) * Math.min(1, dt * 6);
  // 앉은 자세에서는 춤 대신 앉은 채로 만세·박수로 축하
  if (seat && t < a.danceUntil) name = Math.floor(t * 2.2) % 2 ? 'up' : 'clap';
  if (!seat && t < a.danceUntil && a.samba) {
    if (!a.samba.isRunning()) { a.samba.reset().fadeIn(0.3).play(); }
    a.mixer.update(dt);
    for (const k in a.bind) a.cur[k].copy(B[k].quaternion); a.hipCur.copy(B.Hips.position);
    return;
  }
  if (a.samba && a.samba.isRunning()) a.samba.stop();
  const T = targets(a, name), k = instant ? 1 : 1 - Math.exp(-dt * 9);
  for (const key in a.bind) { a.cur[key].slerp(T.q[key], k); B[key].quaternion.copy(a.cur[key]); }
  a.hipCur.lerp(T.hip, k); B.Hips.position.copy(a.hipCur);
  if (instant) return;
  // 숨쉬기·고개 움직임
  if (B.Spine2) { _x.setFromEuler(_e.set(Math.sin(t * 1.7) * 0.02, 0, 0)); B.Spine2.quaternion.multiply(_x); }
  if (B.Head) {
    if (name === 'neck') _x.setFromEuler(_e.set(Math.sin(t * 1.4) * 0.25, Math.cos(t * 1.4) * 0.45, 0));
    else _x.setFromEuler(_e.set(0.04, Math.sin(t * 0.8) * 0.08, Math.sin(t * 0.6) * 0.03));
    B.Head.quaternion.multiply(_x);
  }
  if (name === 'shoulder') for (const s of ['LeftShoulder', 'RightShoulder']) if (B[s]) { _x.setFromEuler(_e.set(Math.sin(t * 3) * 0.25, 0, Math.cos(t * 3) * 0.2)); B[s].quaternion.multiply(_x); }
  if (name === 'wave' && B[SR + 'ForeArm']) { _x.setFromEuler(_e.set(0, 0, Math.sin(t * 7) * 0.35)); B[SR + 'ForeArm'].quaternion.multiply(_x); }
}
// 2D 캔버스에 실시간 인물 그리기: (cx, 발끝 y, 높이 px)
AV.draw = (g, key, name, cx, bottom, hpx, t) => {
  if (!AV.ready) return false;
  const a = actors[key] || (actors[key] = makeActor(key));
  const now = performance.now() / 1000, dt = Math.min(0.1, now - a.last); a.last = now;
  step(a, name, t ?? now, dt);
  renderer.render(a.scene, camera);
  const w = hpx * RW / RH; g.drawImage(renderer.domElement, cx - w / 2, bottom - hpx, w, hpx);
  return true;
};
AV.celebrate = (key, secs = 2.5) => { const a = actors[key]; if (a) a.danceUntil = performance.now() / 1000 + secs; else { setTimeout(() => AV.celebrate(key, secs), 50); } };
AV.thumb = name => {
  if (!AV.ready) return null; const tk = (seated() ? 'S:' : '') + name; if (thumbs[tk]) return thumbs[tk];
  const a = actors.__thumb || (actors.__thumb = makeActor('__thumb'));
  step(a, name, 0, 0, true); renderer.render(a.scene, camera);
  const c = document.createElement('canvas'); c.width = RW / 2; c.height = RH / 2; c.getContext('2d').drawImage(renderer.domElement, 0, 0, c.width, c.height);
  return thumbs[tk] = c;
};

(async () => {
  try {
    const src = window.AVATAR_SRC; if (!src) throw new Error('no model');
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(RW, RH, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    // 파일로 열었을 때(file://) 텍스처가 막히지 않도록 이미지 태그 방식으로 읽게 함
    const cib = window.createImageBitmap; try { window.createImageBitmap = undefined; } catch (e) { }
    let gltf; try { gltf = await new GLTFLoader().loadAsync(src); } finally { try { window.createImageBitmap = cib; } catch (e) { } }
    base = gltf.scene; sambaClip = gltf.animations.find(c => /samba/i.test(c.name)) || null;
    // 춤 동작만 다른 파일에서 빌려 쓰기(같은 Mixamo 뼈대 이름)
    if (!sambaClip && window.AVATAR_DANCE_SRC) { try { const cib2 = window.createImageBitmap; window.createImageBitmap = undefined; const d = await new GLTFLoader().loadAsync(window.AVATAR_DANCE_SRC); window.createImageBitmap = cib2; sambaClip = d.animations.find(c => /samba/i.test(c.name)) || null; if (sambaClip) sambaClip.tracks = sambaClip.tracks.filter(t => !/position$/.test(t.name)); } catch (e) { } }
    base.traverse(o => {
      if (!o.isMesh) return; o.frustumCulled = false;
      const m = o.material; if (!m) return; m.envMapIntensity = 0.8;
      // 마네킹(Xbot)은 상아빛 몸 + 금빛 관절로 다시 칠함 — 나전 인형 느낌
      if (/Joints/i.test(m.name)) o.material = new THREE.MeshStandardMaterial({ color: 0xD8AE55, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.1 });
      else if (/Beta|Limbs|Surface/i.test(m.name)) o.material = new THREE.MeshStandardMaterial({ color: 0xF1E7D6, metalness: 0.05, roughness: 0.42, envMapIntensity: 0.9 });
    });
    // 키·방향 맞추기
    const B = findBones(base); base.updateMatrixWorld(true);
    const wy = b => b.getWorldPosition(new THREE.Vector3()).y;
    const footY = Math.min(wy(B.LeftFoot), wy(B.RightFoot)), headY = wy(B.Head);
    height = (headY - footY) * 1.13; // 머리 꼭대기·발바닥 여유
    base.position.y -= footY - height * 0.045; base.updateMatrixWorld(true);
    const lx = B.LeftArm.getWorldPosition(new THREE.Vector3()).x, rx = B.RightArm.getWorldPosition(new THREE.Vector3()).x;
    if (lx < rx) base.rotation.y = Math.PI; // 정면이 카메라 쪽을 보도록
    base.updateMatrixWorld(true);
    camera = new THREE.PerspectiveCamera(26, RW / RH, 0.1, 100);
    const fh = height * 1.32, dist = (fh / 2) / Math.tan(THREE.MathUtils.degToRad(13));
    camera.position.set(0, height * 0.6, dist); camera.lookAt(0, height * 0.6, 0);
    AV.ready = true; window.dispatchEvent(new Event('avatar-ready'));
  } catch (e) { AV.error = String(e && e.message || e); console.warn('3D 인물을 불러오지 못해 2D 그림으로 대신합니다:', e); }
})();
