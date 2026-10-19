/* ================= 성우 모드 (캐릭터 해설) =================
   이 컴퓨터의 한국어 음성은 2개(크롬 음성·윈도우 해미)뿐이라, 음높이만으로는 캐릭터가 구분되지 않는다.
   그래서 캐릭터마다 네 겹으로 개성을 준다.
   ① 목소리 바탕: 음성 엔진 + 안전한 범위 안의 음높이·빠르기 (크롬 0.85~1.1, 해미 0.75~1.3)
   ② 말 가락: 문장을 마디로 나눠 마디마다 높낮이·빠르기를 달리 (MC는 "자~" 늘이고, 내관은 쉼표마다 끊고 끝을 내리고, 캐스터는 갈수록 올라감)
   ③ 시그니처 소리: 말 앞에 꽹과리·징·호루라기·실로폰 같은 효과음
   ④ 화면: 캐릭터 색 도장, 자막이 나타나는 방식, 칭찬 글자
   동작 이름·체조 안내처럼 따라 해야 하는 말(plain)은 효과음 없이 또렷하게. 모든 대사는 존댓말. {name}=참여자 이름 */
const PERSONAS = {
  basic: {
    name: '무브 선생님', seal: '무', color: '#7FC8A9', ink: '#10261D', desc: '차분하고 다정한 기본 안내',
    engine: 'google', pitch: 1.0, rate: 0.95, split: null, anim: 'fade',
    sample: '안녕하세요, 저는 무브 선생님이에요. 오늘도 천천히 함께 움직여 봐요.',
    words: { combo5: '좋아요!', combo10: '훌륭해요!', oops: ['괜찮아요!', '다시 해 봐요', '천천히!'] },
    lines: {
      gameStart: ['{game}에 왔어요. {how}.'],
      combo5: ['잘하고 계세요!', '좋아요, 그대로요!'], combo10: ['열 번 연속! 정말 대단해요.'],
      fever: ['피버 타임이에요! 점수가 두 배예요.'], nice: ['좋아요!', '정확해요!'],
      oops: ['괜찮아요, 다시 해 봐요.'], encourage: ['천천히 해도 괜찮아요.'],
      boss: ['마지막 도전이에요. 조금 더 빨라져요!'],
      danceWatch: ['잘 보세요. {n}개 동작이에요.'], danceGo: ['이제 따라 해 보세요!'], danceDone: ['공연 성공이에요! 박수!'], danceFail: ['아쉬워요. 다음엔 할 수 있어요.'],
      constellation: ['{star}를 완성했어요!'], treasure: ['보물 상자를 열었어요!'], twin: ['쌍둥이 풍선이에요! 두 분이 같이 터치해요.'],
      harmony: ['두 분 호흡이 척척 맞아요!'], teamGoal: ['팀 목표를 이뤘어요!'], highfive: ['하이파이브! 멋져요.'],
      warmup: ['아침 체조로 몸을 깨워 볼게요.'], cooldown: ['이제 노을 스트레칭으로 천천히 마무리해요.'],
      rest: ['잘하셨어요. 물 한 모금 마시고 숨을 골라요. 다음은 {next}예요.'],
      calibDone: ['준비 완료예요! 오늘은 제가 무브 선생님으로 함께할게요.'], end: ['{name}, 오늘도 정말 잘하셨어요!']
    }
  },
  trot: {
    name: '흥부자 MC', seal: '흥', color: '#FF7A59', ink: '#2A0D06', desc: '잔치 사회자처럼 꺾고 늘이며 신나게',
    engine: 'google', pitch: 1.04, rate: 1.08, split: /[~!?]/, anim: 'bounce',
    sample: '자~ 오늘의 주인공 납시었습니다~! 박수 한번 크게 주세요~!',
    words: { combo5: '얼씨구!', combo10: '지화자!', oops: ['아이고~', '한 번 더~', '괜찮아요~'] },
    lines: {
      gameStart: ['자~ 다음 무대는~ {game}! {how}. 박수 준비 되셨죠~?', '얼씨구~ {game}에 오셨습니다~! {how}.', '네~ 이번 순서는~ {game}! {how}. 신나게 가 봅시다~!'],
      combo5: ['얼씨구~ 좋다!', '지화자~ 좋구나!', '오~ 흥이 오릅니다~!', '절씨구~!'], combo10: ['열 번 연속~! 이 정도면 노래자랑 인기상입니다~!', '와~ 무대를 뒤집으셨어요~!', '어머나~ 이분 누구세요~! 박수~!'],
      fever: ['피버 타임~! 다 같이 흔들어 주세요~!', '잔치가 무르익었습니다~! 점수 두 배~!'], nice: ['좋다~!', '그렇지요~!', '캬~!', '얼쑤~!'],
      oops: ['괜찮아요~ 노래도 한 소절 틀려야 맛이죠~!', '아이고~ 아까워라~!', '어허~ 한 번 더 갑니다~!'], encourage: ['천천히~ 천천히~ 흥은 안 도망가요~!', '쉬엄쉬엄~ 박자는 제가 맞춰 드릴게요~!'],
      boss: ['자~ 마지막 무대! 앵콜 들어갑니다~!', '클라이맥스~! 꽉 잡으세요~!'],
      danceWatch: ['자~ 잘 보세요~! {n}개 동작 들어갑니다~!', '조명~ 음악~! {n}개 동작 갑니다~!'], danceGo: ['자~ 이제 주인공 차례~! 따라 해 주세요~!'], danceDone: ['앵콜~! 앵콜~! 공연 대성공입니다~!', '얼씨구~ 기립 박수~!'], danceFail: ['아이고~ 다음 무대에서 다시 갑니다~!'],
      constellation: ['{star} 완성~! 밤하늘이 박수를 칩니다~!'], treasure: ['보물 상자 열렸습니다~! 경품 당첨~!'], twin: ['쌍둥이 풍선 등장~! 두 분 손발 맞춰 주세요~!'],
      harmony: ['환상의 듀엣입니다~!', '부부 가수 저리 가라~!'], teamGoal: ['팀 목표 달성~! 꽹과리 울려라~!'], highfive: ['하이파이브~! 오늘의 명콤비 탄생~!'],
      warmup: ['자~ 몸풀기 들어갑니다~! 어깨 들썩들썩~!'], cooldown: ['자~ 이제 숨 고르며~ 노을 스트레칭~ 천천히 갑니다~'],
      rest: ['잠깐 쉬어 가요~! 물 한 모금~! 다음 무대는~ {next}입니다~!'],
      calibDone: ['준비 끝~! 오늘 사회는 저~ 흥부자가 맡았습니다~!'], end: ['오늘의 주인공~ {name}! 큰 박수 부탁드립니다~!']
    }
  },
  sageuk: {
    name: '어전 내관', seal: '內', color: '#B98CE0', ink: '#1C0F2B', desc: '쉼표마다 끊어 아뢰는 사극 말투',
    engine: 'ms', pitch: 0.8, rate: 0.82, split: /[,.!?]/, anim: 'scroll',
    sample: '전하, 오늘도 강녕하시옵니까. 소인, 정성을 다해 모시겠사옵니다.',
    words: { combo5: '옳거니!', combo10: '성은이 망극!', oops: ['송구하옵니다', '다시 하시옵소서', '천천히…'] },
    lines: {
      gameStart: ['전하, {game}에 납시었사옵니다. {how}.', '아뢰옵니다, 전하. {game}이옵니다. {how}.'],
      combo5: ['성은이 망극하옵니다!', '참으로, 훌륭하시옵니다!', '옳거니, 그러하옵니다!'], combo10: ['열 번을 연달아! 온 궁궐이, 놀랐사옵니다!', '이는 실로, 성군의 솜씨이옵니다!'],
      fever: ['경사로다! 피버 타임이옵니다!', '잔치를 열라! 점수가, 곱절이옵니다!'], nice: ['옳사옵니다!', '지당하시옵니다!', '훌륭하옵니다!'],
      oops: ['아뢰옵기 황송하오나, 틀리셨사옵니다.', '송구하오나, 다시 한번 해 보시옵소서.'], encourage: ['서두르지 마시옵소서, 전하. 천천히 하시옵소서.'],
      boss: ['전하, 마지막 관문이옵니다! 서두르시옵소서!'],
      danceWatch: ['살펴보시옵소서, 동작이, {n}개이옵니다.'], danceGo: ['이제, 따라 하시옵소서!'], danceDone: ['어명이오! 공연이, 성공하였사옵니다!'], danceFail: ['송구하옵니다. 다음 기회가, 있사옵니다.'],
      constellation: ['{star}를 이으셨사옵니다! 하늘이, 감복하였나이다.'], treasure: ['보물 상자를, 하사받으셨사옵니다!'], twin: ['두 분께서, 함께 터치하시옵소서!'],
      harmony: ['두 분의 합이, 실로 아름답사옵니다!'], teamGoal: ['팀의 뜻을, 이루셨사옵니다!'], highfive: ['손뼉을 마주치시니, 경사로세!'],
      warmup: ['아침 문안 체조를, 올리겠사옵니다.'], cooldown: ['이제, 옥체를 천천히, 풀어 주시옵소서.'],
      rest: ['잠시, 쉬어 가시옵소서. 다음은, {next}이옵니다.'],
      calibDone: ['채비를, 마쳤사옵니다. 소인이, 곁에서 모시겠사옵니다.'], end: ['{name}, 오늘도, 성은이 망극하옵니다!']
    }
  },
  caster: {
    name: '열혈 캐스터', seal: '中', color: '#5AB0FF', ink: '#06182B', desc: '갈수록 목소리가 올라가는 빠른 중계',
    engine: 'ms', pitch: 0.98, rate: 1.3, split: /[!?]/, anim: 'slide',
    sample: '네, 시청자 여러분! 오늘 경기! 지금 시작합니다!',
    words: { combo5: '나이스!', combo10: '골~인!', oops: ['아~ 아깝다!', '다음 찬스!', '괜찮아요!'] },
    lines: {
      gameStart: ['네! {game} 경기 시작합니다! {how}!', '드디어 {game}! 규칙은 이렇습니다! {how}!', '자! 운명의 {game}! {how}!'],
      combo5: ['들어갑니다! 다섯 개 연속!', '좋습니다! 흐름 탔어요!', '이 선수! 오늘 컨디션 최고입니다!'], combo10: ['열 개 연속! 이건 기록입니다! 기록!', '믿을 수 없습니다! 열 개 연속!', '골! 골! 골인입니다!'],
      fever: ['피버 타임! 경기장이 뜨겁습니다!', '점수 두 배! 지금이 기회입니다!'], nice: ['나이스!', '정확합니다!', '깔끔합니다!'],
      oops: ['아! 아깝습니다!', '아쉬운 장면이네요! 다시 갑니다!'], encourage: ['서두르지 마세요! 아직 시간 충분합니다!'],
      boss: ['마지막 30초! 승부처입니다!', '경기 막판! 여기서 결정됩니다!'],
      danceWatch: ['자! 동작 {n}개! 집중해서 보시죠!'], danceGo: ['이제 선수 차례입니다! 시작!'], danceDone: ['완벽합니다! 공연 성공!', '만점 연기! 관중 기립!'], danceFail: ['아! 아쉽습니다! 다음 라운드를 기대하죠!'],
      constellation: ['{star} 완성! 골인입니다!'], treasure: ['보물 상자 획득! 보너스 점수!'], twin: ['쌍둥이 풍선! 두 선수 동시에 갑니다!'],
      harmony: ['환상의 콤비 플레이!', '눈빛만 봐도 통합니다!'], teamGoal: ['팀 목표 달성! 우승 후보입니다!'], highfive: ['하이파이브! 팀워크 최고!'],
      warmup: ['경기 전 몸풀기! 부상 방지! 중요합니다!'], cooldown: ['경기 종료! 정리운동! 천천히 갑니다.'],
      rest: ['작전 타임! 물 한 모금 드시죠! 다음 경기는 {next}!'],
      calibDone: ['선수 입장 완료! 중계는 열혈 캐스터가 맡겠습니다!'], end: ['오늘의 최우수 선수! {name}!']
    }
  },
  kid: {
    name: '꼬마 응원단', seal: '꼬', color: '#FFD23F', ink: '#2A2200', desc: '통통 튀는 아이 말투로 응원',
    engine: 'ms', pitch: 1.22, rate: 1.06, split: /[~!?]/, anim: 'pop',
    sample: '우와~ 안녕하세요! 저는 꼬마 응원단이에요! 오늘도 같이 놀아요!',
    words: { combo5: '짱!', combo10: '최고최고!', oops: ['히히 괜찮아요', '다시 해요!', '할 수 있어요!'] },
    lines: {
      gameStart: ['우와~ {game}이다! {how}!', '{game} 할 거예요! {how}! 히히!', '야호~ {game}! {how}!'],
      combo5: ['우와~ 최고최고!', '짱이에요!', '할머니 할아버지 최고!'], combo10: ['열 번이나요? 진짜 대박이에요!', '우와~ 천재예요!'],
      fever: ['피버 타임이에요! 신난다~!', '반짝반짝~ 무지개다!'], nice: ['우와~!', '잘한다~!', '최고!', '짝짝짝!'],
      oops: ['괜찮아요! 저도 맨날 틀려요!', '히히~ 다시 해요!'], encourage: ['천천히 해도 돼요! 제가 기다릴게요!'],
      boss: ['마지막이에요! 힘내세요! 파이팅~!'],
      danceWatch: ['잘 봐요~! 춤이 {n}개예요!'], danceGo: ['이제 같이 춰요~!'], danceDone: ['우와~ 춤 진짜 잘 춰요!'], danceFail: ['괜찮아요! 다음엔 될 거예요!'],
      constellation: ['{star} 만들었어요! 반짝반짝~!'], treasure: ['보물 상자다! 뭐 들었을까~?'], twin: ['큰 풍선! 둘이 같이 터뜨려요!'],
      harmony: ['둘이 짝짝꿍이에요!'], teamGoal: ['우리 팀 최고~!'], highfive: ['하이파이브! 짝!'],
      warmup: ['체조부터 해요! 쭉쭉~!'], cooldown: ['이제 천천히~ 숨 쉬어요~'],
      rest: ['물 마시는 시간이에요! 다음은~ {next}!'],
      calibDone: ['다 됐어요! 오늘 제가 열심히 응원할게요~!'], end: ['{name}! 오늘 진짜 최고였어요! 또 놀아요~!']
    }
  }
};

/* 음성마다 깨지지 않는 음높이 범위 — 크롬 음성은 1.1을 넘으면 떨리고, 해미는 1.3을 넘으면 기계음이 됨 */
const PITCH_SAFE = { google: [0.85, 1.1], ms: [0.75, 1.3] };

/* ---- 시그니처 소리 (Web Audio 합성) ---- */
const Stinger = {
  ok() { return !!Sound.ctx && Store.settings.volSfx > 0; },
  sweep(f0, f1, dur, type = 'sine', vol = 0.2, when = 0) {
    const c = Sound.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(Sound.sfx); o.start(t); o.stop(t + dur + 0.02);
  },
  trill(freq, dur, lfoHz, depth, vol = 0.15, when = 0) {
    const c = Sound.ctx, t = c.currentTime + when, o = c.createOscillator(), l = c.createOscillator(), ld = c.createGain(), g = c.createGain();
    o.frequency.value = freq; l.frequency.value = lfoHz; ld.gain.value = depth; l.connect(ld); ld.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.setValueAtTime(vol, t + dur - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(Sound.sfx); o.start(t); l.start(t); o.stop(t + dur + 0.02); l.stop(t + dur + 0.02);
  },
  // 꽹과리 한 번: 쇳소리 두 겹 + 높은 잡음
  kkwaeng(when, v = 1) { Sound.tone(2150, 0.13, 'square', 0.05 * v, when); Sound.tone(3020, 0.1, 'square', 0.035 * v, when); Sound.noise(0.09, 0.14 * v, 5200, when, 1.4); },
  // 징: 낮은 기음 + 어긋난 배음, 길게 울림
  jing(when = 0, v = 1) { Sound.tone(98, 2.2, 'sine', 0.32 * v, when); Sound.tone(98 * 2.36, 1.6, 'sine', 0.1 * v, when); Sound.tone(98 * 3.9, 1.0, 'sine', 0.05 * v, when); Sound.noise(0.15, 0.05 * v, 400, when, 1); },
  full: {
    basic() { Sound.tone(880, 0.5, 'sine', 0.12); Sound.tone(1318.5, 0.6, 'sine', 0.1, 0.16); return 0.3; },
    // 갱 갱 갱갱갱 + 박수
    trot() { [0, 0.15, 0.3, 0.38, 0.46].forEach((w, i) => Stinger.kkwaeng(w, i > 1 ? 0.8 : 1)); Sound.clap(); return 0.55; },
    // 지잉~ (징) 뒤에 편종 두 음
    sageuk() { Stinger.jing(0); Sound.tone(1046.5, 0.9, 'sine', 0.06, 0.25); Sound.tone(783.99, 1.0, 'sine', 0.06, 0.45); return 0.6; },
    // 삐익! 호루라기 + 관중 함성
    caster() { Stinger.trill(2650, 0.32, 38, 120, 0.12); Stinger.trill(2650, 0.18, 38, 120, 0.1, 0.38); Sound.noise(0.9, 0.11, 900, 0.1, 0.5); Sound.noise(0.8, 0.07, 1800, 0.15, 0.5); return 0.4; },
    // 실로폰 도미솔도 + 뿅
    kid() { [1046.5, 1318.5, 1568, 2093].forEach((f, i) => Sound.tone(f, 0.22, 'triangle', 0.12, i * 0.07)); Stinger.sweep(500, 1900, 0.16, 'sine', 0.14, 0.3); return 0.42; }
  },
  mini: {
    basic() { Sound.tone(1318.5, 0.3, 'sine', 0.07); },
    trot() { Stinger.kkwaeng(0, 0.8); Stinger.kkwaeng(0.11, 0.6); },
    sageuk() { Sound.tone(783.99, 0.8, 'sine', 0.07); Sound.tone(1046.5, 0.7, 'sine', 0.05, 0.12); },
    caster() { Stinger.trill(2650, 0.14, 38, 120, 0.08); },
    kid() { Stinger.sweep(600, 1700, 0.13, 'sine', 0.11); }
  },
  play(id, kind) { if (!this.ok()) return 0; try { const f = (kind === 'full' ? this.full : this.mini)[id]; return (f && f()) || 0; } catch (e) { return 0; } }
};

const Narr = {
  caption: null, lastFlavor: 0, who: '', timer: null,
  // 고른 캐릭터의 성우 녹음이 아직 덜 됐으면 녹음이 끝난 '무브 선생님'으로 안내(컴퓨터 음성으로 바뀌지 않게)
  get id() { const s = Store.settings.narrator; return PERSONAS[s] && this.usable(s) ? s : 'basic'; },
  coverage(id) { const C = window.VOICE_CLIPS && window.VOICE_CLIPS[id], total = (window.VOICE_TOTAL || {})[id]; if (!C || !C.length) return 0; return total ? Math.min(1, C.length / total) : 1; },
  ready(id) { return this.coverage(id) >= 0.9; },
  usable(id) { return this.ready(id) || !this.recorded || !this.ready('basic'); },
  get P() { return this.tuned(this.id); },
  // 관리자 설정에서 다듬은 음성·음높이·빠르기를 덮어씀 (음높이는 음성별 안전 범위로)
  tuned(id) {
    const P = PERSONAS[id] || PERSONAS.basic, t = (Store.settings.voiceTune || {})[id] || {}, engine = t.engine || P.engine, R = PITCH_SAFE[engine] || PITCH_SAFE.google;
    return Object.assign({}, P, { id: PERSONAS[id] ? id : 'basic', engine, pitch: clamp(t.pitch ?? P.pitch, R[0], R[1]), rate: clamp(t.rate ?? P.rate, 0.7, 1.4) });
  },
  fill(t, v = {}) { return t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? (k === 'name' ? (this.who || '여러분') : '')); },
  // 화면용 문장과 녹음 찾기용 문장(이름 자리는 '여러분'·'두 분'으로 녹음해 둠)을 함께 만듦
  pick(ev, v) {
    const arr = this.P.lines[ev] || PERSONAS.basic.lines[ev]; if (!arr) return '';
    const t = pick(arr); this.voiceText = this.fill(t, Object.assign({}, v, { name: this.who === '두 분' ? '두 분' : '여러분' }));
    return this.fill(t, v);
  },
  // ---- 녹음된 성우 음성(Gemini TTS로 미리 녹음, assets/voice/<캐릭터>/<열쇠>.mp3) ----
  audio: null, sets: {},
  vkey(p, text) { let h = 0x811c9dc5; const s = p + '|' + String(text).replace(/\s+/g, ' ').trim(); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); },
  clipUrl(id, text, any) {
    const C = window.VOICE_CLIPS && window.VOICE_CLIPS[id]; if (!C || !C.length || !text) return null;
    // 녹음이 대부분(90% 이상) 끝난 캐릭터만 녹음 음성을 씀 → 녹음 음성과 컴퓨터 음성이 번갈아 나오지 않게(맛보기 소리는 예외)
    if (!any && !this.ready(id)) { this.miss(id, text, 'gate'); return null; }
    const set = this.sets[id] || (this.sets[id] = new Set(C)), k = this.vkey(id, text);
    if (set.has(k)) return 'assets/voice/' + id + '/' + k + '.mp3';
    this.miss(id, text, 'none'); return null;
  },
  // 녹음이 없어 컴퓨터 음성으로 말한 문장(점검용): 콘솔에서 Narr.misses 로 확인
  misses: [], miss(id, text, why) { if (this.misses.length < 200) this.misses.push({ id, text, why }); },
  get recorded() { const C = window.VOICE_CLIPS; return !!C && Object.values(C).some(a => a && a.length); },
  playClip(url, fallback) {
    this.stopClip(); const s = Store.settings; if (!s.voice) return;
    const a = new Audio(url); a.volume = clamp(s.volVoice, 0, 1); a.preservesPitch = true; a.playbackRate = clamp(s.voiceRate / 0.95, 0.8, 1.25);
    const end = () => { if (this.audio === a) { clearTimeout(this.guard); this.audio = null; Sound.setDuck(false); } };
    // 소리 장치가 멈춰 끝 신호가 안 와도 음악 줄임·다음 대사가 막히지 않게
    clearTimeout(this.guard); this.guard = setTimeout(end, 12000);
    a.onloadedmetadata = () => { if (this.audio === a && isFinite(a.duration)) { clearTimeout(this.guard); this.guard = setTimeout(end, a.duration / a.playbackRate * 1000 + 700); } };
    a.onended = end; a.onerror = () => { const mine = this.audio === a; end(); if (mine && fallback) fallback(); };
    this.audio = a; Sound.setDuck(true); a.play().catch(() => { const mine = this.audio === a; end(); if (mine && fallback) fallback(); });
  },
  stopClip() { clearTimeout(this.guard); if (this.audio) { try { this.audio.pause(); } catch (e) { } this.audio = null; Sound.setDuck(false); } },
  get busy() { return !!this.audio; },
  // 화면에 띄우는 칭찬·아쉬움 글자(캐릭터 말버릇)
  word(ev, fallback) { const w = this.P.words?.[ev]; return w ? (Array.isArray(w) ? pick(w) : w) : fallback; },

  // ② 말 가락: 마디로 나눠 마디마다 음높이·빠르기를 바꿈
  phrase(text, P) {
    const spoken = s => s.replace(/[~…]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!P.split) return [{ text: spoken(text), pitch: P.pitch, rate: P.rate }];
    const inner = P.split.source.slice(1, -1), re = new RegExp('[^' + inner + ']+[' + inner + ']*', 'g');
    const hasWord = s => /[0-9A-Za-z가-힣]/.test(s);
    let parts = [];
    (text.match(re) || [text]).map(s => s.trim()).forEach(s => { if (hasWord(s) || !parts.length) parts.push(s); else parts[parts.length - 1] += s; });
    // 한 글자짜리 마디는 다음 마디에 붙임("캬~"처럼 혼자인 말은 그대로)
    for (let i = 0; i < parts.length - 1; i++) if (spoken(parts[i]).length < 2 && !/~$/.test(parts[i])) { parts[i + 1] = parts[i] + ' ' + parts[i + 1]; parts.splice(i--, 1); }
    if (parts.length > 5) parts = [parts.slice(0, parts.length - 4).join(' ')].concat(parts.slice(-4));
    const n = parts.length;
    return parts.map((s, i) => {
      const long = /~[!?]*$/.test(s), bang = /[!?]$/.test(s) && !/\?$/.test(s), q = /\?$/.test(s), last = i === n - 1;
      let dp = 0, kr = 1;
      if (P.id === 'trot') { if (long && (bang || q)) { dp = 0.06; kr = 0.94; } else if (long) { dp = 0.05; kr = 0.86; } else if (bang) { dp = 0.03; kr = 1.08; } if (i === 0 && long) kr = 0.8; }
      else if (P.id === 'sageuk') { dp = last ? -0.05 : (i % 2 ? -0.02 : 0.02); kr = last ? 0.92 : 1; if (bang) dp += 0.04; }
      else if (P.id === 'caster') { dp = Math.min(i * 0.04, 0.12); kr = 1 + Math.min(i * 0.04, 0.1); }
      else if (P.id === 'kid') { if (long) { dp = 0.04; kr = 0.9; } else if (bang) { dp = 0.05; kr = 1.04; } else if (q) { dp = 0.06; } }
      return { text: spoken(s), pitch: P.pitch + dp, rate: P.rate * kr };
    });
  },
  utter(text, P, interrupt) {
    const segs = this.phrase(text, P);
    segs.forEach((s, i) => Voice.say(s.text, { interrupt: i === 0 ? interrupt : false, pitch: s.pitch, rate: s.rate, engine: P.engine }));
  },
  cancel() { clearTimeout(this.timer); this.timer = null; this.stopClip(); },

  // 꼭 들려야 하는 말(안내·게임 시작 등): 앞의 말을 끊고, 시그니처 소리 뒤에 말함
  say(ev, v, opts = {}) { const t = this.pick(ev, v); if (t) this.speak(t, Object.assign({ interrupt: true, sting: 'full', voiceText: this.voiceText }, opts)); return t; },
  // 양념 대사(칭찬·아쉬움): 다른 말을 하고 있으면 건너뛰고, 2.5초에 한 번까지만
  flavor(ev, v, chance = 1) {
    if (Math.random() > chance) return; const n = performance.now();
    if (n - this.lastFlavor < 2500 || this.timer || this.busy) return;
    try { if (speechSynthesis.speaking) return; } catch (e) { }
    this.lastFlavor = n; const t = this.pick(ev, v); if (t) this.speak(t, { interrupt: false, sting: 'mini', voiceText: this.voiceText });
  },
  // 안내 문장 그대로(동작 이름 등) — 효과음·가락 없이 캐릭터 목소리로 또렷하게
  plain(text, opts = {}) {
    this.cancel(); Voice.stop(true); if (!opts.noCaption) this.caption = { text, t: performance.now(), id: this.id };
    const P = this.P, tts = () => Voice.say(text.replace(/[~…]/g, ' '), { interrupt: true, pitch: P.pitch, rate: P.rate, engine: P.engine });
    const url = this.clipUrl(P.id, text); if (url) this.playClip(url, tts); else tts();
  },
  speak(text, opts) {
    const P = this.P;
    if (opts.interrupt) { this.cancel(); Voice.stop(true); }
    if (!opts.noCaption) this.caption = { text, t: performance.now(), id: P.id };
    const lead = opts.sting ? Stinger.play(P.id, opts.sting) : 0;
    const url = this.clipUrl(P.id, opts.voiceText || text), tts = () => this.utter(text, P, opts.interrupt);
    const go = () => { this.timer = null; if (url) this.playClip(url, tts); else tts(); };
    if (lead > 0 && Store.settings.voice) this.timer = setTimeout(go, (opts.sting === 'full' ? lead : 0.12) * 1000); else go();
  },
  sample(id, text) {
    this.cancel(); Voice.stop(true); const P = this.tuned(id); Sound.init();
    const lead = Stinger.play(P.id, 'full');
    const t = text || P.sample, url = this.clipUrl(P.id, t, true), tts = () => this.utter(t, P, true);
    this.timer = setTimeout(() => { this.timer = null; if (url) this.playClip(url, tts); else tts(); }, lead * 1000);
  },

  // ④ 화면 아래 자막(게임 화면에서만) — 캐릭터마다 색 도장과 나타나는 방식이 다름
  get showing() { const c = this.caption; return !!c && (performance.now() - c.t) / 1000 < 3.6 && !!App.stage && App.stage.id !== 'dance' && App.stage.kind !== 'rest' && App.stage.kind !== 'calib'; },
  draw(g) {
    const c = this.caption; if (!c) return; const age = (performance.now() - c.t) / 1000; if (age > 3.6) { this.caption = null; return; }
    // 화면 아래 안내 줄 자리에 띄움. 댄스(동작 칸)·쉬는 시간(버튼)·몸 인식(진행 막대)에서는 겹쳐서 띄우지 않음
    const st = App.stage; if (!st || st.id === 'dance' || st.kind === 'rest' || st.kind === 'calib') return;
    const P = this.tuned(c.id || this.id), W = View.W, H = View.H, a = clamp(Math.min(age / 0.15, (3.6 - age) / 0.4), 0, 1);
    g.save(); g.font = `600 22px ${SANS}`;
    const tw = Math.min(W - 440 - 200, g.measureText(c.text).width), bw = tw + 200, bh = 56;
    if (tw < 120) { g.restore(); return; }
    let bx = W / 2 - bw / 2, by = H - 154, sx = 1, sy = 1, rot = 0, clipW = bw;
    const e = clamp(age / 0.45, 0, 1);
    if (P.anim === 'bounce') by -= Math.abs(Math.sin(age * 9)) * 26 * Math.exp(-age * 2.6);                       // 통통 튀며 등장
    else if (P.anim === 'scroll') clipW = bw * (1 - Math.pow(1 - clamp(age / 0.7, 0, 1), 3));                     // 두루마리 펼치듯
    else if (P.anim === 'slide') bx -= (1 - Math.pow(e, 0.35)) * (W * 0.6);                                     // 왼쪽에서 휙
    else if (P.anim === 'pop') { const k = 1 + Math.sin(Math.min(age, 0.6) * 16) * 0.12 * Math.exp(-age * 5); sx = sy = k; rot = Math.sin(age * 12) * 0.03 * Math.exp(-age * 3); }
    g.globalAlpha = a;
    g.translate(bx + bw / 2, by + bh / 2); g.rotate(rot); g.scale(sx, sy); g.translate(-bw / 2, -bh / 2);
    if (clipW < bw) { g.beginPath(); g.rect((bw - clipW) / 2, -10, clipW, bh + 20); g.clip(); }
    lacquerPanel(g, 0, 0, bw, bh, 28, 0.92);
    g.strokeStyle = P.color; g.lineWidth = 2.5; roundRect(g, 1, 1, bw - 2, bh - 2, 27); g.stroke();
    // 캐스터: 속도선
    if (P.anim === 'slide' && e < 1) { g.strokeStyle = P.color; g.globalAlpha = a * (1 - e); for (let k = 0; k < 4; k++) { g.lineWidth = 3; g.beginPath(); g.moveTo(-30 - k * 26, 12 + k * 10); g.lineTo(-90 - k * 40, 12 + k * 10); g.stroke(); } g.globalAlpha = a; }
    // 도장(캐릭터 색 원 + 한 글자)
    g.fillStyle = P.color; g.beginPath(); g.arc(30, bh / 2, 21, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(30, bh / 2, 17, 0, 7); g.stroke();
    plainText(g, P.seal, 30, bh / 2 + 1, 21, P.ink, 'center', 800, SERIF);
    plainText(g, P.name, 58, bh / 2, 17, P.color, 'left', 700);
    g.save(); g.beginPath(); g.rect(178, 0, tw + 14, bh); g.clip(); plainText(g, c.text, 182, bh / 2, 22, PAL.ivory, 'left', 600); g.restore();
    g.restore();
  }
};
