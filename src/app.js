/* ================= 앱 흐름 ================= */
const App = {
  setup: { n: 1, twoMode: 'coop', posture: 'stand', input: 'camera', names: ['', ''], picked: [] },
  course: [], session: null, stage: null, paused: false, absentSince: null, loopOn: false, lastT: 0, calibrated: false, wake: null,

  init() {
    Store.load(); Voice.init(); View.init();
    $('#backdrop').style.backgroundImage = `url("${ASSETS.hero}")`;
    // 시작 화면 배경 영상(있을 때만). 없거나 못 읽으면 그림 그대로
    const bv = $('#bgVideo'); bv.addEventListener('loadeddata', () => { bv.hidden = false; this.syncVideo(); }); bv.addEventListener('error', () => bv.remove()); bv.src = ASSETS.video;
    try { ['800 40px Hahmlet', '700 40px Hahmlet', '600 20px "IBM Plex Sans KR"', '700 20px "IBM Plex Sans KR"'].forEach(f => document.fonts.load(f)); } catch (e) { }
    this.renderSafety(); this.renderOrg();
    $$('[data-go]').forEach(b => b.addEventListener('click', () => this.show(b.dataset.go)));
    $('#btnStart').onclick = () => { Sound.init(); this.openSetup(); };
    $('#btnAdmin').onclick = () => { Sound.init(); this.openAdmin(); };
    $('#btnGardenTop').onclick = () => { Sound.init(); this.pickGarden(); };
    this.bindSetup();
    $('#btnSafetyNext').onclick = () => this.beginCamera();
    $('#btnCourse').onclick = () => this.startCourse(false);
    $('#btnQuick').onclick = () => this.startCourse(true);
    $('#btnRecal').onclick = () => this.runCalibration(true);
    $('#stopBtn').onclick = () => this.askStop();
    $('#pauseBtn').onclick = () => this.togglePause();
    addEventListener('keydown', e => this.onKey(e, true));
    // 첫 클릭·터치·키 입력 때 소리 장치를 깨우고, 막혀 있던 배경음악을 다시 틀어 줌
    const wake = () => { Sound.init(); Sound.resume(); };
    addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true); addEventListener('touchstart', wake, { capture: true, passive: true });
    addEventListener('keyup', e => this.onKey(e, false));
    addEventListener('mousemove', e => { const m = Pose.demo.mouse; m.x = (e.clientX - View.ox) / View.dw; m.y = (e.clientY - View.oy) / View.dh; m.inside = true; });
    $('#game').addEventListener('click', e => HandButtons.click(e.clientX, e.clientY));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.stage && !this.paused) this.togglePause(true); });
    this.show('title');
  },

  show(name) {
    $$('.screen').forEach(s => s.hidden = s.id !== 'scr-' + name);
    const play = name === 'play';
    $('#game').hidden = !play; $('#hud').hidden = !play;
    $('#backdrop').hidden = play; $('#veil').hidden = play;
    $('#backdrop').classList.toggle('dim', name !== 'title'); $('#veil').classList.toggle('title', name === 'title');
    if (!play) { $('#overlay').hidden = true; }
    const sc = $('#scr-' + name); if (sc) sc.scrollTop = 0;
    this.syncVideo();
    // 처음 화면·준비·마을 지도에서는 테마곡, 관리자·정원·기록 화면에서는 조용히
    if (['title', 'setup', 'safety', 'map'].includes(name)) { Sound.init(); Sound.track('title'); Sound.startMusic(100); } else if (!play && name !== 'result') Sound.stopMusic();
  },

  renderOrg() { const o = Store.settings.orgName; $$('.org-name').forEach(el => { el.textContent = o || ''; el.hidden = !o; }); },
  syncVideo() { const v = $('#bgVideo'); if (!v || v.hidden) return; const on = !$('#scr-title').hidden; if (on) v.play().catch(() => { }); else v.pause(); },

  /* ---------- 인원·모드 ---------- */
  bindSetup() {
    const seg = (id, key, after) => $$('#' + id + ' button').forEach(b => b.onclick = () => { $$('#' + id + ' button').forEach(x => x.setAttribute('aria-pressed', x === b)); this.setup[key] = key === 'n' ? +b.dataset.v : b.dataset.v; after && after(); });
    const upd = () => {
      const two = this.setup.n === 2; $('#twoModeBox').hidden = !two;
      if (!two && this.setup.picked.length > 1) this.setup.picked = this.setup.picked.slice(0, 1);
      $('#inputDesc').textContent = this.setup.input === 'camera' ? '' : '마우스가 손이 되고, 숫자키 1~7을 누르고 있으면 자세가 돼요. 둘이 할 때는 마우스를 둔 쪽 사람이 움직여요.';
      this.renderLogin(); this.renderSafety();
    };
    seg('segPlayers', 'n', upd); seg('segTwoMode', 'twoMode', upd); seg('segPosture', 'posture'); seg('segInput', 'input', upd);
    this.renderVoices();
    $('#loginSearch').addEventListener('input', () => this.renderLogin());
    $('#btnRegister').onclick = () => { Sound.init(); this.openRegister(/[0-9]/.test($('#loginSearch').value) ? '' : $('#loginSearch').value); };
    $('#loginSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.loginByName($('#loginSearch').value); } });
    $('#btnSetupNext').onclick = () => {
      if (this.setupStep === 1) {
        const pk = this.setup.picked;
        if (pk.length < this.setup.n) { toast(this.setup.n === 2 ? '두 사람 모두 이름을 눌러 주세요' : '이름을 눌러 주세요'); return; }
        this.setup.names = [pk[0], pk[1] || ''];
      }
      if (this.setupStep < 3) return this.setStep(this.setupStep + 1);
      this.renderSafety(); this.renderStepper('stepper2', 4); this.show('safety');
    };
    $('#btnSetupBack').onclick = () => { if (this.setupStep > 1) this.setStep(this.setupStep - 1); else this.show('title'); };
    this.updSetup = upd; upd();
  },
  // 준비 단계(1 누가 → 2 자세·조작 → 3 성우 → 4 안전)
  setupStep: 1,
  renderStepper(id, cur) {
    const names = ['누가', '자세와 조작', '성우', '안전 확인'];
    $('#' + id).innerHTML = names.map((n, k) => `${k ? '<span class="ln"></span>' : ''}<span class="st ${k + 1 === cur ? 'on' : k + 1 < cur ? 'done' : ''}"><i>${k + 1 < cur ? '✓' : k + 1}</i>${n}</span>`).join('');
  },
  setStep(n) {
    this.setupStep = n; $$('#scr-setup .step').forEach(el => el.hidden = +el.dataset.step !== n); this.renderStepper('stepper', n);
    $('#btnSetupNext').textContent = ['', '다음 · 자세 고르기', '다음 · 성우 고르기', '다음 · 안전 확인'][n];
    $('#btnSetupBack').textContent = n === 1 ? '처음으로' : '이전';
    const sc = $('#scr-setup'); if (sc) sc.scrollTop = 0;
  },
  renderVoices() {
    const cur = Narr.id;
    // 성우 녹음 상태를 카드에 표시: 녹음이 끝난 캐릭터만 고를 수 있음(덜 된 캐릭터는 '녹음 중 NN%')
    const badge = id => !Narr.recorded ? '' : Narr.ready(id) ? '<span class="vrec ok">성우 녹음 완료</span>' : `<span class="vrec">성우 녹음 중 ${Math.round(Narr.coverage(id) * 100)}%</span>`;
    $('#voiceList').innerHTML = Object.entries(PERSONAS).map(([id, P]) => `<button class="opt voice${Narr.usable(id) ? '' : ' wait'}" data-v="${id}" aria-pressed="${id === cur}" style="--pc:${P.color};--pink:${P.ink}"><span class="vhead"><span class="vseal">${P.seal}</span><span class="vname">${P.name}</span></span>${badge(id)}<small>${P.desc}</small><small class="say">"${esc(P.sample)}"</small></button>`).join('');
    $$('#voiceList .voice').forEach(b => b.onclick = () => {
      Sound.init(); const id = b.dataset.v;
      if (!Narr.usable(id)) { toast(`'${PERSONAS[id].name}' 목소리는 아직 성우 녹음 중이에요. 녹음이 끝나면 고를 수 있어요`); Narr.sample(id); return; }
      Store.settings.narrator = id; Store.settings.voice = true; Store.save(); $$('#voiceList .voice').forEach(x => x.setAttribute('aria-pressed', x === b)); Narr.sample(id);
    });
  },
  openSetup() { this.setup.picked = []; $('#loginSearch').value = ''; this.updSetup(); this.setStep(1); this.show('setup'); },
  // 이름으로 로그인: 등록된 이름이면 그 사람으로, 아니면 안내(설정에 따라 바로 등록)
  loginByName(raw) {
    const m = Store.matches(raw);
    if (m.length === 1) { this.pick(m[0], true); $('#loginSearch').value = ''; this.renderLogin(); return; }
    if (m.length > 1) { this.renderLogin(null, m.length); return; }   // 동명이인: 생년월을 보고 고르게
    this.renderLogin(normName(raw));
  },
  // 준비 화면에서 바로 새 참여자 등록(관리자 화면을 오가지 않음)
  openRegister(prefill) {
    const needPin = !Store.settings.selfRegister && Admin.hasPin && !Admin.unlocked;
    this.overlay(`<h3>새 참여자 등록</h3>
      <div class="regform">
        <label class="field">이름<input type="text" id="rgName" maxlength="20" value="${esc(prefill || '')}" placeholder="예: 김영호" autocomplete="off"></label>
        <div class="field">생년월${birthSelect('rgB')}</div>
        <div class="field">기본 자세<div class="opts" id="rgPost"><button class="opt" data-v="stand" aria-pressed="true">🧍 서서</button><button class="opt" data-v="seat" aria-pressed="false">🪑 앉아서</button></div></div>
        <label class="field">메모 (선택)<input type="text" id="rgMemo" maxlength="40" placeholder="예: 화요일반, 보청기 사용" autocomplete="off"></label>
        ${needPin ? '<label class="field">관리자 PIN<input type="password" inputmode="numeric" id="rgPin" maxlength="8" autocomplete="off"></label>' : ''}
        <label class="consent full"><input type="checkbox" id="rgOk"><span>본인 또는 보호자에게 이름·생년월과 활동 기록을 이 컴퓨터에 저장하는 데 동의를 받았어요</span></label>
        <p class="note full" style="margin:0">화면에는 이름이 <b>김O호 · 1948.03</b>처럼 가려서 보여요. 기록은 이 컴퓨터의 브라우저에만 저장되고 인터넷으로 보내지 않아요.</p>
        <p class="err full" id="rgMsg" role="alert" style="margin:0;min-height:1.2em"></p>
      </div>
      <div class="row" style="justify-content:center"><button class="gold" id="rgSave">등록하고 고르기</button><button id="rgCancel">취소</button></div>`);
    const C = $('#overlayCard'); let posture = 'stand';
    $$('#rgPost button').forEach(b => b.onclick = () => { posture = b.dataset.v; $$('#rgPost button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $('#rgCancel').onclick = () => { $('#overlay').hidden = true; };
    const err = t => { $('#rgMsg').textContent = t; Sound.soft(); };
    $('#rgSave').onclick = async () => {
      if (!normName($('#rgName').value)) return err('이름을 적어 주세요');
      const birth = readBirth(C, 'rgB'); if (!birth) return err('생년월(태어난 해와 달)을 골라 주세요');
      if (!$('#rgOk').checked) return err('저장 동의를 받았는지 확인하고 체크해 주세요');
      if (needPin) { const r = await Admin.check($('#rgPin').value); if (!r.ok) return err(r.msg); Admin.lock(); }
      const r = Store.register($('#rgName').value, { birth, memo: $('#rgMemo').value, posture, consent: true, needBirth: true });
      if (!r.ok) return err(r.msg);
      $('#overlay').hidden = true; $('#loginSearch').value = ''; Sound.coin(); toast(`${whoFull(r.name)} 님을 등록했어요`); this.pick(r.name, true);
    };
    setTimeout(() => $('#rgName').focus(), 50);
  },
  pick(name, add) {
    const pk = this.setup.picked, k = pk.indexOf(name);
    if (k >= 0 && !add) pk.splice(k, 1);
    else if (k < 0) { if (this.setup.n === 1) pk.splice(0, pk.length, name); else { if (pk.length >= 2) pk.shift(); pk.push(name); } }
    // 등록 때 정한 기본 자세 적용(둘 다 앉아서일 때만 앉은 자세)
    const prof = pk.map(n => Store.data.profiles[n]).filter(Boolean);
    if (prof.length) { const v = prof.every(p => p.defaultPosture === 'seat') ? 'seat' : 'stand'; this.setup.posture = v; $$('#segPosture button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === v)); }
    this.renderLogin();
  },
  renderLogin(notFound, twins) {
    const S = this.setup, q = normName($('#loginSearch').value).toLowerCase(), names = Store.names();
    // 찾기: 실명 일부나 생년(예: 1948)으로. 화면에는 가린 이름만 보임
    const shown = q ? names.filter(n => { const p = Store.data.profiles[n]; return normName(Store.realName(n)).toLowerCase().includes(q) || (p.birth && p.birth.replace('-', '').includes(q.replace(/[.\-\s]/g, ''))); }) : names;
    const bt = p => p.birth ? birthTxt(p.birth) + '년생 · ' : '';
    const AV = ['#D8576B', '#3C78D8', '#2E9E6A', '#C9962E', '#8A57D6', '#1C93B5', '#D9703A'];
    const ava = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `<span class="ava" style="--ac:${AV[h % AV.length]}">${esc([...Store.realName(n)][0] || '?')}</span>`; };
    const when = p => { const last = p.sessions.at(-1); return last ? '최근 ' + new Date(last.ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' · ' + p.sessions.length + '회' : '첫 참여'; };
    const role = i => S.n === 1 ? '오늘의 참여자' : (i ? '2P · 오른쪽' : '1P · 왼쪽');
    $('#loginSlots').innerHTML = Array.from({ length: S.n }, (_, i) => { const n = S.picked[i], p = n && Store.data.profiles[n];
      const rc = S.n === 2 ? ` style="color:${PCOL[i]};box-shadow:inset 0 0 0 1.5px ${PCOL[i]}"` : '';
      return n ? `<div class="seat filled"><span class="role"${rc}>${role(i)}</span>${ava(n)}<div class="ph"><b>${esc(who(n))} 님</b><small>${esc(bt(p))}${esc(p.memo ? p.memo + ' · ' : '')}${when(p)}</small></div><button class="x" data-unpick="${esc(n)}" aria-label="${esc(who(n))} 님 빼기">✕</button></div>`
        : `<div class="seat empty"><span class="role"${rc}>${role(i)}</span><span class="ava">?</span><div class="ph"><b>아래에서 이름을 눌러 주세요</b></div></div>`; }).join('');
    $$('#loginSlots [data-unpick]').forEach(b => b.onclick = () => this.pick(b.dataset.unpick));
    $('#whoGrid').innerHTML = shown.map(n => { const p = Store.data.profiles[n], i = S.picked.indexOf(n);
      return `<button class="who" data-n="${esc(n)}" aria-pressed="${i >= 0}">${i >= 0 ? `<span class="tick" ${S.n === 2 ? `style="background:${PCOL[i]}"` : ''}>${S.n === 2 ? i + 1 + 'P' : '✓'}</span>` : ''}${ava(n)}<span class="nm">${esc(who(n))}<small>${p.birth ? esc(birthTxt(p.birth)) + '년생' : '생년월 미등록'}</small><small>${esc(p.memo ? p.memo + ' · ' : '')}${when(p)}</small></span></button>`; }).join('');
    $$('#whoGrid .who').forEach(b => b.onclick = () => this.pick(b.dataset.n));
    const msg = $('#loginMsg');
    if (!names.length) msg.innerHTML = `<p class="muted">아직 등록된 참여자가 없어요. 위의 <b>＋ 새 참여자 등록</b>을 눌러 이름과 생년월을 등록해 주세요.</p>`;
    else if (twins) msg.innerHTML = `<p class="note">같은 이름이 ${twins}명 있어요. 생년월을 보고 골라 주세요.</p>`;
    else if (notFound) msg.innerHTML = `<p class="err">아직 등록되지 않은 이름이에요.</p><div class="row" style="margin-top:10px"><button class="small gold" id="selfReg">이 이름으로 새로 등록하기</button></div>`;
    else if (q && !shown.length) msg.innerHTML = `<p class="note">찾는 이름이 없어요. 이름을 끝까지 적고 Enter를 누르면 확인해요.</p>`;
    else msg.innerHTML = S.n === 2 ? '<p class="note">먼저 누른 사람이 1P(왼쪽), 다음 사람이 2P(오른쪽)예요. 다시 누르면 취소돼요.</p>' : '';
    $('#selfReg') && ($('#selfReg').onclick = () => this.openRegister(notFound));
    $('#btnSetupNext').classList.toggle('dim', this.setupStep === 1 && S.picked.length < S.n);
  },
  pickGarden() {
    const names = Store.names();
    if (!names.length) { toast('아직 등록된 참여자가 없어요'); return; }
    this.overlay(`<h3>누구의 정원을 볼까요?</h3><div class="who-grid" style="width:100%">${names.map(n => `<button class="who" data-n="${esc(n)}"><span class="nm">${esc(who(n))}<small>${esc(birthTxt(Store.data.profiles[n].birth))} · ${Store.data.profiles[n].garden.length}그루</small></span></button>`).join('')}</div><button class="link" id="ovClose">닫기</button>`);
    $$('#overlayCard .who').forEach(b => b.onclick = () => { $('#overlay').hidden = true; this.openGarden(b.dataset.n, [b.dataset.n]); });
    $('#ovClose').onclick = () => $('#overlay').hidden = true;
  },

  /* ---------- 관리자 ---------- */
  openAdmin(tab) {
    if (Admin.unlocked) return this.adminTab(tab || 'users');
    this.show('title');
    if (!Admin.hasPin) {
      this.overlay(`<span class="eyebrow">처음 한 번</span><h3>관리자 PIN을 정해 주세요</h3><p class="muted">숫자 4~8자리. 참여자 등록·기록·설정을 열 때 써요.</p>
        <div class="pinbox"><input type="password" inputmode="numeric" id="pin1" placeholder="새 PIN" maxlength="8" autocomplete="new-password"><input type="password" inputmode="numeric" id="pin2" placeholder="한 번 더" maxlength="8" autocomplete="new-password"><p id="pinMsg"></p>
        <div class="row" style="justify-content:center"><button class="gold" id="pinSet">PIN 정하기</button><button class="link" id="ovClose">취소</button></div></div>`);
      $('#pin1').focus();
      $('#pinSet').onclick = async () => {
        const a = $('#pin1').value, b = $('#pin2').value;
        if (!/^\d{4,8}$/.test(a)) { $('#pinMsg').className = 'err'; $('#pinMsg').textContent = '숫자 4~8자리로 적어 주세요'; return; }
        if (a !== b) { $('#pinMsg').className = 'err'; $('#pinMsg').textContent = '두 번 적은 PIN이 달라요'; return; }
        const code = await Admin.setPin(a); Admin.unlocked = true; this.showRecovery(code);
      };
      $('#ovClose').onclick = () => $('#overlay').hidden = true;
      return;
    }
    this.overlay(`<span class="eyebrow">관리자</span><h3>PIN을 입력해 주세요</h3><div class="pinbox"><input type="password" inputmode="numeric" id="pinIn" maxlength="8" autocomplete="current-password"><p id="pinMsg"></p>
      <div class="row" style="justify-content:center"><button class="gold" id="pinGo">열기</button><button class="link" id="pinForgot">PIN을 잊었어요</button><button class="link" id="ovClose">취소</button></div></div>`);
    $('#pinIn').focus();
    const go = async () => { const r = await Admin.check($('#pinIn').value); if (r.ok) { $('#overlay').hidden = true; this.adminTab(tab || 'users'); } else { $('#pinMsg').className = 'err'; $('#pinMsg').textContent = r.msg; $('#pinIn').select(); } };
    $('#pinGo').onclick = go; $('#pinIn').onkeydown = e => { if (e.key === 'Enter') go(); };
    $('#ovClose').onclick = () => $('#overlay').hidden = true;
    $('#pinForgot').onclick = () => {
      this.overlay(`<h3>복구 코드로 PIN 다시 정하기</h3><p class="muted">PIN을 처음 정할 때 받은 8자리 복구 코드를 적어 주세요.</p><div class="pinbox"><input type="text" id="rcIn" maxlength="8" style="letter-spacing:.15em;text-transform:uppercase"><input type="password" inputmode="numeric" id="pin1" placeholder="새 PIN" maxlength="8"><p id="pinMsg"></p>
        <div class="row" style="justify-content:center"><button class="gold" id="rcGo">새 PIN 정하기</button><button class="link" id="ovClose">취소</button></div></div>`);
      $('#ovClose').onclick = () => $('#overlay').hidden = true;
      $('#rcGo').onclick = async () => {
        if (!(await Admin.checkRecovery($('#rcIn').value))) { $('#pinMsg').className = 'err'; $('#pinMsg').textContent = '복구 코드가 맞지 않아요'; return; }
        if (!/^\d{4,8}$/.test($('#pin1').value)) { $('#pinMsg').className = 'err'; $('#pinMsg').textContent = '새 PIN은 숫자 4~8자리예요'; return; }
        const code = await Admin.setPin($('#pin1').value); Admin.unlocked = true; this.showRecovery(code);
      };
    };
  },
  showRecovery(code) {
    this.overlay(`<span class="eyebrow">꼭 적어 두세요</span><h3>복구 코드</h3><p class="code">${code}</p><p class="muted">PIN을 잊었을 때 이 코드로 새 PIN을 정할 수 있어요. 이 화면을 닫으면 다시 볼 수 없어요.</p><button class="gold" id="rcOk">적어 두었어요</button>`);
    $('#rcOk').onclick = () => { $('#overlay').hidden = true; this.adminTab('users'); };
  },
  adminNav(active) {
    const t = [['users', '참여자'], ['records', '기록'], ['settings', '설정'], ['backup', '백업·보안']];
    return `<div class="row between"><div><span class="eyebrow">관리자 모드</span><h2>${{ users: '참여자 관리', records: '기록 보기', settings: '진행 설정', backup: '백업·보안' }[active]}</h2></div><button class="small" id="adminExit">관리자 나가기</button></div>
      <nav class="tabs">${t.map(([k, l]) => `<button data-tab="${k}" aria-current="${k === active}">${l}</button>`).join('')}</nav>`;
  },
  bindAdminNav() {
    const sc = $$('.screen').find(x => !x.hidden); if (!sc) return;
    $$('.tabs [data-tab]', sc).forEach(b => b.onclick = () => this.adminTab(b.dataset.tab));
    const ex = $('#adminExit', sc); if (ex) ex.onclick = () => { Admin.lock(); this.clearAdmin(); this.show('title'); };
  },
  // 관리자 화면 내용을 비워 숨은 화면에 같은 버튼이 남지 않게 함(나가면 기록도 화면에서 지워짐)
  clearAdmin(keep) { for (const id of ['adminWrap', 'recordsWrap', 'settingsWrap']) if (id !== keep) $('#' + id).innerHTML = ''; },
  adminTab(tab) {
    if (!Admin.unlocked) return this.openAdmin(tab);
    if (tab === 'records') { this.clearAdmin('recordsWrap'); this.show('records'); renderRecords(); }
    else if (tab === 'settings') { this.clearAdmin('settingsWrap'); this.show('settings'); renderSettings(); }
    else if (tab === 'backup') { this.clearAdmin('adminWrap'); this.show('admin'); renderBackup(); }
    else { this.clearAdmin('adminWrap'); this.show('admin'); renderUsers(); }
    this.bindAdminNav();
  },
  renderSafety() {
    const items = [['주변 장애물을 치웠어요', '양옆과 앞뒤 1m 안에 부딪힐 물건이 없어요'], ['미끄럽지 않은 신발이에요', '양말만 신고 하지 않아요'], ['의자는 바퀴 없는 것이에요', '앉아서 할 때만 해당돼요. 서서 하면 그냥 눌러 주세요']];
    if (this.setup.n === 2) items.push(['두 사람이 1m 이상 떨어졌어요', '팔을 벌려도 서로 닿지 않아요']);
    $('#safetyList').innerHTML = `<div class="opts" style="grid-template-columns:1fr">${items.map(([a, b], k) => `<button class="opt" data-k="${k}" aria-pressed="false">${a}<small>${b}</small></button>`).join('')}</div>`;
    $$('#safetyList .opt').forEach(b => b.onclick = () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); this.checkSafety(); });
    this.checkSafety();
  },
  checkSafety() { const bs = $$('#safetyList .opt'); $('#btnSafetyNext').disabled = !bs.length || !bs.every(b => b.getAttribute('aria-pressed') === 'true'); },

  /* ---------- 카메라·모델 준비 ---------- */
  async beginCamera() {
    Sound.init();
    Pose.mode = this.setup.input; Pose.posture = this.setup.posture; applyPosture(Pose.posture); Pose.makePlayers(this.setup.n);
    this.show('play'); $('#hud').hidden = true; this.startLoop();
    if (Pose.mode === 'camera') {
      this.overlay(`<span class="eyebrow">준비 중</span><h3>카메라를 켜고 있어요</h3><p class="lead">브라우저가 카메라 사용을 물으면 <b>허용</b>을 눌러 주세요.</p>`);
      const ok = await Pose.startCamera();
      if (!ok) return this.failCamera(Pose.error);
      View.fit();
      this.overlay(`<span class="eyebrow">준비 중</span><h3>몸 동작을 읽을 준비를 해요</h3><p class="lead">처음에는 10~20초쯤 걸릴 수 있어요.</p>`);
      const ok2 = await Pose.loadModel();
      if (!ok2) return this.failCamera(Pose.error);
    } else { Pose.vw = 1280; Pose.vh = 720; View.fit(); }
    $('#overlay').hidden = true;
    this.runCalibration(false);
  },
  failCamera(msg) {
    this.overlay(`<h3>카메라를 시작하지 못했어요</h3><p class="lead">${esc(msg)}</p><div class="row" style="justify-content:center"><button class="gold" id="ovRetry">다시 시도</button><button id="ovMouse">마우스 시연으로</button><button id="ovHome">처음으로</button></div>`);
    $('#ovRetry').onclick = () => this.beginCamera();
    $('#ovMouse').onclick = () => { this.setup.input = 'mouse'; $$('#segInput button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === 'mouse')); this.updSetup(); this.beginCamera(); };
    $('#ovHome').onclick = () => this.quitAll();
  },
  overlay(html) { $('#overlayCard').innerHTML = html; $('#overlay').hidden = false; },

  runCalibration(recal) {
    this.show('play'); $('#hud').hidden = false; this.startLoop();
    Pose.players.forEach(P => { P.base = null; P.baseSamples = []; });
    this.stage = new CalibStage(Pose.players, this.setup.n, () => { this.calibrated = true; this.stage = null; this.openMap(); });
    // (고침) 예전에는 여기서 없는 변수 st를 써서 오류가 나 몸 인식 안내 음성·음악이 나오지 않았음
    Sound.track('title'); Sound.startMusic(100);
    this.stage.start();
  },

  /* ---------- 마을 지도 ---------- */
  openMap() {
    this.show('map');
    const names = this.setup.names.slice(0, this.setup.n);
    $('#mapWho').textContent = this.setup.n === 1 ? `${who(names[0])} 님의 마을` : `${who(names[0])} · ${who(names[1])} · ${{ coop: '협동', versus: '대결', relay: '릴레이' }[this.setup.twoMode]}`;
    if (!this.course.length) this.course = this.recommend();
    this.renderMap();
  },
  // 9곳 중 처음엔 6곳, 정원이 자라거나 여러 번 하면 나머지가 열림
  unlocked(p) { if (Store.settings.unlockAll) return GAME_ORDER.slice(); const n = p.garden.length, ss = p.sessions.length; const need = { stars: [2, 4], ox: [3, 6], signal: [5, 8] }; return GAME_ORDER.filter(g => !need[g] || n >= need[g][0] || ss >= need[g][1]); },
  recommend() {
    const p = Store.profile(this.setup.names[0]); const un = this.unlocked(p);
    const played = g => p.sessions.filter(s => s.games.some(x => x.game === g)).length;
    // 영역이 겹치지 않게: 기억·집중·판단에서 하나씩, 덜 해 본 곳 먼저
    const byCat = c => un.filter(g => GAME_CAT[g] === c).sort((a, b) => played(a) - played(b) || Math.random() - 0.5);
    const out = []; for (const c of shuffle(Object.keys(CATS))) { const g = byCat(c)[0]; if (g) out.push(g); }
    for (const g of un.slice().sort((a, b) => played(a) - played(b))) if (!out.includes(g)) out.push(g);
    return out.slice(0, Store.settings.courseGames);
  },
  renderMap() {
    const p = Store.profile(this.setup.names[0]); const un = this.unlocked(p); const max = Store.settings.courseGames;
    this.course = this.course.filter(g => un.includes(g)).slice(0, max);
    this.mapCat = this.mapCat || 'all';
    const same = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
    // 테마 코스
    const themes = Object.entries(CATS).map(([c, C]) => ({ id: c, ...C, list: GAME_ORDER.filter(g => GAME_CAT[g] === c) })).concat([{ id: 'mix', n: '골고루 추천', seal: '골', c: '#F3D88C', d: '덜 해 본 곳을 고루 섞어요', list: this.mixPick || (this.mixPick = this.recommend()) }]);
    $('#themeList').innerHTML = themes.map(T => { const sel = T.list.filter(g => un.includes(g)).slice(0, max); return `<button class="theme" data-th="${T.id}" style="--tc:${T.c}" aria-pressed="${sel.length > 0 && same(sel, this.course)}">
      <span class="th"><span class="seal">${T.seal}</span><span><b>${T.n} 코스</b><small>${T.d}</small></span></span>
      <span class="thumbs">${T.list.slice(0, 3).map(g => `<i class="${un.includes(g) ? '' : 'lock'}" style="background-image:url('${ASSETS[GAMES[g].img]}')" title="${GAMES[g].name}"></i>`).join('')}</span></button>`; }).join('');
    $$('#themeList .theme').forEach(b => b.onclick = () => { const T = themes.find(x => x.id === b.dataset.th); if (T.id === 'mix') { this.mixPick = this.recommend(); T.list = this.mixPick; } const sel = T.list.filter(g => un.includes(g)).slice(0, max); if (!sel.length) { toast('정원이 자라면 열리는 곳들이에요'); return; } this.course = sel; Sound.init(); Sound.coin(); this.renderMap(); });
    // 분류 탭
    $('#catTabs').innerHTML = [['all', '전체 보기', '#DDB04F']].concat(Object.entries(CATS).map(([c, C]) => [c, C.n, C.c])).map(([c, n, col]) => `<button data-c="${c}" style="--cc:${col}" aria-pressed="${this.mapCat === c}"><span class="dot"></span>${n}</button>`).join('');
    $$('#catTabs button').forEach(b => b.onclick = () => { this.mapCat = b.dataset.c; this.renderMap(); });
    // 장소 카드
    const shown = GAME_ORDER.filter(id => this.mapCat === 'all' || GAME_CAT[id] === this.mapCat);
    $('#placeList').innerHTML = shown.map(id => {
      const G = GAMES[id], C = CATS[GAME_CAT[id]], lock = !un.includes(id), k = this.course.indexOf(id);
      const st = p.best[id]?.stars || 0, lv = p.levels[id] || 1;
      return `<button class="place ${lock ? 'locked' : ''}" data-id="${id}" aria-pressed="${k >= 0}" ${lock ? 'disabled' : ''}>
        ${k >= 0 ? `<span class="order">${k + 1}</span>` : ''}
        <span class="art" style="background-image:url('${ASSETS[G.img]}')"><span class="cat" style="--cc:${C.c}"><span class="dot"></span>${C.n}</span></span>
        <span class="body">
          <span class="pname">${G.name}</span>
          <span class="pinfo">${G.how}</span>
          <span class="foot"><span class="stars">${'★'.repeat(st)}<span style="opacity:.3">${'★'.repeat(3 - st)}</span></span><span class="chip ${lock ? '' : 'gold'}">${lock ? '정원이 자라면 열려요' : lv + '단계 · ' + G.body.split(' · ')[0]}</span></span>
        </span></button>`;
    }).join('');
    $$('#placeList .place').forEach(b => b.onclick = () => {
      const id = b.dataset.id, k = this.course.indexOf(id);
      if (k >= 0) this.course.splice(k, 1); else if (this.course.length < max) this.course.push(id); else { this.course.shift(); this.course.push(id); }
      Sound.init(); Sound.tick(); this.renderMap();
    });
    // 내 코스
    $('#courseList').innerHTML = Array.from({ length: max }, (_, k) => { const id = this.course[k]; return id ? `<li><span class="n">${k + 1}</span><span class="th" style="background-image:url('${ASSETS[GAMES[id].img]}')"></span><span class="nm">${GAMES[id].short}</span><button class="x" data-rm="${id}" aria-label="${GAMES[id].short} 빼기">✕</button></li>` : `<li class="empty">${k + 1}. 위에서 코스를 고르거나 장소를 눌러요</li>`; }).join('');
    $$('#courseList [data-rm]').forEach(b => b.onclick = () => { this.course.splice(this.course.indexOf(b.dataset.rm), 1); this.renderMap(); });
    $('#btnCourse').disabled = !this.course.length; $('#btnQuick').disabled = !this.course.length;
    $('#btnCourse').textContent = this.course.length ? `코스 시작 · ${this.course.length}곳` : '코스 시작';
    $('#btnQuick').textContent = this.course.length ? `${GAMES[this.course[0]].short}만 한 판` : '한 곳만 한 판';
    // 오늘의 미션(1P 기준, 2인은 둘 다)
    const box = $('#missionList'); const names = this.setup.names.slice(0, this.setup.n);
    box.innerHTML = names.map(n => { const pr = Store.profile(n); ensureMissions(pr); return (this.setup.n > 1 ? `<p class="note" style="margin-top:8px">${esc(who(n))}</p>` : '') + pr.missions.list.map(m => `<div class="mission ${m.done ? 'done' : ''}"><span class="mt">${m.done ? '✓ ' : ''}${esc(m.text)}</span><span class="note">${Math.min(m.prog, m.target)} / ${m.target}</span><span class="bar"><i style="width:${Math.min(100, m.prog / m.target * 100)}%"></i></span></div>`).join(''); }).join('');
    Store.save();
  },

  /* ---------- 세션 ---------- */
  startCourse(quick) {
    Sound.init(); Voice.stop();
    const S = this.setup, n = S.n, mode = n === 1 ? 'solo' : S.twoMode;
    const names = S.names.slice(0, n), profiles = names.map(nm => Store.profile(nm));
    applyPosture(S.posture); Narr.who = n === 1 ? who(names[0]) + ' 님' : '두 분';
    const games = quick ? [this.course[0]] : this.course.slice();
    const stages = [];
    if (!quick) stages.push({ kind: 'warmup' });
    games.forEach((g, k) => { if (k > 0) stages.push({ kind: 'rest', next: g, relay: mode === 'relay' ? k % 2 : null }); stages.push({ kind: 'game', id: g, relay: mode === 'relay' ? k % 2 : null }); });
    if (!quick) stages.push({ kind: 'cooldown' });
    Pose.players.forEach(P => { P.motion = 0; P.raises = 0; P.squats = 0; P.maxArm = 0; });
    this.session = { names, profiles, n, mode, posture: S.posture, input: S.input, stages, idx: -1, results: [], active: names.map(() => 0), restBonus: 0, start: Date.now() };
    this.show('play'); $('#hud').hidden = false; this.startLoop();
    try { navigator.wakeLock?.request('screen').then(w => this.wake = w).catch(() => { }); } catch (e) { }
    Sound.startMusic(100);
    this.nextStage();
  },
  nextStage() {
    const se = this.session; if (!se) return;
    if (this.stage && this.stage.kind === 'game') se.results.push({ id: this.stage.id, res: this.stage.result(), team: { ...this.stage.team } });
    if (this.stage && this.stage.kind === 'rest' && this.stage.bonus) se.restBonus += this.stage.bonus;
    HandButtons.clear(); FX.clear();
    se.idx++;
    if (se.idx >= se.stages.length) return this.finishSession();
    const st = se.stages[se.idx], s = Store.settings, split = se.n === 2 && se.mode !== 'relay';
    const base = { players: Pose.players, names: se.names, mode: se.mode, posture: se.posture, split };
    if (st.kind === 'warmup') this.stage = new WarmupStage({ ...base, duration: s.warmupSec });
    else if (st.kind === 'cooldown') this.stage = new CooldownStage({ ...base, duration: s.cooldownSec });
    else if (st.kind === 'rest') this.stage = new RestStage({ ...base, duration: s.restSec }, GAMES[st.next].name, st.relay != null ? st.relay + 1 : null);
    else {
      const levels = se.profiles.map(p => s.fixedLevel || p.levels[st.id] || 1);
      const ctx = { ...base, duration: s.roundSec, levels, relayIdx: st.relay ?? 0 };
      this.stage = new GAME_CLASS[st.id](ctx);
      if (se.mode === 'relay') FX.showBanner(`${st.relay + 1}P 차례!`, PCOL[st.relay], GAMES[st.id].name, 2);
    }
    Sound.track(st.kind === 'game' ? (st.id === 'dance' ? 'dance' : 'game') : st.kind === 'rest' ? 'title' : st.kind);
    Sound.startMusic(Sound.tempo || 100);   // 리듬 게임처럼 음악을 멈췄던 단계 다음에도 다시 흐르게
    this.stage.start();
  },
  finishSession(aborted) {
    const se = this.session; if (!se) return;
    if (aborted && this.stage && this.stage.kind === 'game' && this.stage.t > 30) se.results.push({ id: this.stage.id, res: this.stage.result(), team: { ...this.stage.team } });
    this.stage = null; Sound.stopMusic(); Voice.stop(); HandButtons.clear();
    try { this.wake?.release(); } catch (e) { }
    const summary = saveSession(se);
    this.session = null;
    this.renderResult(summary);
    this.show('result');
    Sound.fanfareTrack(); Narr.say('end');
  },

  /* ---------- 게임 루프 ---------- */
  startLoop() { if (this.loopOn) return; this.loopOn = true; this.lastT = now(); requestAnimationFrame(() => this.frame()); },
  frame() {
    const playing = !$('#game').hidden;
    if (!playing) { this.loopOn = false; return; }
    const t = now(); let dt = Math.min(0.1, t - this.lastT); this.lastT = t;
    Pose.update(t, View);
    const st = this.stage, se = this.session;
    // 자리 비움 자동 일시정지
    let absent = false;
    if (st && st.kind !== 'calib' && st.kind !== 'rest' && !this.paused) {
      const need = st.activeIdx ? st.activeIdx() : Pose.players.map((_, i) => i);
      const gone = need.some(i => !Pose.players[i].present);
      if (gone) { this.absentSince ??= t; if (t - this.absentSince > 3) absent = true; } else this.absentSince = null;
    }
    this.absentPause = absent;
    if (st && !this.paused && !absent) {
      st.update(dt); HandButtons.update(dt, Pose.players);
      if (se && st.kind !== 'rest') Pose.players.forEach((P, i) => { if (P.present) se.active[i] += dt; });
    }
    FX.update(dt);
    this.draw(t);
    if (st && st.done && this.stage === st) { if (st.kind === 'calib') st.onDone(); else this.nextStage(); }
    requestAnimationFrame(() => this.frame());
  },
  draw(t) {
    const g = View.g, W = View.W, H = View.H, st = this.stage;
    g.save();
    if (FX.shake > 0) g.translate(rand(-FX.shake, FX.shake), rand(-FX.shake, FX.shake));
    View.drawVideo();
    if (st && st.drawScene) st.drawScene(g, t);
    if (st && st.drawFeverTint) st.drawFeverTint(g, t);
    Pose.players.forEach((P, i) => drawAura(g, P, P.color, st?.ps?.[i]?.combo >= 5 ? 1 : 0, st?.ps?.[i]?.fever > 0));
    if (st) st.draw(g, t);
    FX.draw(g);
    Pose.players.forEach(P => drawHands(g, P, P.color, t));
    if (st && st.drawHud) st.drawHud(g);
    if (st && st.drawGuide && !Narr.showing) st.drawGuide(g);
    HandButtons.draw(g);
    Narr.draw(g);
    drawCorners(g, W, H);
    // 경고
    if (Pose.players.length === 2 && st && st.kind !== 'calib') {
      if (Pose.tooClose) warnBar(g, '두 사람이 조금 떨어져 주세요', COLORS.berry);
      else if (Pose.swapped) warnBar(g, '자기 자리로 돌아가 주세요 (1P 왼쪽 · 2P 오른쪽)', COLORS.berry);
    }
    if (this.absentPause) {
      g.fillStyle = 'rgba(10,13,30,0.6)'; g.fillRect(0, 0, W, H);
      goldText(g, '잠깐 멈췄어요', W / 2, H * 0.4, 72);
      outlineText(g, '화면 안으로 들어와 주세요', W / 2, H * 0.4 + 76, 36, PAL.ivory);
    }
    if (Pose.mode === 'mouse' && st) {
      const tw = Math.min(W - 460, 760); if (tw > 300) { lacquerPanel(g, W / 2 - tw / 2, H - 62, tw, 34, 17, 0.8);
      plainText(g, '시연 키(누르고 있기) 1 만세 · 2 X 자 · 3 왼팔 · 4 오른팔 · 5 양팔 옆 · 6 두 손 · 7 ' + (Pose.posture === 'seat' ? '무릎' : '스쿼트'), W / 2, H - 44, 15, PAL.ivory2, 'center', 500); }
    }
    g.restore();
  },

  /* ---------- 멈춤·그만 ---------- */
  togglePause(force) {
    if (!this.stage) return;
    if (this.paused && force !== true) { this.paused = false; $('#overlay').hidden = true; Sound.startMusic(100); return; }
    this.paused = true; Sound.stopMusic(); Voice.stop();
    this.overlay(`<span class="eyebrow">쉼</span><h3>잠깐 멈췄어요</h3><p class="lead">준비되면 계속해요. 어지럽거나 아프면 그만하세요.</p><div class="row" style="justify-content:center"><button class="big gold" id="ovGo">계속하기</button><button id="ovStop">그만하기</button></div>`);
    $('#ovGo').onclick = () => this.togglePause(); $('#ovStop').onclick = () => this.confirmStop();
  },
  askStop() { if (!this.stage) { this.quitAll(); return; } this.paused = true; Sound.stopMusic(); this.confirmStop(); },
  confirmStop() {
    this.overlay(`<h3>오늘은 여기까지 할까요?</h3><p class="lead">지금까지 한 기록은 저장돼요.</p><div class="row" style="justify-content:center"><button class="big danger" id="ovYes">네, 그만할래요</button><button id="ovNo">계속하기</button></div>`);
    $('#ovYes').onclick = () => { this.paused = false; $('#overlay').hidden = true; if (this.session) this.finishSession(true); else this.quitAll(); };
    $('#ovNo').onclick = () => this.togglePause();
  },
  quitAll() { this.stage = null; this.session = null; this.paused = false; Sound.stopMusic(); Voice.stop(); Pose.stopCamera(); this.calibrated = false; this.show('title'); },
  onKey(e, down) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const map = { '1': 'up', '2': 'cross', '3': 'left', '4': 'right', '5': 'tee', '6': 'clap', '7': 'squat' };
    if (map[e.key] && Pose.mode === 'mouse') { Pose.demo.gesture = down ? map[e.key] : 'none'; e.preventDefault(); return; }
    if (!down) return;
    if (e.code === 'Space' && this.stage) { e.preventDefault(); this.togglePause(); }
    if (e.key === 'Escape' && this.stage) this.askStop();
  },

  /* ---------- 결과 ---------- */
  renderResult(sum) {
    const W = $('#resultWrap'); const modeName = { solo: '혼자', coop: '협동', versus: '대결', relay: '릴레이' }[sum.mode];
    const d = new Date(); const dateTxt = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    let head = '';
    if (sum.mode === 'versus' && sum.players.length === 2) {
      const [a, b] = sum.players; const w = a.total === b.total ? null : (a.total > b.total ? a : b);
      head = `<div class="panel" style="align-items:center;text-align:center"><span class="eyebrow">나란히 겨루기</span><h2>${w ? `${esc(who(w.name))} 님이 이겼어요` : '무승부예요'}</h2><p class="lead" style="max-width:none">${esc(who(a.name))} ${a.total.toLocaleString()}점 · ${esc(who(b.name))} ${b.total.toLocaleString()}점 · 서로 다른 난이도로 겨뤘어요</p></div>`;
    } else if (sum.mode === 'coop' || sum.mode === 'relay') {
      head = `<div class="panel" style="align-items:center;text-align:center"><span class="eyebrow">${sum.mode === 'coop' ? '함께 모으기' : '번갈아 하기'}</span><h2>팀 점수 <span class="nacre-text">${sum.teamTotal.toLocaleString()}</span></h2><p class="lead" style="max-width:none">${sum.mode === 'coop' ? `팀 별 ${sum.teamStars}개 · 하모니 ${sum.harmony}번` : `응원 박수 ${sum.cheers}번`}${sum.restBonus ? ` · 하이파이브 보너스 ${sum.restBonus}` : ''}</p></div>`;
    }
    // 영역별(기억·집중·판단) 오늘 정확도와 지난 기록 평균
    const domains = name => {
      const pr = Store.profile(name), past = pr.sessions.slice(0, -1).slice(-8);
      return Object.entries(CATS).map(([c, C]) => {
        const avg = arr => arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null;
        const today = avg((pr.sessions.at(-1)?.games || []).filter(g => GAME_CAT[g.game] === c && g.accuracy != null).map(g => g.accuracy));
        const before = avg(past.flatMap(se => se.games).filter(g => GAME_CAT[g.game] === c && g.accuracy != null).map(g => g.accuracy));
        return { c, C, today, before };
      });
    };
    const cards = sum.players.map((p, i) => {
      const stars = p.games.reduce((a, g) => a + g.stars, 0), dm = domains(p.name);
      return `
      <div class="panel cert">
        <span class="seal">참<br>잘했어요</span>
        <div><span class="eyebrow" style="color:${PCOL[i]}">${sum.players.length > 1 ? (i ? '2P · 주황' : '1P · 청색') : '오늘의 기록'}</span><h3 style="font-size:34px;margin-top:4px">${esc(who(p.name))} 님</h3></div>
        <div class="res-tiles">
          <div class="rt"><span class="k">총점</span><span class="v">${p.total.toLocaleString()}</span></div>
          <div class="rt"><span class="k">모은 별</span><span class="v stars">★ ${stars}</span></div>
          <div class="rt"><span class="k">움직인 시간</span><span class="v">${Math.max(1, Math.round(p.activeSec / 60))}<small>분</small></span></div>
          <div class="rt"><span class="k">만세 · ${sum.posture === 'seat' ? '무릎' : '스쿼트'}</span><span class="v">${p.raises}<small>·</small>${p.squats}</span></div>
        </div>
        <div class="row"><span class="chip gold">씨앗 +${p.seedsEarned}</span><span class="chip">물방울 +${p.dropsEarned}</span>${p.newTitles.map(t => `<span class="chip gold">새 칭호 · ${esc(t)}</span>`).join('')}</div>
        <div class="dom">${dm.map(d => `<div class="dm ${d.today == null ? 'off' : ''}" style="--dc:${d.C.c}"><span class="dn"><i>${d.C.seal}</i>${d.C.n}</span><span class="bar"><b style="width:${d.today == null ? 0 : Math.round(d.today * 100)}%"></b>${d.before != null ? `<u style="left:${Math.round(d.before * 100)}%" title="지난 평균"></u>` : ''}</span><span class="dv">${d.today == null ? '오늘은 안 했어요' : pct(d.today) + (d.before != null ? (d.today >= d.before ? ` <em class="up">▲ ${Math.round((d.today - d.before) * 100)}</em>` : ` <em>▼ ${Math.round((d.before - d.today) * 100)}</em>`) : '')}</span></div>`).join('')}<p class="note" style="margin:2px 0 0">막대는 오늘 정확도, 세로 금선은 지난 평균이에요</p></div>
        <div class="res-games">${p.games.length ? p.games.map(gm => `<div class="rg"><span class="th" style="background-image:url('${ASSETS[GAMES[gm.game].img]}')"></span><span class="rgb"><b>${GAMES[gm.game].short}</b><span class="stars">${'★'.repeat(gm.stars)}<span style="opacity:.25">${'★'.repeat(3 - gm.stars)}</span></span><small>정확도 ${pct(gm.accuracy)}${gm.meanRT ? ' · 반응 ' + fmt1(gm.meanRT) + '초' : ''} · ${gm.score.toLocaleString()}점</small></span><span class="lvl">${gm.newLevel > gm.level ? `<em class="up">${gm.level} → ${gm.newLevel}단계</em>` : gm.newLevel < gm.level ? `${gm.level} → ${gm.newLevel}단계` : gm.level + '단계'}</span></div>`).join('') : '<p class="muted">이번에는 게임 기록이 없어요</p>'}</div>
        ${p.missionsDone.length ? `<p class="muted">끝낸 미션 · ${p.missionsDone.map(esc).join(', ')}</p>` : ''}
      </div>`; }).join('');
    W.innerHTML = `<div class="row between"><div><span class="eyebrow">${Store.settings.orgName ? esc(Store.settings.orgName) + ' · ' : ''}${dateTxt} · ${modeName} · ${sum.posture === 'seat' ? '앉아서' : '서서'}</span><h2>오늘도 잘 움직였어요</h2></div></div>${head}<div class="${sum.players.length > 1 ? 'grid2' : 'res-one'}">${cards}</div>
      <div class="row"><button class="big gold" id="rsGarden">정원에 씨앗 심기</button><button id="rsAgain">마을 지도로</button><button class="link" id="rsHome">처음으로</button></div>
      <p class="note">게임 기록은 훈련을 돕기 위한 참고값이며 진단 결과가 아니에요.</p>`;
    $('#rsGarden').onclick = () => this.openGarden(sum.players[0].name, sum.players.map(p => p.name));
    $('#rsAgain').onclick = () => { this.course = []; this.openMap(); };
    $('#rsHome').onclick = () => this.quitAll();
  },

  /* ---------- 정원 ---------- */
  openGarden(name, names) {
    if (!name) { toast('아직 기록이 없어요. 먼저 게임을 해 보세요'); return; }
    const all = names || Store.names(); this.gardenNames = all.length ? all : [name];
    this.show('garden'); renderGarden(name, this.gardenNames);
  },
  openRecords(name) { this.adminTab('records'); },
  openSettings() { this.adminTab('settings'); }
};

function warnBar(g, msg, color) { const W = View.W, w = Math.min(W - 80, 680); g.save(); g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 16; pill(g, W / 2 - w / 2, 200, w, 58, PAL.verm); g.restore(); plainText(g, msg, W / 2, 229, 24, '#FFF4EC', 'center', 700); }

/* ---------- 인식 맞추기(캘리브레이션) ---------- */
class CalibStage {
  constructor(players, n, onDone) { this.players = players; this.n = n; this.onDone = onDone; this.kind = 'calib'; this.t = 0; this.prog = players.map(() => 0); this.done = false; this.readyT = 0; }
  start() { const sit = Pose.posture === 'seat'; Narr.plain((this.n === 2 ? '1P는 왼쪽, 2P는 오른쪽에 ' : '화면 가운데에 ') + (sit ? '의자에 앉아' : '서서') + ' 팔을 내리고 가만히 있어요'); HandButtons.clear(); }
  update(dt) {
    this.t += dt;
    this.players.forEach((P, i) => {
      const okSide = this.n === 1 || !P.lastX || (i === 0 ? P.lastX < 0.55 : P.lastX > 0.45);
      if (P.present && okSide && (P.gesture === 'none' || P.gesture === 'clap')) { sampleBase(P); this.prog[i] = Math.min(1, this.prog[i] + dt / 1.6); }
      else this.prog[i] = Math.max(0, this.prog[i] - dt * 0.5);
    });
    if (this.prog.every(p => p >= 1)) { this.readyT += dt; if (this.readyT > 0.6 && !this.done) { this.done = true; Sound.fanfare(); Narr.say('calibDone'); } }
  }
  draw(g, t) {
    const W = View.W, H = View.H;
    const pw = Math.min(W - 80, 860); lacquerPanel(g, W / 2 - pw / 2, 34, pw, 112, 22, 0.86);
    plainText(g, '몸 인식', W / 2, 62, 16, PAL.gold, 'center', 600);
    const seat = Pose.posture === 'seat';
    g.font = `700 38px ${SERIF}`; g.textAlign = 'center'; g.fillStyle = PAL.ivory; g.fillText(seat ? '의자에 앉아 팔을 내려 주세요' : '가만히 서서 팔을 내려 주세요', W / 2, 98);
    plainText(g, (this.n === 2 ? '1P는 왼쪽 · 2P는 오른쪽 · ' : '') + (seat ? '머리부터 무릎·발까지 보이게 앉아 주세요' : '머리부터 무릎까지 보이게'), W / 2, 128, 18, PAL.ivory2, 'center', 500);
    this.players.forEach((P, i) => {
      const cx = this.n === 1 ? W / 2 : (i ? W * 0.72 : W * 0.28), y = H - 120;
      if (!P.present) { g.save(); g.globalAlpha = 0.55; drawFairy(g, cx, H * 0.38, Math.min(H * 0.08, 70), 'wave', t, P.color, '', 'p' + i); g.restore(); outlineText(g, Pose.posture === 'seat' ? '여기에 앉아 주세요' : '여기에 서 주세요', cx, H * 0.38 - 86, 30, P.color); }
      const w = Math.min(360, W * 0.34);
      g.fillStyle = 'rgba(10,13,28,0.75)'; roundRect(g, cx - w / 2, y, w, 14, 7); g.fill();
      g.fillStyle = this.prog[i] >= 1 ? nacreStroke(g, cx - w / 2, 0, cx + w / 2, 0) : P.color; roundRect(g, cx - w / 2, y, Math.max(14, w * this.prog[i]), 14, 7); g.fill();
      outlineText(g, this.prog[i] >= 1 ? `${this.players.length > 1 ? (i ? '2P ' : '1P ') : ''}준비 완료` : P.present ? '그대로 계세요' : '사람을 찾는 중', cx, y - 26, 28, this.prog[i] >= 1 ? PAL.gold2 : P.color);
    });
  }
}

/* ================= 세션 저장 · 보상 · 미션 ================= */
const MISSION_POOL = [
  { id: 'raises', text: '만세 30번 하기', target: 30 }, { id: 'combo', text: '콤보 10 달성하기', target: 10 },
  { id: 'three', text: '별 3개 받기', target: 1 }, { id: 'acc80', text: '정확도 80% 이상 2판', target: 2 },
  { id: 'fruits', text: '과일 30개 수확하기', target: 30 }, { id: 'constel', text: '별자리 2개 완성하기', target: 2 },
  { id: 'move10', text: '10분 이상 움직이기', target: 600 }, { id: 'coop', text: '2인 협동으로 1판 하기', target: 1 }, { id: 'span4', text: '댄스 4동작 성공하기', target: 4 }
];
function ensureMissions(p) {
  const d = todayKey();
  if (!p.missions || p.missions.date !== d) p.missions = { date: d, list: shuffle(MISSION_POOL).slice(0, 3).map(m => ({ ...m, prog: 0, done: false })) };
  return p.missions;
}
function updateMissions(p, rec, mode) {
  ensureMissions(p); const done = [];
  for (const m of p.missions.list) {
    if (m.done) continue;
    const gs = rec.games;
    switch (m.id) {
      case 'raises': m.prog += rec.raises; break;
      case 'combo': m.prog = Math.max(m.prog, ...gs.map(g => g.maxCombo), 0); break;
      case 'three': m.prog += gs.filter(g => g.stars === 3).length; break;
      case 'acc80': m.prog += gs.filter(g => g.accuracy >= 0.8 && g.trials >= 4).length; break;
      case 'fruits': m.prog += gs.reduce((a, g) => a + (g.fruits || 0), 0); break;
      case 'constel': m.prog += gs.reduce((a, g) => a + (g.constellations?.length || 0), 0); break;
      case 'move10': m.prog += Math.round(rec.activeSec); break;
      case 'coop': if (mode === 'coop') m.prog += gs.length; break;
      case 'span4': m.prog = Math.max(m.prog, ...gs.map(g => g.maxSpan || 0), 0); break;
    }
    if (m.prog >= m.target) { m.done = true; done.push(m.text); }
  }
  return done;
}
function computeTitles(p) {
  const t = new Set(p.titles);
  const uniqC = new Set(p.sessions.flatMap(s => s.games.flatMap(g => g.constellations || [])));
  if (uniqC.size >= 6) t.add('별자리 박사');
  if ((p.best.dance?.span || 0) >= 6) t.add('댄스 왕');
  if ((p.best.balloon?.stars || 0) >= 3) t.add('풍선 명사수');
  if (p.sessions.some(s => s.games.some(g => g.game === 'ox' && g.accuracy >= 0.9 && g.trials >= 8))) t.add('계산 척척');
  if (p.totals.fruits >= 100) t.add('과수원 지기');
  const cut = Date.now() - 28 * 864e5; if (p.days.filter(d => new Date(d).getTime() >= cut).length >= 12) t.add('꾸준왕');
  if (p.garden.length >= 30) t.add('축제 마을 촌장');
  const nw = [...t].filter(x => !p.titles.includes(x)); p.titles = [...t]; return nw;
}
function saveSession(se) {
  const date = new Date(), players = [];
  const team = se.results.reduce((a, r) => ({ stars: a.stars + (r.team.stars || 0), harmony: a.harmony + (r.team.harmony || 0), cheers: a.cheers + (r.team.cheers || 0) }), { stars: 0, harmony: 0, cheers: 0 });
  se.names.forEach((name, i) => {
    const p = se.profiles[i], P = Pose.players[i];
    const games = se.results.map(r => r.res[i]).filter(g => g && g.played);
    const accs = games.filter(g => g.accuracy != null).map(g => g.accuracy);
    const prevS = p.sessions.slice(-1)[0];
    const prevAccs = prevS ? prevS.games.filter(g => g.accuracy != null).map(g => g.accuracy) : [];
    const rec = { ts: date.getTime(), date: date.toLocaleString('ko-KR'), mode: se.mode, partner: se.n === 2 ? se.names[1 - i] : '', posture: se.posture, input: se.input, games, activeSec: Math.round(se.active[i]), motion: Math.round(P.motion * 100) / 100, raises: P.raises, squats: P.squats, maxArm: Math.round(P.maxArm), team: se.mode === 'coop' ? team : null };
    for (const g of games) {
      p.levels[g.game] = Store.settings.fixedLevel ? (p.levels[g.game] || 1) : g.newLevel;
      const b = p.best[g.game] ||= { stars: 0, score: 0, span: 0 };
      b.stars = Math.max(b.stars, g.stars); b.score = Math.max(b.score, g.score); b.span = Math.max(b.span, g.maxSpan || 0);
      p.totals.fruits += g.fruits || 0; p.totals.constellations += g.constellations?.length || 0; p.totals.games++;
    }
    p.totals.raises += P.raises;
    p.sessions.push(rec);
    if (!p.days.includes(todayKey(date))) p.days.push(todayKey(date));
    const missionsDone = updateMissions(p, rec, se.mode);
    const seedsEarned = games.reduce((a, g) => a + g.stars, 0) + missionsDone.length * 2 + (se.mode === 'coop' ? team.stars : 0);
    const dropsEarned = Math.round(P.motion * 4 + rec.activeSec / 30);
    p.seeds += seedsEarned; p.drops += dropsEarned;
    const newTitles = computeTitles(p);
    players.push({ name, games, total: games.reduce((a, g) => a + g.score, 0), activeSec: rec.activeSec, raises: P.raises, squats: P.squats, maxArm: P.maxArm, seedsEarned, dropsEarned, missionsDone, newTitles, avgAcc: accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : null, prevAcc: prevAccs.length ? prevAccs.reduce((a, b) => a + b, 0) / prevAccs.length : null });
  });
  if (!Store.save()) toast('기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요', 4000);
  return { mode: se.mode, posture: se.posture, players, teamTotal: players.reduce((a, p) => a + p.total, 0) + se.restBonus, teamStars: team.stars, harmony: team.harmony, cheers: team.cheers, restBonus: se.restBonus };
}

/* ================= 정원 ================= */
const FLOWERS = [
  { n: '해바라기', c: '#FFC83A', k: '#7A4A1C' }, { n: '진달래', c: '#F06BA8', k: '#FFE1EF' }, { n: '개나리', c: '#FFD84A', k: '#FFF4B8' }, { n: '무궁화', c: '#E78AC0', k: '#B0185F' },
  { n: '코스모스', c: '#F59AC2', k: '#FFD84A' }, { n: '국화', c: '#FFB233', k: '#E07A00' }, { n: '튤립', c: '#E8456E', k: '#FFD84A' }, { n: '수국', c: '#8FA8F5', k: '#C7D3FF' },
  { n: '동백', c: '#D72845', k: '#FFD84A' }, { n: '나팔꽃', c: PAL.plum, k: '#FFFFFF' }, { n: '백합', c: '#FFFFFF', k: '#FFC83A' }, { n: '연꽃', c: '#FF9AB8', k: '#FFE27A' }
];
const TREES = [{ n: '사과나무', c: '#E53B4B' }, { n: '감나무', c: '#FF9A1F' }, { n: '벚나무', c: '#FFB7D0' }, { n: '소나무', c: null }];
const GSTAGES = [{ min: 0, n: '새싹 정원' }, { min: 5, n: '꽃밭' }, { min: 15, n: '과수원' }, { min: 30, n: '축제 마을' }];
function gardenStage(n) { let s = GSTAGES[0], k = 0; GSTAGES.forEach((x, i) => { if (n >= x.min) { s = x; k = i; } }); return { ...s, k }; }
function plantKind(idx) { return (idx + 1) % 5 === 0 ? { type: 'tree', ...TREES[Math.floor(idx / 5) % TREES.length] } : { type: 'flower', ...FLOWERS[(idx - Math.floor((idx + 1) / 5)) % FLOWERS.length] }; }
function drawFlower(g, x, y, s, f, t = 0) {
  g.strokeStyle = '#3FA65A'; g.lineWidth = Math.max(2, s * 0.12); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.sin(t + x) * s * 0.2, y - s * 0.8, x, y - s * 1.5); g.stroke();
  g.fillStyle = '#3FA65A'; g.beginPath(); g.ellipse(x + s * 0.25, y - s * 0.6, s * 0.28, s * 0.12, -0.5, 0, 7); g.fill();
  const cy = y - s * 1.5; g.fillStyle = f.c;
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + t * 0.2; g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.32, cy + Math.sin(a) * s * 0.32, s * 0.3, s * 0.18, a, 0, 7); g.fill(); }
  g.fillStyle = f.k; g.beginPath(); g.arc(x, cy, s * 0.2, 0, 7); g.fill();
  if (f.c === '#FFFFFF') { g.strokeStyle = '#E1E5F2'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, cy, s * 0.55, 0, 7); g.stroke(); }
}
function drawTree(g, x, y, s, tr) {
  g.fillStyle = '#8A5A33'; g.fillRect(x - s * 0.12, y - s * 1.2, s * 0.24, s * 1.2);
  if (!tr.c) { g.fillStyle = '#2E7D4F'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - s * (0.9 - k * 0.2), y - s * (0.9 + k * 0.55)); g.lineTo(x + s * (0.9 - k * 0.2), y - s * (0.9 + k * 0.55)); g.lineTo(x, y - s * (1.6 + k * 0.55)); g.closePath(); g.fill(); } return; }
  g.fillStyle = '#3FA65A'; g.beginPath(); g.arc(x, y - s * 1.6, s * 0.75, 0, 7); g.arc(x - s * 0.5, y - s * 1.3, s * 0.5, 0, 7); g.arc(x + s * 0.5, y - s * 1.3, s * 0.5, 0, 7); g.fill();
  g.fillStyle = tr.c; for (const [dx, dy] of [[-0.3, -1.7], [0.3, -1.5], [0, -1.2], [-0.55, -1.25], [0.55, -1.15], [0.1, -1.95]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, s * 0.11, 0, 7); g.fill(); }
}
function drawVillage(g, W, H, stage, t = 0) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#BFE3FF'); gr.addColorStop(1, '#EAF6FF'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // 무지개(축제 마을부터 또렷하게)
  g.save(); g.globalAlpha = stage >= 3 ? 0.55 : 0.18 + stage * 0.08; const rc = ['#E8456E', '#FF8A1F', '#FFC83A', '#38B07A', '#2F7CF6', PAL.plum];
  rc.forEach((c, k) => { g.strokeStyle = c; g.lineWidth = H * 0.02; g.beginPath(); g.arc(W * 0.62, H * 0.78, H * (0.62 - k * 0.02), Math.PI, 0); g.stroke(); }); g.restore();
  g.fillStyle = '#9FD8A8'; g.beginPath(); g.moveTo(0, H * 0.62); g.quadraticCurveTo(W * 0.25, H * 0.48, W * 0.55, H * 0.6); g.quadraticCurveTo(W * 0.8, H * 0.7, W, H * 0.56); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  g.fillStyle = '#7CC98C'; g.beginPath(); g.moveTo(0, H * 0.74); g.quadraticCurveTo(W * 0.4, H * 0.64, W, H * 0.76); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  // 집(한옥 지붕 느낌)
  const house = (x, y, s, c) => { g.fillStyle = '#FFF6E6'; g.fillRect(x - s, y - s * 0.9, s * 2, s * 0.9); g.fillStyle = c; g.beginPath(); g.moveTo(x - s * 1.35, y - s * 0.8); g.quadraticCurveTo(x, y - s * 1.2, x + s * 1.35, y - s * 0.8); g.lineTo(x + s * 0.9, y - s * 1.45); g.quadraticCurveTo(x, y - s * 1.6, x - s * 0.9, y - s * 1.45); g.closePath(); g.fill(); g.fillStyle = '#8A5A33'; g.fillRect(x - s * 0.2, y - s * 0.55, s * 0.4, s * 0.55); };
  house(W * 0.14, H * 0.6, H * 0.06, '#3B4C7A'); house(W * 0.86, H * 0.58, H * 0.055, '#5B3B2E');
  // 장독대
  for (let k = 0; k < 3; k++) { g.fillStyle = '#6B3E26'; g.beginPath(); g.ellipse(W * 0.24 + k * H * 0.04, H * 0.61, H * 0.017, H * 0.022, 0, 0, 7); g.fill(); g.fillStyle = '#4A2A19'; g.fillRect(W * 0.24 + k * H * 0.04 - H * 0.012, H * 0.585, H * 0.024, H * 0.006); }
  if (stage >= 1) { // 원두막
    const x = W * 0.74, y = H * 0.62, s = H * 0.05; g.fillStyle = '#8A5A33'; g.fillRect(x - s, y - s * 1.2, s * 0.12, s * 1.2); g.fillRect(x + s * 0.88, y - s * 1.2, s * 0.12, s * 1.2); g.fillRect(x - s * 1.05, y - s * 0.55, s * 2.1, s * 0.12);
    g.fillStyle = '#D9B26A'; g.beginPath(); g.moveTo(x - s * 1.3, y - s * 1.1); g.lineTo(x, y - s * 1.8); g.lineTo(x + s * 1.3, y - s * 1.1); g.closePath(); g.fill();
  }
  if (stage >= 2) { // 오일장 천막
    const x = W * 0.42, y = H * 0.66, s = H * 0.05; for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#fff' : '#E8456E'; g.fillRect(x - s * 1.4 + k * s * 0.7, y - s * 1.2, s * 0.7, s * 0.5); } g.fillStyle = '#8A5A33'; g.fillRect(x - s * 1.4, y - s * 0.7, s * 0.1, s * 0.7); g.fillRect(x + s * 1.3, y - s * 0.7, s * 0.1, s * 0.7);
  }
  if (stage >= 3) { // 축제 청사초롱
    g.strokeStyle = 'rgba(34,37,74,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, H * 0.18); g.quadraticCurveTo(W / 2, H * 0.3, W, H * 0.18); g.stroke();
    for (let k = 1; k < 12; k++) { const x = k * W / 12, y = H * 0.18 + Math.sin(Math.PI * k / 12) * H * 0.12 * 0.95; g.fillStyle = k % 2 ? '#D72845' : '#2F4FB0'; roundRect(g, x - 10, y, 20, 28, 8); g.fill(); g.fillStyle = '#FFC83A'; g.fillRect(x - 10, y + 12, 20, 4); }
  }
}
function renderGarden(name, names) {
  const p = Store.profile(name), W = $('#gardenWrap');
  const st = gardenStage(p.garden.length), next = GSTAGES[st.k + 1];
  const uniqC = [...new Set(p.sessions.flatMap(s => s.games.flatMap(g => g.constellations || [])))];
  W.innerHTML = `
    <div class="row between"><div><h2>${esc(maskName(p.name))} 님의 정원</h2><p class="lead">${st.n}${next ? ` · ${next.min - p.garden.length}그루 더 심으면 '${next.n}'` : ' · 최고 단계에 도착했어요'}</p></div>
      <div class="row">${names.length > 1 ? `<select id="gdWho" aria-label="정원 주인">${names.map(n => `<option value="${esc(n)}" ${n === name ? 'selected' : ''}>${esc(whoFull(n))}</option>`).join('')}</select>` : ''}<button class="link" id="gdBack">${App.session || App.calibrated ? '마을 지도로' : '처음으로'}</button></div></div>
    <div class="panel" style="padding:0;overflow:hidden"><canvas id="gardenCv" style="width:100%;height:min(56vh,520px);display:block;border-radius:22px"></canvas></div>
    <div class="garden-bar">
      <div class="res-tiles" style="flex:1">
        <div class="rt"><span class="k">씨앗</span><span class="v">${p.seeds}<small>개</small></span></div>
        <div class="rt"><span class="k">물방울</span><span class="v">${p.drops}<small>개</small></span></div>
        <div class="rt"><span class="k">심은 식물</span><span class="v">${p.garden.length}<small>그루</small></span></div>
        <div class="rt"><span class="k">${next ? `'${next.n}'까지` : '정원 단계'}</span><span class="v" style="font-size:22px">${next ? `${next.min - p.garden.length}그루 남음` : '최고 단계'}</span>${next ? `<span class="gbar"><i style="width:${Math.round(clamp((p.garden.length - (GSTAGES[st.k]?.min || 0)) / Math.max(1, next.min - (GSTAGES[st.k]?.min || 0)), 0, 1) * 100)}%"></i></span>` : ''}</div>
      </div>
      <button class="gold big" id="gdPlant" ${p.seeds ? '' : 'disabled'}>${p.seeds ? `씨앗 ${p.seeds}개 심기` : '씨앗을 모아 오세요'}</button>
    </div>
    ${p.titles.length ? `<div class="row">${p.titles.map(t => `<span class="chip gold">칭호 · ${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="panel"><h3>도감</h3><p class="note">꽃과 나무는 씨앗을 심으면, 별자리는 밤하늘 별자리 잇기에서 완성하면 모여요.</p>
      <div class="collection" id="collList"></div></div>`;
  const cv = $('#gardenCv'), ctx = cv.getContext('2d'); let anim = 0, raf;
  const paint = () => {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height, t = performance.now() / 1000;
    drawCover(ctx, IMG.garden, 0, 0, w, h, 1, 0.4);
    const stg = gardenStage(p.garden.length).k; if (stg < 3) { ctx.fillStyle = `rgba(14,18,40,${0.35 - stg * 0.1})`; ctx.fillRect(0, 0, w, h); }
    if (stg >= 3) { ctx.strokeStyle = 'rgba(243,216,140,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, h * 0.14); ctx.quadraticCurveTo(w / 2, h * 0.26, w, h * 0.14); ctx.stroke(); for (let k = 1; k < 10; k++) { const x = k * w / 10, y = h * 0.14 + Math.sin(Math.PI * k / 10) * h * 0.11; drawLantern(ctx, x, y + 26, 14, k % 2 ? LANTERN.red.c : LANTERN.blue.c, t, 0.7); } }
    const grow = clamp(0.55 + p.drops / 400, 0.55, 1.15);
    p.garden.map((pl, k) => k).sort((a, b) => Math.floor(b / 8) % 5 - Math.floor(a / 8) % 5).forEach(k => {
      const col = k % 8, row = Math.floor(k / 8) % 5, x = w * (0.07 + col * 0.12 + (row % 2) * 0.06 + ((k * 37) % 7) * 0.003), y = h * (0.97 - row * 0.065);
      const kind = plantKind(k), s = h * 0.085 * (1 - row * 0.13) * grow * (k >= p.garden.length - anim ? Math.min(1, (t - App.plantT) * 2) : 1);
      if (s <= 0) return; kind.type === 'tree' ? drawTree(ctx, x, y, s * 1.4, kind) : drawFlower(ctx, x, y, s, kind, t);
    });
    if (p.garden.length >= 5) for (let k = 0; k < Math.min(6, Math.floor(p.garden.length / 5)); k++) { const bx = w * (0.2 + 0.12 * k) + Math.sin(t * 1.3 + k) * 30, by = h * 0.5 + Math.cos(t * 1.7 + k * 2) * 20; ctx.fillStyle = ['#FFC83A', '#E8456E', PAL.plum][k % 3]; const f = Math.abs(Math.sin(t * 9 + k)) * 8 + 3; ctx.beginPath(); ctx.ellipse(bx - 5, by, f, 7, -0.4, 0, 7); ctx.ellipse(bx + 5, by, f, 7, 0.4, 0, 7); ctx.fill(); }
    if (!$('#scr-garden').hidden && document.body.contains(cv)) raf = requestAnimationFrame(paint);
  };
  paint();
  $('#gdPlant').onclick = () => { anim = p.seeds; App.plantT = performance.now() / 1000; for (let k = 0; k < anim; k++) p.garden.push({ born: Date.now() }); const n = anim; p.seeds = 0; computeTitles(p); Store.save(); Sound.init(); Sound.harp(); toast(`${n}그루를 심었어요`); setTimeout(() => { cancelAnimationFrame(raf); renderGarden(name, names); }, 1400); };
  $('#gdBack').onclick = () => { cancelAnimationFrame(raf); if (App.calibrated) App.openMap(); else App.show('title'); };
  if ($('#gdWho')) $('#gdWho').onchange = e => { cancelAnimationFrame(raf); renderGarden(e.target.value, names); };
  // 도감
  const plantedNames = new Set(p.garden.map((_, k) => plantKind(k).n));
  const items = FLOWERS.map(f => ({ n: f.n, on: plantedNames.has(f.n), draw: c => drawFlower(c, 36, 64, 26, f) }))
    .concat(TREES.map(tr => ({ n: tr.n, on: plantedNames.has(tr.n), draw: c => drawTree(c, 36, 68, 22, tr) })))
    .concat(CONSTELLATIONS.map(cn => ({ n: cn, on: uniqC.includes(cn), draw: c => { c.fillStyle = '#1B2160'; c.fillRect(0, 0, 72, 72); const pts = [[14, 50], [26, 30], [40, 36], [52, 18], [60, 44]]; c.strokeStyle = '#FFD23F'; c.lineWidth = 2; c.beginPath(); pts.forEach(([x, y]) => c.lineTo(x, y)); c.stroke(); pts.forEach(([x, y]) => star5(c, x, y, 6, 2.6, '#FFF6C0')); } })));
  $('#collList').innerHTML = items.map((it, k) => `<div class="coll ${it.on ? '' : 'off'}"><canvas width="144" height="144" data-k="${k}"></canvas><span>${it.on ? esc(it.n) : '???'}</span></div>`).join('');
  $$('#collList canvas').forEach(c => { const x = c.getContext('2d'); x.scale(2, 2); items[+c.dataset.k].draw(x); });
}

/* ================= 기록 ================= */
function renderRecords(name) {
  const names = Store.names(), W = $('#recordsWrap');
  if (!names.length) { W.innerHTML = App.adminNav('records') + `<div class="panel"><p class="lead">아직 등록된 참여자가 없어요. 참여자 탭에서 먼저 등록해 주세요.</p></div>`; App.bindAdminNav(); return; }
  name = name && names.includes(name) ? name : names[0];
  const p = Store.profile(name);
  const gsel = App.recGame || 'all';
  const rows = p.sessions.slice().reverse().flatMap(s => s.games.filter(g => gsel === 'all' || g.game === gsel).map(g => ({ s, g })));
  // 이번 주 달력
  const d0 = new Date(); const dow = (d0.getDay() + 6) % 7; const mon = new Date(d0); mon.setDate(d0.getDate() - dow);
  const week = [...Array(7)].map((_, k) => { const d = new Date(mon); d.setDate(mon.getDate() + k); return { k: todayKey(d), lab: '월화수목금토일'[k] }; });
  const thisWeek = week.filter(w => p.days.includes(w.k)).length;
  // 향상률 순위(이번 주 vs 지난주 평균 정확도)
  const weekAcc = (pr, from, to) => { const a = pr.sessions.filter(s => s.ts >= from && s.ts < to).flatMap(s => s.games.map(g => g.accuracy).filter(v => v != null)); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };
  const t0 = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()).getTime();
  const board = names.map(n => { const pr = Store.profile(n); const a = weekAcc(pr, t0, t0 + 7 * 864e5), b = weekAcc(pr, t0 - 7 * 864e5, t0); return { n, d: a != null && b != null ? a - b : null }; }).filter(x => x.d != null).sort((x, y) => y.d - x.d);
  W.innerHTML = `
    ${App.adminNav('records')}
    <div class="row"><label class="field" style="flex-direction:row;align-items:center;gap:12px">참여자 <select id="rcWho" aria-label="참여자" style="max-width:320px">${names.map(n => `<option value="${esc(n)}" ${n === name ? 'selected' : ''}>${esc(whoFull(n))}</option>`).join('')}</select></label></div>
    <div class="grid2">
      <div class="panel"><h3>이번 주 참여 <span class="chip">${thisWeek}/3회 목표</span></h3><div class="week">${week.map(w => `<span class="${p.days.includes(w.k) ? 'on' : ''} ${w.k === todayKey() ? 'today' : ''}">${w.lab}</span>`).join('')}</div>
        <p class="note">매일이 아니어도 괜찮아요. 일주일에 3번이 목표예요.</p></div>
      <div class="panel"><h3>향상률 순위 <span class="chip">지난주 대비</span></h3>${board.length ? board.map((b, k) => `<div class="mission"><span>${k + 1}. ${esc(whoFull(b.n))}</span><b style="color:${b.d >= 0 ? 'var(--gold2)' : 'var(--mute)'}">${b.d >= 0 ? '+' : ''}${Math.round(b.d * 100)}%p</b></div>`).join('') : '<p class="note">두 주 연속 기록이 쌓이면 보여요.</p>'}</div>
    </div>
    <div class="panel"><div class="row between"><h3>변화 추이</h3>
      <div class="opts" id="rcGame">${[['all', '전체']].concat(GAME_ORDER.map(g => [g, GAMES[g].short])).map(([v, l]) => `<button class="opt" data-v="${v}" aria-pressed="${gsel === v}">${l}</button>`).join('')}</div></div>
      <div class="legend"><span><i style="background:var(--gold2)"></i>정확도(%)</span><span><i style="background:#9FD8F2"></i>평균 반응시간(초)</span></div>
      <div class="chartbox"><canvas id="rcChart"></canvas></div></div>
    <div class="panel"><div class="row between"><h3>회차별 기록</h3><div class="row"><button class="small gold" id="rcCsv">CSV 내려받기(이 사람)</button><button class="small" id="rcCsvAll">CSV 내려받기(전체)</button></div></div>
      <div class="tablebox"><table><thead><tr><th>날짜</th><th>장소</th><th>모드</th><th>단계</th><th>정확도</th><th>반응시간</th><th>기억 길이</th><th>오반응</th><th>무반응</th><th>별</th><th>점수</th></tr></thead><tbody>
      ${rows.slice(0, 60).map(({ s, g }) => `<tr><td>${esc(s.date)}</td><td>${GAMES[g.game].short}</td><td>${{ solo: '혼자', coop: '협동', versus: '대결', relay: '릴레이' }[s.mode]}${s.input === 'mouse' ? '(시연)' : ''}</td><td>${g.level}</td><td>${pct(g.accuracy)}</td><td>${g.meanRT ? fmt1(g.meanRT) + '초' : '–'}</td><td>${g.maxSpan || '–'}</td><td>${g.commission}</td><td>${g.omission}</td><td>${g.stars}</td><td>${g.score.toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="11">기록이 없어요</td></tr>'}
      </tbody></table></div>
      <p class="note">반응시간·각도는 카메라와 조명에 따라 달라질 수 있어 같은 환경에서 비교하세요. 시연 모드 기록은 '(시연)'으로 표시돼요.</p>
      <p class="note">이 점수는 활동 참여와 변화를 보기 위한 참고 자료예요. 치매 선별·진단 검사를 대신하지 않아요. 내려받는 CSV에도 이름은 가려서(김O호) 생년월과 함께 저장돼요.</p></div>`;
  $('#rcWho').onchange = e => renderRecords(e.target.value);
  App.bindAdminNav();
  $$('#rcGame button').forEach(b => b.onclick = () => { App.recGame = b.dataset.v; renderRecords(name); });
  $('#rcCsv').onclick = () => downloadCSV([name]);
  $('#rcCsvAll').onclick = () => downloadCSV(names);
  // 차트: 회차별(오래된→최근) 평균
  const ser = p.sessions.map(s => { const gs = s.games.filter(g => gsel === 'all' || g.game === gsel); const acc = gs.filter(g => g.accuracy != null).map(g => g.accuracy), rt = gs.filter(g => g.meanRT != null).map(g => g.meanRT); return gs.length ? { acc: acc.length ? acc.reduce((a, b) => a + b) / acc.length : null, rt: rt.length ? rt.reduce((a, b) => a + b) / rt.length : null, d: new Date(s.ts) } : null; }).filter(Boolean).slice(-20);
  drawTrend($('#rcChart'), ser);
}
function drawTrend(cv, ser) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); const W = r.width, H = r.height, L = 56, R = 56, T = 16, B = 40;
  g.clearRect(0, 0, W, H); g.font = `500 15px ${SANS}`;
  if (ser.length < 1) { g.fillStyle = PAL.ivory2; g.textAlign = 'center'; g.fillText('기록이 쌓이면 그래프가 그려져요', W / 2, H / 2); return; }
  const maxRT = Math.max(3, ...ser.map(s => s.rt || 0)) * 1.1;
  const X = i => L + (ser.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (ser.length - 1)), Ya = v => T + (1 - v) * (H - T - B), Yr = v => T + (1 - v / maxRT) * (H - T - B);
  g.strokeStyle = 'rgba(156,151,184,0.18)'; g.lineWidth = 1; g.fillStyle = PAL.mute;
  for (let k = 0; k <= 4; k++) { const y = T + k * (H - T - B) / 4; g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke(); g.textAlign = 'right'; g.fillText(`${100 - k * 25}%`, L - 8, y + 5); g.textAlign = 'left'; g.fillText(`${fmt1(maxRT * (1 - k / 4))}초`, W - R + 8, y + 5); }
  g.textAlign = 'center'; ser.forEach((s, i) => { if (ser.length <= 10 || i % Math.ceil(ser.length / 10) === 0) g.fillText(`${s.d.getMonth() + 1}/${s.d.getDate()}`, X(i), H - 12); });
  const line = (key, Y, col) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); let started = false; ser.forEach((s, i) => { if (s[key] == null) return; started ? g.lineTo(X(i), Y(s[key])) : g.moveTo(X(i), Y(s[key])); started = true; }); g.stroke(); ser.forEach((s, i) => { if (s[key] == null) return; g.beginPath(); g.arc(X(i), Y(s[key]), i === ser.length - 1 ? 7 : 4, 0, 7); g.fillStyle = col; g.fill(); }); };
  line('acc', Ya, PAL.gold2); line('rt', Yr, '#9FD8F2');
}
function downloadCSV(names) {
  const head = ['이름(가림)', '생년월', '날짜', '타임스탬프', '모드', '함께한 사람', '자세', '조작', '장소', '시작단계', '다음단계', '정확도', '평균반응시간(초)', '시도', '정답', '오반응', '무반응', '최대기억길이', '최대콤보', '별', '점수', '수확과일', '완성별자리', '동작일치율', '세션활동시간(초)', '세션동작량', '만세횟수', '스쿼트무릎횟수', '최대팔올림각도'];
  const q = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [head.join(',')];
  for (const n of names) { const p = Store.profile(n); for (const s of p.sessions) for (const g of s.games) lines.push([who(n), birthTxt(p.birth), s.date, s.ts, s.mode, s.partner ? who(s.partner) : '', s.posture, s.input, GAMES[g.game].name, g.level, g.newLevel, g.accuracy != null ? (g.accuracy * 100).toFixed(1) : '', g.meanRT != null ? g.meanRT.toFixed(3) : '', g.trials, g.correct, g.commission, g.omission, g.maxSpan ?? '', g.maxCombo, g.stars, g.score, g.fruits || 0, (g.constellations || []).length, g.sync != null ? (g.sync * 100).toFixed(0) : '', s.activeSec, s.motion, s.raises, s.squats, s.maxArm].map(q).join(',')); }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `브레인무브_기록_${todayKey()}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast('CSV 파일을 내려받았어요');
}

/* ================= 관리자: 참여자 관리 ================= */
function renderUsers(msg) {
  const W = $('#adminWrap'), names = Store.names(), st = Store.settings;
  const day = ts => ts ? new Date(ts).toLocaleDateString('ko-KR') : '–';
  W.innerHTML = `${App.adminNav('users')}
    <div class="panel"><h3>참여자 등록</h3>
      <div class="grid3" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));align-items:end">
        <label class="field">이름<input type="text" id="uName" maxlength="20" placeholder="예: 김순자" autocomplete="off"></label>
        <div class="field">생년월${birthSelect('uB')}</div>
        <label class="field">메모(반·특이사항)<input type="text" id="uMemo" maxlength="40" placeholder="예: 화요일반, 무릎 불편" autocomplete="off"></label>
        <label class="field">기본 자세<select id="uPost"><option value="stand">서서</option><option value="seat">앉아서</option></select></label>
        <button class="gold" id="uAdd">등록</button>
      </div>
      <p id="uMsg" class="${msg && msg.err ? 'err' : 'okmsg'}">${esc(msg?.text || '')}</p>
      <p class="note">이름과 생년월로 한 사람을 구분해요(동명이인도 생년월이 다르면 따로 등록돼요). 게임 화면·결과·기록에는 이름이 김O호처럼 가려서 보여요. 준비 화면의 <b>＋ 새 참여자 등록</b>에서도 바로 등록할 수 있어요.</p>
    </div>
    <div class="panel"><div class="row between"><h3>등록된 참여자 ${names.length}명</h3>
      <label class="field" style="flex-direction:row;align-items:center;gap:10px;font-weight:500">준비 화면에서 등록
        <select id="uSelf" style="max-width:220px"><option value="true" ${st.selfRegister ? 'selected' : ''}>바로 등록</option><option value="false" ${st.selfRegister ? '' : 'selected'}>PIN 확인 후 등록</option></select></label></div>
      ${names.length ? `<div class="tablebox"><table><thead><tr><th>이름</th><th>생년월</th><th>메모</th><th>기본 자세</th><th>등록일</th><th>참여</th><th>최근 참여</th><th></th></tr></thead><tbody>
      ${names.map(n => { const p = Store.data.profiles[n]; return `<tr data-n="${esc(n)}"><td><b>${esc(who(n))}</b></td><td>${p.birth ? esc(birthTxt(p.birth)) : '<span class="err">미등록</span>'}</td><td>${esc(p.memo || '')}</td><td>${p.defaultPosture === 'seat' ? '앉아서' : '서서'}</td><td>${day(p.registered || p.created)}</td><td>${p.sessions.length}회</td><td>${day(p.sessions.at(-1)?.ts)}</td>
        <td><div class="row" style="gap:8px;flex-wrap:nowrap"><button class="small" data-act="edit">고치기</button><button class="small" data-act="del">지우기</button></div></td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="muted">아직 없어요. 위에서 첫 참여자를 등록해 주세요.</p>'}
    </div>`;
  const add = () => { const birth = readBirth(W, 'uB'); if (!birth) { $('#uMsg').className = 'err'; $('#uMsg').textContent = '생년월(태어난 해와 달)을 골라 주세요'; return; }
    const r = Store.register($('#uName').value, { birth, memo: $('#uMemo').value, posture: $('#uPost').value, needBirth: true }); renderUsers(r.ok ? { text: `${whoFull(r.name)} 님을 등록했어요` } : { text: r.msg, err: true }); App.bindAdminNav(); if (r.ok) $('#uName').focus(); };
  $('#uAdd').onclick = add; $('#uName').onkeydown = e => { if (e.key === 'Enter') add(); };
  $('#uSelf').onchange = e => { st.selfRegister = e.target.value === 'true'; Store.save(); toast('저장했어요', 1000); };
  $$('#adminWrap tr[data-n]').forEach(tr => {
    const n = tr.dataset.n, p = Store.data.profiles[n];
    tr.querySelector('[data-act="edit"]').onclick = () => {
      tr.innerHTML = `<td><input type="text" class="eName" value="${esc(Store.realName(n))}" maxlength="20" aria-label="이름(실명)"></td><td>${birthSelect('eB', p.birth)}</td><td><input type="text" class="eMemo" value="${esc(p.memo || '')}" maxlength="40"></td><td><select class="ePost"><option value="stand">서서</option><option value="seat" ${p.defaultPosture === 'seat' ? 'selected' : ''}>앉아서</option></select></td><td colspan="3"></td>
        <td><div class="row" style="gap:8px;flex-wrap:nowrap"><button class="small gold" data-act="save">저장</button><button class="small" data-act="cancel">취소</button></div></td>`;
      tr.querySelector('[data-act="cancel"]').onclick = () => { renderUsers(); App.bindAdminNav(); };
      tr.querySelector('[data-act="save"]').onclick = () => {
        const nn = tr.querySelector('.eName').value, birth = readBirth(tr, 'eB');
        if (birth === 'bad') { renderUsers({ text: '생년월은 해와 달을 모두 골라 주세요', err: true }); App.bindAdminNav(); return; }
        const r = Store.rename(n, nn, birth);
        if (!r.ok) { renderUsers({ text: r.msg, err: true }); App.bindAdminNav(); return; }
        const q = Store.data.profiles[r.name]; q.memo = normName(tr.querySelector('.eMemo').value); q.defaultPosture = tr.querySelector('.ePost').value; Store.save();
        renderUsers({ text: `${whoFull(r.name)} 님 정보를 고쳤어요` }); App.bindAdminNav();
      };
    };
    tr.querySelector('[data-act="del"]').onclick = () => {
      tr.innerHTML = `<td colspan="7"><span class="err">${esc(whoFull(n))} 님과 기록·정원을 모두 지울까요? 되돌릴 수 없어요.</span></td><td><div class="row" style="gap:8px;flex-wrap:nowrap"><button class="small danger" data-act="yes">지우기</button><button class="small" data-act="no">취소</button></div></td>`;
      tr.querySelector('[data-act="no"]').onclick = () => { renderUsers(); App.bindAdminNav(); };
      tr.querySelector('[data-act="yes"]').onclick = () => { Store.remove(n); renderUsers({ text: `${whoFull(n)} 님을 지웠어요` }); App.bindAdminNav(); };
    };
  });
}

/* ================= 관리자: 백업·보안 ================= */
function renderBackup(msg) {
  const W = $('#adminWrap');
  W.innerHTML = `${App.adminNav('backup')}
    <div class="grid2">
      <div class="panel"><h3>백업 파일</h3><p class="muted">참여자 명단·기록·정원·설정을 파일 하나로 저장해요. 다른 컴퓨터로 옮기거나 브라우저 기록을 지우기 전에 받아 두세요.</p>
        <div class="row"><button class="gold" id="bkSave">백업 파일 저장</button><label class="btn" style="display:inline-flex;align-items:center;cursor:pointer;font-weight:700;font-size:21px;border-radius:999px;padding:12px 26px;box-shadow:inset 0 0 0 1.5px rgba(207,200,218,.35)">백업 불러오기<input type="file" id="bkLoad" accept=".json,application/json" hidden></label></div>
        <div id="bkConfirm"></div></div>
      <div class="panel"><h3>관리자 PIN 바꾸기</h3>
        <div class="pinbox" style="align-items:flex-start"><input type="password" inputmode="numeric" id="pOld" placeholder="지금 PIN" maxlength="8"><input type="password" inputmode="numeric" id="pNew" placeholder="새 PIN (숫자 4~8자리)" maxlength="8"><button id="pChg">PIN 바꾸기</button></div></div>
      <div class="panel"><h3>기록 지우기</h3><p class="muted">참여자 명단은 그대로 두고 모든 게임 기록·정원·칭호를 지워요.</p><div class="row"><button class="danger" id="clr">모든 기록 지우기</button></div><div id="clrConfirm"></div></div>
    </div>
    <p id="bkMsg" class="${msg && msg.err ? 'err' : 'okmsg'}">${esc(msg?.text || '')}</p>`;
  $('#bkSave').onclick = () => {
    const blob = new Blob([JSON.stringify({ app: 'brainmove', version: 2, saved: new Date().toISOString(), data: { profiles: Store.data.profiles, settings: Store.data.settings } }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `브레인무브_백업_${todayKey()}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('백업 파일을 저장했어요');
  };
  $('#bkLoad').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; let j;
    try { j = JSON.parse(await f.text()); } catch (err) { renderBackup({ text: '백업 파일을 읽지 못했어요', err: true }); App.bindAdminNav(); return; }
    if (j?.app !== 'brainmove' || !j.data?.profiles) { renderBackup({ text: '브레인무브 백업 파일이 아니에요', err: true }); App.bindAdminNav(); return; }
    const n = Object.keys(j.data.profiles).length;
    $('#bkConfirm').innerHTML = `<p class="err" style="margin-top:10px">지금 있는 명단·기록을 지우고 백업(${n}명, ${esc((j.saved || '').slice(0, 10))})으로 바꿀까요?</p><div class="row"><button class="small danger" id="bkYes">바꾸기</button><button class="small" id="bkNo">취소</button></div>`;
    $('#bkNo').onclick = () => { $('#bkConfirm').innerHTML = ''; };
    $('#bkYes').onclick = () => { Store.data.profiles = j.data.profiles; Store.data.settings = Object.assign({}, DEFAULT_SETTINGS, j.data.settings || {}); Store.save(); renderBackup({ text: `백업을 불러왔어요 (${n}명)` }); App.bindAdminNav(); };
  };
  $('#pChg').onclick = async () => {
    const r = await Admin.check($('#pOld').value); if (!r.ok) { renderBackup({ text: r.msg, err: true }); App.bindAdminNav(); return; }
    if (!/^\d{4,8}$/.test($('#pNew').value)) { renderBackup({ text: '새 PIN은 숫자 4~8자리예요', err: true }); App.bindAdminNav(); return; }
    const code = await Admin.setPin($('#pNew').value); App.showRecovery(code);
  };
  $('#clr').onclick = () => {
    $('#clrConfirm').innerHTML = `<p class="err" style="margin-top:10px">정말 모든 기록을 지울까요? 되돌릴 수 없어요. 먼저 백업 파일을 저장해 두길 권해요.</p><div class="row"><button class="small danger" id="clrYes">지우기</button><button class="small" id="clrNo">취소</button></div>`;
    $('#clrNo').onclick = () => { $('#clrConfirm').innerHTML = ''; };
    $('#clrYes').onclick = () => { Store.clearRecords(); renderBackup({ text: '모든 기록을 지웠어요' }); App.bindAdminNav(); };
  };
}

/* ================= 진행자 설정 ================= */
function renderSettings() {
  const s = Store.settings, W = $('#settingsWrap');
  const seg = (id, label, opts, val, note = '') => `<div class="panel"><h3>${label}</h3><div class="opts" id="${id}" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">${opts.map(([v, l]) => `<button class="opt" style="align-items:center;text-align:center;font-size:20px;padding:12px" data-v="${v}" aria-pressed="${String(v) === String(val)}">${l}</button>`).join('')}</div>${note ? `<p class="note">${note}</p>` : ''}</div>`;
  W.innerHTML = `${App.adminNav('settings')}
    <div class="grid2">
      ${seg('stRound', '한 판 길이', [[60, '1분'], [120, '2분'], [180, '3분']], s.roundSec, '마지막 30초(짧은 판은 1/4)는 보스 라운드예요.')}
      ${seg('stEase', '댄스 따라 하기 시간', [[1, '보통'], [1.5, '넉넉하게'], [2, '아주 넉넉하게']], s.danceEase ?? 1.5, '흥부자 댄스 무대에서 시범이 끝난 뒤 준비 시간과 동작마다 기다려 주는 시간이에요.')}
      ${seg('stCourse', '코스 게임 수', [[2, '2판'], [3, '3판'], [4, '4판']], s.courseGames, '체조와 스트레칭을 더하면 1인 약 15분, 2인 약 20분이에요.')}
      ${seg('stLevel', '난이도', [[0, '자동']].concat([1, 3, 5, 7, 9].map(v => [v, v + '단계 고정'])), s.fixedLevel, '자동은 판마다 정확도 80% 이상이면 올리고 50% 미만이면 내려요.')}
      ${seg('stFx', '효과 강도', [['low', '약'], ['mid', '중'], ['high', '강']], s.fx, '어지럼에 민감하면 약: 화면 흔들림이 꺼지고 파티클이 줄어요.')}
      ${seg('stVoice', '음성 안내', [['true', '켜기'], ['false', '끄기']], s.voice)}
      ${seg('stRate', '말하기 속도', [[0.8, '느리게'], [0.95, '보통'], [1.1, '빠르게']], s.voiceRate)}
      ${seg('stShapes', '색각 배려(풍선에 모양 표시)', [['true', '켜기'], ['false', '끄기']], s.shapes)}
      ${seg('stSkel', '몸 위 빛 뼈대', [['true', '보이기'], ['false', '숨기기']], s.skeleton)}
      ${seg('stWarm', '아침 체조 길이', [[50, '짧게'], [90, '보통'], [120, '길게']], s.warmupSec)}
      ${seg('stUnlock', '마을 장소 열기', [['false', '정원이 자라면 하나씩'], ['true', '처음부터 모두']], s.unlockAll, '처음에는 두 곳만 열리고, 씨앗을 심어 정원이 자라면 새 장소가 열려요.')}
      ${seg('stModel', '인식 정확도', [['lite', '가벼움(권장)'], ['full', '정밀']], s.model, '정밀은 느린 컴퓨터에서 끊길 수 있어요. 바꾸면 다음 시작부터 적용돼요.')}
      <div class="panel"><h3>소리 크기</h3>
        <label class="field">효과음 <input type="range" id="stSfx" min="0" max="1" step="0.1" value="${s.volSfx}"></label>
        <label class="field">배경 음악 <input type="range" id="stMus" min="0" max="1" step="0.1" value="${s.volMusic}"></label>
        <label class="field">음성 <input type="range" id="stVoi" min="0" max="1" step="0.1" value="${s.volVoice}"></label>
        <div class="row"><button class="small gold" id="stMusTest">배경 음악 들어 보기</button><span class="note" id="stMusMsg"></span></div></div>
      <div class="panel"><h3>기관 이름</h3><label class="field">처음 화면과 결과 화면에 보여요<input type="text" id="stOrg" maxlength="30" value="${esc(s.orgName || '')}" placeholder="예: ○○구 치매안심센터" autocomplete="off"></label></div>
      <div class="panel"><h3>카메라 선택</h3><select id="stCam" aria-label="카메라"><option value="">기본 카메라</option></select><p class="note">카메라 이름은 한 번 카메라를 허용한 뒤에 보여요.</p></div>
    </div>
    <div class="panel"><div class="row between"><h3>성우 목소리 다듬기</h3><span class="note" id="tuneVoices"></span></div>
      <p class="note">캐릭터마다 쓸 음성과 높낮이·빠르기를 들어 보며 맞추세요. 소리가 깨지거나 떨리지 않도록 높낮이는 크롬 음성 0.85~1.1배, 윈도우 해미 0.75~1.3배 안에서만 적용돼요. 말 가락(끊어 읽기·늘이기)과 시그니처 효과음은 캐릭터마다 따로 붙어요. <b>Gemini로 녹음한 성우 음성이 있으면 녹음본이 먼저 나오고</b>, 녹음이 없는 문장(사람 이름 등)만 이 설정의 컴퓨터 음성으로 읽어요.</p>
      <div class="tablebox"><table><thead><tr><th>성우</th><th>성우 녹음</th><th>음성</th><th>높낮이</th><th>빠르기</th><th></th></tr></thead><tbody>
      ${Object.entries(PERSONAS).map(([id, P]) => { const T = Narr.tuned(id); const C = (window.VOICE_CLIPS || {})[id] || [], tot = (window.VOICE_TOTAL || {})[id] || 0; return `<tr data-id="${id}"><td><b>${P.name}</b></td><td>${C.length}/${tot}${Narr.ready(id) ? ' ✓' : ' <span class="note">(녹음 중)</span>'}</td>
        <td><select class="tEng" style="min-width:150px"><option value="google" ${T.engine === 'google' ? 'selected' : ''}>크롬 음성</option><option value="ms" ${T.engine === 'ms' ? 'selected' : ''}>윈도우 해미</option></select></td>
        <td><input type="range" class="tPitch" min="0.75" max="1.3" step="0.01" value="${T.pitch}" style="width:140px"> <span class="tPv">${T.pitch.toFixed(2)}</span></td>
        <td><input type="range" class="tRate" min="0.7" max="1.4" step="0.02" value="${T.rate}" style="width:140px"> <span class="tRv">${T.rate.toFixed(2)}</span></td>
        <td><div class="row" style="gap:8px;flex-wrap:nowrap"><button class="small gold" data-act="play">들어 보기</button><button class="small" data-act="reset">처음 값</button></div></td></tr>`; }).join('')}
      </tbody></table></div>
    </div>
    `;
  const tune = s.voiceTune ||= {};
  const av = Voice.available(); $('#tuneVoices').textContent = '이 컴퓨터의 한국어 음성: ' + ([av.google && '크롬 음성', av.ms && '윈도우 해미'].filter(Boolean).join(', ') || '찾지 못함(크롬을 새로 열어 보세요)');
  $$('#settingsWrap tr[data-id]').forEach(tr => {
    const id = tr.dataset.id, save = () => { tune[id] = { engine: tr.querySelector('.tEng').value, pitch: +tr.querySelector('.tPitch').value, rate: +tr.querySelector('.tRate').value }; Store.save(); };
    tr.querySelector('.tEng').onchange = () => { save(); Narr.sample(id); };
    tr.querySelector('.tPitch').oninput = e => { tr.querySelector('.tPv').textContent = (+e.target.value).toFixed(2); save(); };
    tr.querySelector('.tRate').oninput = e => { tr.querySelector('.tRv').textContent = (+e.target.value).toFixed(2); save(); };
    tr.querySelector('.tPitch').onchange = () => Narr.sample(id); tr.querySelector('.tRate').onchange = () => Narr.sample(id);
    tr.querySelector('[data-act="play"]').onclick = () => { Sound.init(); Narr.sample(id); };
    tr.querySelector('[data-act="reset"]').onclick = () => { delete tune[id]; Store.save(); renderSettings(); Narr.sample(id); };
  });
  const bindSeg = (id, key, conv) => $$('#' + id + ' button').forEach(b => b.onclick = () => { $$('#' + id + ' button').forEach(x => x.setAttribute('aria-pressed', x === b)); s[key] = conv(b.dataset.v); Store.save(); Sound.applyVolumes(); toast('저장했어요', 1000); });
  const num = v => +v, bool = v => v === 'true', str = v => v;
  bindSeg('stRound', 'roundSec', num); bindSeg('stEase', 'danceEase', num); bindSeg('stCourse', 'courseGames', num); bindSeg('stLevel', 'fixedLevel', num); bindSeg('stFx', 'fx', str); bindSeg('stVoice', 'voice', bool); bindSeg('stRate', 'voiceRate', num); bindSeg('stShapes', 'shapes', bool); bindSeg('stSkel', 'skeleton', bool); bindSeg('stWarm', 'warmupSec', num); bindSeg('stModel', 'model', str); bindSeg('stUnlock', 'unlockAll', bool);
  [['stSfx', 'volSfx'], ['stMus', 'volMusic'], ['stVoi', 'volVoice']].forEach(([id, k]) => $('#' + id).oninput = e => { s[k] = +e.target.value; Store.save(); Sound.applyVolumes(); });
  navigator.mediaDevices?.enumerateDevices?.().then(ds => { const sel = $('#stCam'); ds.filter(d => d.kind === 'videoinput').forEach((d, k) => { const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || `카메라 ${k + 1}`; if (d.deviceId === s.cameraId) o.selected = true; sel.appendChild(o); }); }).catch(() => { });
  $('#stCam').onchange = e => { s.cameraId = e.target.value; Store.save(); };
  $('#stOrg').onchange = e => { s.orgName = normName(e.target.value); Store.save(); App.renderOrg(); toast('저장했어요', 1000); };
  // 배경 음악 확인: 6초 동안 테마곡을 틀어 봄
  $('#stMusTest').onclick = () => {
    Sound.init(); Sound.track('title'); Sound.startMusic(100); const m = $('#stMusMsg'); m.textContent = '재생 중…';
    setTimeout(() => { const el = Sound.el; m.textContent = el && !el.paused ? '음악이 나오고 있어요 ✓' : (Sound.bad.title ? '음악 파일을 찾지 못해 합성 음악으로 틀어요' : '재생이 막혔어요. 화면을 한 번 누른 뒤 다시 눌러 주세요'); }, 1200);
    setTimeout(() => { if (App.stage == null && !$('#scr-settings').hidden) Sound.stopMusic(); }, 6000);
  };
  App.bindAdminNav();
}

window.addEventListener('DOMContentLoaded', () => App.init());

/* ================= 생년월 고르기(등록 화면 공용) ================= */
function birthSelect(cls, val) {
  const [y, m] = String(val || '').split('-'), ny = new Date().getFullYear(), ys = [];
  for (let k = ny - 40; k >= 1920; k--) ys.push(k);
  return `<span class="birth"><select class="${cls}Y" aria-label="태어난 해"><option value="">연도</option>${ys.map(k => `<option value="${k}" ${+y === k ? 'selected' : ''}>${k}년</option>`).join('')}</select><select class="${cls}M" aria-label="태어난 달"><option value="">달</option>${Array.from({ length: 12 }, (_, k) => `<option value="${String(k + 1).padStart(2, '0')}" ${+m === k + 1 ? 'selected' : ''}>${k + 1}월</option>`).join('')}</select></span>`;
}
// '1948-03' / 아무것도 안 고르면 '' / 하나만 고르면 'bad'
function readBirth(root, cls) { const y = root.querySelector('.' + cls + 'Y')?.value, m = root.querySelector('.' + cls + 'M')?.value; return y && m ? y + '-' + m : (y || m ? 'bad' : ''); }
