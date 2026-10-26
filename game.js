/**
 * QQ 宠物 · v3.0 完整版
 * 保留 v2.0 全部功能（4 宠物、衰减、随机事件、永久道具、广告金币、属性面板、医院、商店、签到、离线结算）
 * 新增：8 宠物解锁、成长阶段、成就系统、死亡轮回、装饰系统、完善离线、模拟充值、设置
 */
(function () {
  'use strict';

  /* ================= 配置 ================= */
  const SAVE_KEY = 'qqpet_mvp_save'; // 沿用旧存档 key，兼容 v1/v2 存档

  const STAT_META = [
    { key: 'health', label: '健康', icon: '❤️', color: 'linear-gradient(90deg,#ff6b6b,#ff9f43)' },
    { key: 'fullness', label: '饱腹', icon: '🍚', color: 'linear-gradient(90deg,#ffb703,#ffd166)' },
    { key: 'happiness', label: '快乐', icon: '😄', color: 'linear-gradient(90deg,#ff8fab,#ffb3c6)' },
    { key: 'cleanliness', label: '清洁', icon: '🫧', color: 'linear-gradient(90deg,#7dd3fc,#a5f3fc)' }
  ];

  const DECAY = { fullness: 0.5, happiness: 0.3, cleanliness: 0.2, health: 0.1 }; // 每分钟基础衰减
  const REST = { health: 5, happiness: -2 };
  const DIRTY_LIMIT = 30;
  const SAD_LIMIT = 20;
  const SICK_LIMIT = 20;
  const HOUR_MS = 3600000;
  const DAY_MS = 86400000;
  const MAX_SETTLE_MS = DAY_MS;            // 离线最多结算 24 小时
  const HIBERNATE_MS = DAY_MS;             // 离线超过 24 小时进入休眠
  const FORCED_CRITICAL_MS = 7 * DAY_MS;   // 离线超过 7 天健康强制降到 10
  const DEATH_CONFIRM_MS = DAY_MS;         // 健康为 0 持续 24 小时确认死亡
  const AD_MAX = 5;
  const AD_REWARD = 30;
  const AUTO_FEED_MAX = 3;
  const HOSPITAL_NORMAL = 50;
  const HOSPITAL_EMERGENCY = 100;
  const REVIVE_COST = 200;                 // 复活费用
  const BASE_COINS = 50;                   // 初始金币基数
  const MAKEUP_COST = 20;                  // 补打卡费用（金币 / 缺签一天）

  const ACTIONS = {
    feed: { emoji: '🍖', label: '喂食', cost: 5 },
    clean: { emoji: '🛁', label: '清洁', cost: 10 },
    play: { emoji: '🎾', label: '玩耍', cost: 10 },
    rest: { emoji: '💤', label: '休息', cost: 0 }
  };

  const RECHARGE_TIERS = [
    { id: 't1', emoji: '💎', price: '1 元', coins: 100 },
    { id: 't6', emoji: '💎💎', price: '6 元', coins: 680 },
    { id: 't30', emoji: '💎💎💎', price: '30 元', coins: 3600 }
  ];

  const PET_TALK = [
    '今天也要加油哦！', '摸摸头，我超开心！', '肚子有点饿了…', '要不要陪我玩会儿？',
    '我在这里陪着你呀', '看起来精神不错呢', '主人最棒啦！', '记得喂我吃饭哦～'
  ];

  /* ================= 全局状态 ================= */
  const defaultState = () => ({
    adopted: false,
    petName: '',
    petId: 'cat',
    stats: { health: 80, fullness: 80, happiness: 80, cleanliness: 80 },
    coins: 50,
    resting: false,
    sick: false,
    criticalShown: false,
    hospitalPrompted: false,
    pendingCritical: false,
    sign: { streak: 0, last: '' },
    ownedItems: [],               // 永久道具
    decorations: [],              // 已购装饰
    worn: { hat: '', scarf: '', glasses: '', background: '' }, // 当前穿戴
    ad: { date: '', count: 0 },
    autoFeed: { date: '', count: 0 },
    eventDate: '',
    deaths: 0,                   // 历史死亡次数
    dead: false,                 // 当前是否已死亡
    zeroSince: 0,                // 健康归零起始时间（用于确认死亡）
    onlineMs: 0,                 // 累计在线时长（决定年龄）
    firstAdoptAt: 0,             // 首次领养时间（用于存活天数）
    totalCoinsEarned: 0,         // 累计获得金币
    purchaseCount: 0,            // 累计购买次数
    ownedPets: [],               // 历史领养过的宠物 id
    achievements: [],            // 已解锁成就 id
    soundOn: true,
    lastSave: Date.now(),
    lastHourlyAt: Date.now(),
    adoptAt: 0
  });

  let state = defaultState();
  let selectedPetId = 'cat';
  let audioCtx = null;
  let tickCount = 0;
  let adTimer = null;
  let adRunning = false;
  let shopTab = 'consumable';
  let clearArmed = false;
  const modalQueue = [];

  window.gameState = state;

  /* ================= DOM ================= */
  const $ = (id) => document.getElementById(id);
  const el = {
    adoptScreen: $('adoptScreen'), mainScreen: $('mainScreen'),
    adoptSub: $('adoptSub'), petPicker: $('petPicker'), nameInput: $('nameInput'),
    adoptBtn: $('adoptBtn'), adoptTip: $('adoptTip'),
    statBars: $('statBars'), coinNum: $('coinNum'), rechargeBtn: $('rechargeBtn'),
    stage: $('stage'), petWrap: $('petWrap'), pet: $('pet'), petEmoji: $('petEmoji'),
    sickBadge: $('sickBadge'), petBg: $('petBg'),
    accHat: $('accHat'), accGlasses: $('accGlasses'), accScarf: $('accScarf'),
    bubble: $('bubble'), petName: $('petName'), petMood: $('petMood'), stageBadge: $('stageBadge'),
    actions: $('actions'), stateText: $('stateText'), incomeText: $('incomeText'),
    adTabText: $('adTabText'),
    mask: $('mask'), modal: $('modal'), modalTitle: $('modalTitle'),
    modalBody: $('modalBody'), modalClose: $('modalClose'),
    toast: $('toast')
  };

  /* ================= 工具 ================= */
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const todayKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); };
  const clampNum = (v) => Math.min(100000000, Math.max(0, Math.round(v)));

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  // 简易音效（WebAudio，可开关）
  function beep(freq, dur) {
    if (!state.soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) { /* 静默失败 */ }
  }

  /* ================= 存档 ================= */
  function saveState() {
    state.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 忽略写入失败 */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const base = defaultState();
      state = Object.assign(base, saved);
      state.stats = Object.assign(base.stats, saved.stats || {});
      state.sign = Object.assign(base.sign, saved.sign || {});
      state.ad = Object.assign(base.ad, saved.ad || {});
      state.autoFeed = Object.assign(base.autoFeed, saved.autoFeed || {});
      state.worn = Object.assign(base.worn, saved.worn || {});
      if (!Array.isArray(state.ownedItems)) state.ownedItems = [];
      if (!Array.isArray(state.decorations)) state.decorations = [];
      if (!Array.isArray(state.ownedPets)) state.ownedPets = [];
      if (!Array.isArray(state.achievements)) state.achievements = [];
      window.gameState = state; // 读档后重新挂载全局状态
      return !!state.adopted;
    } catch (e) {
      return false;
    }
  }

  /* ================= 属性与成长 ================= */
  function owns(propId) { return state.ownedItems.indexOf(propId) > -1; }

  function currentStage() { return window.Growth.current(state); }

  function stageCap() { return currentStage().cap; }

  // 实际衰减 = 基础衰减 × 宠物系数 × 成长阶段系数，再叠加永久道具修正
  function decayRates() {
    const factor = window.PetConfig.get(state.petId).factors;
    const stage = currentStage();
    const r = {
      fullness: DECAY.fullness * factor.fullness,
      happiness: DECAY.happiness * factor.happiness,
      health: DECAY.health * factor.health,
      cleanliness: DECAY.cleanliness * factor.cleanliness
    };
    r.fullness *= stage.decayMul;    // 幼年衰减快 10%
    r.happiness *= stage.decayMul;
    r.cleanliness *= stage.decayMul;
    r.health *= stage.decayMul * stage.healthMul; // 老年健康衰减快 30%
    if (owns('warmNest')) r.health *= 0.75;
    if (owns('purifier')) r.cleanliness *= 0.8;
    return r;
  }

  function averageStats() {
    const s = state.stats;
    return (s.health + s.fullness + s.happiness + s.cleanliness) / 4;
  }

  function clampStats() {
    const cap = stageCap(); // 属性上限随成长阶段变化
    const s = state.stats;
    s.health = Math.min(cap, Math.max(0, s.health));
    s.fullness = Math.min(cap, Math.max(0, s.fullness));
    s.happiness = Math.min(cap, Math.max(0, s.happiness));
    s.cleanliness = Math.min(cap, Math.max(0, s.cleanliness));
  }

  function applyDecay(minutes) {
    const s = state.stats;
    const r = decayRates();
    s.fullness -= r.fullness * minutes;
    s.happiness -= r.happiness * minutes;
    s.cleanliness -= r.cleanliness * minutes;
    s.health -= r.health * minutes;
    if (state.resting) {
      s.health += REST.health * minutes;
      s.happiness += REST.happiness * minutes;
    }
    if (s.fullness <= 0) s.health -= 0.5 * minutes;        // 饱腹归零惩罚
    if (s.cleanliness < DIRTY_LIMIT) {                    // 脏污惩罚
      s.health -= 0.2 * minutes;
      s.happiness -= 0.3 * minutes;
    }
    if (s.happiness < SAD_LIMIT) s.health -= 0.3 * minutes; // 难过惩罚
    clampStats();
  }

  // 每小时金币结算（老年阶段金币奖励 +20%）
  function settleHourlyReward() {
    const avg = averageStats();
    let delta = 0;
    if (avg >= 70) delta = 8;
    else if (avg >= 50) delta = 3;
    else if (avg < 30) delta = -2;
    delta = Math.round(delta * (1 + currentStage().coinBonus));
    addCoins(delta, delta > 0);
    return delta;
  }

  function addCoins(amount, earned) {
    state.coins = clampNum(state.coins + amount);
    if (earned && amount > 0) state.totalCoinsEarned += amount; // 计入成就统计
  }

  function refreshSickState() {
    state.sick = state.stats.health <= SICK_LIMIT;
    if (!state.sick) { state.criticalShown = false; state.hospitalPrompted = false; }
    return state.sick;
  }

  function aliveDays() {
    return state.firstAdoptAt ? Math.floor((Date.now() - state.firstAdoptAt) / DAY_MS) : 0;
  }

  /* ================= 渲染 ================= */
  function buildBars() {
    el.statBars.innerHTML = STAT_META.map((m) =>
      '<div class="bar" data-key="' + m.key + '">' +
        '<span class="bar-icon">' + m.icon + '</span>' +
        '<div class="bar-track"><i class="bar-fill" style="background:' + m.color + '"></i></div>' +
        '<span class="bar-val">0</span>' +
      '</div>'
    ).join('');
  }

  function renderStats() {
    STAT_META.forEach((m) => {
      const row = el.statBars.querySelector('[data-key="' + m.key + '"]');
      if (!row) return;
      row.querySelector('.bar-fill').style.width = state.stats[m.key] + '%';
      row.querySelector('.bar-val').textContent = Math.round(state.stats[m.key]);
    });
  }

  function renderCoins() { el.coinNum.textContent = state.coins; }

  function moodText() {
    const s = state.stats;
    if (state.dead) return '🕯️ 已经离开了…';
    if (s.health <= SICK_LIMIT) return '🤒 生病了，快照顾它';
    if (state.resting) return '😴 正在休息中';
    if (s.happiness >= 80 && s.health >= 70) return '😄 超级开心';
    if (s.happiness >= 50) return '🙂 心情不错';
    if (s.happiness >= 30) return '😐 有点无聊';
    return '🥺 需要陪伴';
  }

  function renderPet() {
    const cfg = window.PetConfig.get(state.petId);
    const stage = currentStage();
    el.petEmoji.textContent = cfg.emoji;
    el.petName.textContent = state.petName;
    el.petMood.textContent = moodText();
    el.pet.classList.toggle('sick', state.sick);
    el.sickBadge.hidden = !state.sick;
    // 成长阶段影响体型与样式
    el.petWrap.style.setProperty('--pet-scale', stage.scale);
    el.petWrap.style.filter = stage.filter;
    // 装饰锚点按宠物种类下发（百分比，基于宠物表情框高度），保证落点准确
    const anchors = cfg.anchors || {};
    el.pet.style.setProperty('--a-hat', (anchors.hat != null ? anchors.hat : 1) + '%');
    el.pet.style.setProperty('--a-glasses', (anchors.glasses != null ? anchors.glasses : 38) + '%');
    el.pet.style.setProperty('--a-scarf', (anchors.scarf != null ? anchors.scarf : 68) + '%');
    el.pet.style.setProperty('--acc-scale', cfg.accScale != null ? cfg.accScale : 1);
    const age = window.Growth.ageDays(state);
    el.stageBadge.textContent = stage.emoji + ' ' + stage.name + ' · ' + age + ' 天';
    renderAccessories();
  }

  // 实时渲染穿戴中的装饰
  function renderAccessories() {
    const worn = state.worn || {};
    const set = (node, slot) => {
      const deco = worn[slot] ? window.ItemConfig.getDecoration(worn[slot]) : null;
      node.textContent = deco ? deco.emoji : '';
      node.style.display = deco ? 'block' : 'none';
    };
    set(el.accHat, 'hat');
    set(el.accGlasses, 'glasses');
    set(el.accScarf, 'scarf');
    const bg = worn.background ? window.ItemConfig.getDecoration(worn.background) : null;
    el.petBg.textContent = bg ? bg.emoji : '';
    el.petBg.style.display = bg ? 'flex' : 'none';
  }

  function renderAdTab() {
    const left = Math.max(0, AD_MAX - state.ad.count);
    el.adTabText.textContent = adRunning ? '播放中…' : ('广告 ' + left + '/' + AD_MAX);
    el.adTabText.parentElement.classList.toggle('disabled', left === 0 || adRunning);
  }

  function renderActions() {
    el.stateText.textContent = state.dead ? '已故' : (state.sick ? '生病' : (state.resting ? '休息中' : '正常'));
    const restBtn = el.actions.querySelector('[data-act="rest"]');
    restBtn.classList.toggle('on', state.resting);
    restBtn.querySelector('.a-label').textContent = state.resting ? '取消休息' : '休息';
    const left = Math.max(0, HOUR_MS - (Date.now() - state.lastHourlyAt));
    el.incomeText.textContent = Math.ceil(left / 60000) + ' 分钟';
  }

  function renderAll() {
    renderStats(); renderCoins(); renderPet(); renderActions(); renderAdTab();
  }

  /* ================= 弹窗队列 ================= */
  function openModal(title, html) {
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = html;
    el.mask.hidden = false;
    el.modalBody.scrollTop = 0;
  }

  function closeModal() {
    el.mask.hidden = true;
    el.modalBody.innerHTML = '';
    tryNextModal();
  }

  // 重要弹窗排队，避免互相覆盖
  function pushModal(fn) {
    modalQueue.push(fn);
    tryNextModal();
  }

  function tryNextModal() {
    if (!el.mask.hidden || !modalQueue.length) return;
    const fn = modalQueue.shift();
    fn();
  }

  /* ================= 领养 ================= */
  function unlockedIds() { return window.PetConfig.getUnlockedIds(state.deaths); }

  function renderPetPicker() {
    const unlocked = unlockedIds();
    el.petPicker.innerHTML = window.PetConfig.pets.map((p) => {
      const isUnlocked = unlocked.indexOf(p.id) > -1;
      return '<button class="pet-opt' + (p.id === selectedPetId ? ' active' : '') + (isUnlocked ? '' : ' locked') + '" data-pet="' + p.id + '">' +
        '<span class="p-emoji">' + p.emoji + '</span>' +
        '<span class="p-label">' + p.label + '</span>' +
        '<span class="p-desc">' + (isUnlocked ? p.desc : '未解锁') + '</span>' +
        (isUnlocked ? '' : '<span class="pet-lock"><span class="l-emoji">🔒</span><span>再让它走 1 次</span></span>') +
      '</button>';
    }).join('');
  }

  function bindAdoptPage() {
    el.petPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pet]');
      if (!btn) return;
      const id = btn.dataset.pet;
      if (unlockedIds().indexOf(id) === -1) { showToast('🔒 该宠物尚未解锁'); return; }
      selectedPetId = id;
      renderPetPicker();
      el.nameInput.placeholder = window.PetConfig.get(id).defaultName;
      beep(660, .08);
    });
    el.nameInput.addEventListener('input', () => { el.adoptTip.textContent = ''; });
    el.adoptBtn.addEventListener('click', adoptPet);
    el.nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') adoptPet(); });
  }

  function adoptPet() {
    const id = selectedPetId;
    if (unlockedIds().indexOf(id) === -1) { showToast('🔒 该宠物尚未解锁'); return; }
    const cfg = window.PetConfig.get(id);
    const name = el.nameInput.value.trim() || cfg.defaultName;
    state.adopted = true;
    state.dead = false;
    state.petName = name;
    state.petId = id;
    state.adoptAt = Date.now();
    if (!state.firstAdoptAt) state.firstAdoptAt = Date.now();
    if (state.ownedPets.indexOf(id) === -1) state.ownedPets.push(id);
    state.stats = { health: 85, fullness: 85, happiness: 85, cleanliness: 85 };
    state.sick = false; state.criticalShown = false; state.hospitalPrompted = false;
    state.zeroSince = 0; state.pendingCritical = false;
    state.coins = BASE_COINS + 50 * state.deaths; // 重新领养继承遗产
    state.lastSave = Date.now();
    state.lastHourlyAt = Date.now();
    saveState();
    el.adoptScreen.hidden = true;
    el.mainScreen.hidden = false;
    renderAll();
    checkAchievements();
    beep(880, .12);
    showBubble('你好呀！我是' + name + '，请多关照～');
  }

  /* ================= 交互反馈 ================= */
  let bubbleTimer = null;
  function showBubble(text) {
    el.bubble.textContent = text;
    el.bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => el.bubble.classList.remove('show'), 2200);
  }

  function petTapFeedback() {
    el.pet.classList.remove('happy');
    void el.pet.offsetWidth; // 强制重排以重播动画
    el.pet.classList.add('happy');
    showBubble(PET_TALK[Math.floor(Math.random() * PET_TALK.length)]);
    beep(520 + Math.floor(Math.random() * 180), .1);
    renderPet();
    setTimeout(openAttrPanel, 350);
  }

  /* ================= 核心操作 ================= */
  function doAction(actId) {
    const act = ACTIONS[actId];
    if (!act || state.dead) return;
    if (actId === 'rest') {
      state.resting = !state.resting;
      showBubble(state.resting ? '呼噜噜～我睡一会儿～' : '睡饱啦，精神多啦！');
      beep(state.resting ? 380 : 700, .12);
      renderAll(); saveState();
      return;
    }
    if (state.coins < act.cost) {
      showToast('🪙 金币不足，还差 ' + (act.cost - state.coins) + ' 枚');
      beep(220, .18);
      return;
    }
    state.coins -= act.cost;
    const s = state.stats;
    if (actId === 'feed') { s.fullness += 15; showBubble('好香！吃得好满足～'); }
    if (actId === 'clean') { s.cleanliness += 30; showBubble('洗得香香的，真舒服！'); }
    if (actId === 'play') {
      const bonus = owns('funToy') ? 1.5 : 1; // 逗乐玩具：玩耍效果 +50%
      s.happiness += 25 * bonus;
      s.fullness -= 5;
      showBubble('哈哈哈，太好玩啦！');
    }
    clampStats();
    refreshSickState();
    beep(700, .1);
    renderAll(); saveState();
    checkAchievements();
  }

  /* ================= 商店 ================= */
  function openShop(tab) {
    if (tab) shopTab = tab;
    const cfg = window.ItemConfig;
    let listHtml = '';
    if (shopTab === 'consumable') {
      listHtml = cfg.consumables.map((it) =>
        '<div class="shop-item"><span class="s-emoji">' + it.emoji + '</span>' +
        '<div class="s-info"><div class="s-name">' + it.name + '</div>' +
        '<div class="s-desc">' + it.desc + '</div><div class="s-price">🪙 ' + it.price + '</div></div>' +
        '<button class="buy-btn" data-buy="' + it.id + '">购买</button></div>').join('');
    } else if (shopTab === 'prop') {
      listHtml = cfg.props.map((p) =>
        '<div class="shop-item"><span class="s-emoji">' + p.emoji + '</span>' +
        '<div class="s-info"><div class="s-name">' + p.name +
        (owns(p.id) ? '<span class="s-badge">已拥有</span>' : '<span class="s-badge" style="background:#ffe6c2;color:#ff8f3c">' + p.tag + '</span>') +
        '</div><div class="s-desc">' + p.desc + '</div><div class="s-price">🪙 ' + p.price + '</div></div>' +
        (owns(p.id) ? '<button class="buy-btn owned" disabled>已拥有</button>'
          : '<button class="buy-btn" data-prop="' + p.id + '">购买</button>') + '</div>').join('');
    } else {
      const preview = '<div class="deco-preview">' +
        '<span>' + window.PetConfig.get(state.petId).emoji + '</span>' +
        '<span>' + (state.worn.hat ? window.ItemConfig.getDecoration(state.worn.hat).emoji : '🎩') + '</span>' +
        '<span>' + (state.worn.glasses ? window.ItemConfig.getDecoration(state.worn.glasses).emoji : '🕶️') + '</span>' +
        '<span>' + (state.worn.scarf ? window.ItemConfig.getDecoration(state.worn.scarf).emoji : '🧣') + '</span>' +
        '<span>' + (state.worn.background ? window.ItemConfig.getDecoration(state.worn.background).emoji : '🌈') + '</span>' +
        '</div>';
      listHtml = preview + '<div class="deco-grid">' + cfg.decorations.map((d) => {
        const owned = state.decorations.indexOf(d.id) > -1;
        const worn = state.worn[d.slot] === d.id;
        return '<div class="deco-card' + (worn ? ' worn' : '') + '">' +
          '<div class="d-emoji">' + d.emoji + '</div>' +
          '<div class="d-name">' + d.name + '</div>' +
          '<div class="d-slot">' + d.desc + '</div>' +
          (owned
            ? '<button class="deco-btn' + (worn ? ' off' : '') + '" data-wear="' + d.id + '">' + (worn ? '卸下' : '穿戴') + '</button>'
            : '<button class="deco-btn" data-deco="' + d.id + '">🪙 ' + d.price + '</button>') +
          '</div>';
      }).join('') + '</div><p class="deco-tip">装饰只改变外观，不影响任何属性</p>';
    }
    const html =
      '<div class="tabs">' +
        '<button class="tab-btn' + (shopTab === 'consumable' ? ' active' : '') + '" data-shop-tab="consumable">消耗品</button>' +
        '<button class="tab-btn' + (shopTab === 'prop' ? ' active' : '') + '" data-shop-tab="prop">道具</button>' +
        '<button class="tab-btn' + (shopTab === 'deco' ? ' active' : '') + '" data-shop-tab="deco">装饰</button>' +
      '</div>' + (shopTab === 'deco' ? listHtml : '<div class="shop-list">' + listHtml + '</div>');
    openModal('🏪 商店', html);
  }

  function buyConsumable(itemId) {
    const item = window.ItemConfig.getConsumable(itemId);
    if (!item) return;
    if (state.coins < item.price) { showToast('🪙 金币不足，无法购买'); beep(220, .18); return; }
    state.coins -= item.price;
    Object.keys(item.effect).forEach((k) => { state.stats[k] += item.effect[k]; });
    clampStats();
    refreshSickState();
    state.purchaseCount++;
    showToast('✅ 已使用 ' + item.name + '，' + item.desc);
    beep(880, .12);
    renderAll(); saveState();
    checkAchievements();
    openShop('consumable');
  }

  function buyProp(propId) {
    const prop = window.ItemConfig.getProp(propId);
    if (!prop) return;
    if (owns(propId)) { showToast('已经拥有该道具啦'); return; }
    if (state.coins < prop.price) { showToast('🪙 金币不足，无法购买'); beep(220, .18); return; }
    state.coins -= prop.price;
    state.ownedItems.push(propId);
    state.purchaseCount++;
    showToast('🎁 已永久获得「' + prop.name + '」');
    beep(990, .16);
    renderAll(); saveState();
    checkAchievements();
    openShop('prop');
  }

  function buyDecoration(decoId) {
    const deco = window.ItemConfig.getDecoration(decoId);
    if (!deco) return;
    if (state.decorations.indexOf(decoId) > -1) { showToast('已经拥有该装饰啦'); return; }
    if (state.coins < deco.price) { showToast('🪙 金币不足，无法购买'); beep(220, .18); return; }
    state.coins -= deco.price;
    state.decorations.push(decoId);
    state.purchaseCount++;
    showToast('🎀 已获得「' + deco.name + '」');
    beep(990, .16);
    renderAll(); saveState();
    checkAchievements();
    openShop('deco');
  }

  function toggleWear(decoId) {
    const deco = window.ItemConfig.getDecoration(decoId);
    if (!deco) return;
    if (state.worn[deco.slot] === decoId) { // 卸下
      state.worn[deco.slot] = '';
      showToast('已卸下「' + deco.name + '」');
    } else { // 穿戴
      state.worn[deco.slot] = decoId;
      showToast('✨ 穿戴「' + deco.name + '」');
    }
    beep(760, .1);
    renderPet(); saveState();
    openShop('deco');
  }

  /* ================= 签到 ================= */
  function signRewardByDay(day) { return day === 7 ? 50 : 10 + (day - 1) * 5; }

  function openSign() {
    const today = todayKey();
    const signedToday = state.sign.last === today;
    const effectiveStreak = Math.max(1, state.sign.streak);
    const cycleDay = ((effectiveStreak - 1) % 7) + 1;
    const completed = signedToday ? cycleDay : cycleDay - 1;
    let days = '';
    for (let i = 1; i <= 7; i++) {
      days += '<div class="sign-day' + (i <= completed ? ' done' : '') + (i === cycleDay && !signedToday ? ' today' : '') + '">' +
        '<div class="d-num">第' + i + '天</div><div class="d-coin">🪙' + signRewardByDay(i) + '</div></div>';
    }
    const info = makeupSignInfo();
    const makeupHtml = info.broken
      ? '<div class="sign-note" style="margin:0 0 2.4vw">已断签 ' + info.missed + ' 天，可消耗 ' + info.cost +
        ' 金币补齐（' + MAKEUP_COST + ' 金币/天）</div>' +
        '<button class="btn ghost sign-btn" id="makeupSignBtn" style="margin-bottom:2.4vw">🗓️ 补打卡（' + info.cost + ' 金币）</button>'
      : '';
    const html =
      '<div class="sign-head"><div class="sign-streak">已连续签到 ' + state.sign.streak + ' 天</div></div>' +
      '<div class="sign-days">' + days + '</div>' +
      makeupHtml +
      '<button class="btn primary sign-btn" id="signBtn"' + (signedToday ? ' disabled' : '') + '>' +
        (signedToday ? '今日已签到' : '📅 领取第 ' + cycleDay + ' 天奖励') + '</button>' +
      '<p class="sign-note">每日仅可签到一次，断签后可花金币补卡续上</p>';
    openModal('📅 每日签到', html);
  }

  function doSign() {
    const today = todayKey();
    if (state.sign.last === today) { showToast('今天已经签到过啦'); return; }
    state.sign.streak = (state.sign.last === yesterdayKey()) ? state.sign.streak + 1 : 1;
    state.sign.last = today;
    const cycleDay = ((state.sign.streak - 1) % 7) + 1;
    const reward = signRewardByDay(cycleDay);
    addCoins(reward, true);
    showToast('🎉 签到成功，获得 ' + reward + ' 金币');
    beep(990, .16);
    renderAll(); saveState();
    checkAchievements();
    openSign();
  }

  // 断签信息：缺签天数与补卡费用
  function makeupSignInfo() {
    const today = todayKey();
    if (!state.sign.last || state.sign.last === today || state.sign.last === yesterdayKey()) {
      return { broken: false, missed: 0, cost: 0 };
    }
    const last = new Date(state.sign.last.replace(/-/g, '/'));
    const now = new Date(today.replace(/-/g, '/'));
    const diff = Math.round((now - last) / 86400000); // 距离上次签到的天数
    const missed = Math.max(1, diff - 1);            // 中间缺失的签到天数
    return { broken: true, missed: missed, cost: missed * MAKEUP_COST };
  }

  // 补打卡：消耗金币补齐断签天数，保持连续签到不断档
  function doMakeupSign() {
    const info = makeupSignInfo();
    if (!info.broken) { showToast('签到未断，无需补卡'); return; }
    if (state.coins < info.cost) {
      showToast('🪙 金币不足，补齐 ' + info.missed + ' 天需 ' + info.cost + ' 金币');
      beep(220, .18);
      return;
    }
    state.coins -= info.cost;
    state.sign.streak += info.missed;   // 补回连续签到天数
    state.sign.last = yesterdayKey();   // 今日签到可继续累计
    showToast('🗓️ 补卡成功，补齐 ' + info.missed + ' 天，快去签到吧');
    beep(880, .12);
    renderAll(); saveState();
    openSign();
  }

  /* ================= 广告金币 ================= */
  function ensureAdToday() {
    const today = todayKey();
    if (state.ad.date !== today) { state.ad.date = today; state.ad.count = 0; }
  }

  function openAd() {
    ensureAdToday();
    const left = Math.max(0, AD_MAX - state.ad.count);
    if (adRunning) { // 正在播放中，禁用重复点击
      openModal('📺 看广告',
        '<div class="ad-body"><div class="ad-screen"><div class="a-big">📺</div>' +
        '<div class="a-txt">广告播放中，请稍候…</div></div>' +
        '<button class="btn primary ad-btn" id="adBtn" disabled><span id="adLabel">播放中…</span></button></div>');
      return;
    }
    if (left === 0) {
      openModal('📺 看广告', '<div class="ad-body"><div class="ad-screen"><div class="a-big">😴</div>' +
        '<div class="a-txt">今日次数已用完，明天再来吧</div></div>' +
        '<button class="btn ghost ad-btn" id="adClose">知道啦</button></div>');
      return;
    }
    openModal('📺 看广告',
      '<div class="ad-body">' +
      '<div class="ad-screen"><div class="a-big">📺</div><div class="a-txt">广告播放中，3 秒后到账</div></div>' +
      '<button class="btn primary ad-btn" id="adBtn"><span id="adLabel">▶️ 开始观看（剩 ' + left + ' 次）</span></button>' +
      '<p class="ad-note">每日最多 ' + AD_MAX + ' 次，每次观看结束立即到账 ' + AD_REWARD + ' 金币</p></div>');
  }

  // 开始播放广告（幂等：重复点击不会重复发币）
  function startAdWatch() {
    if (adRunning) return;
    const btn = $('adBtn');
    const label = $('adLabel');
    if (!btn || !label) return;
    ensureAdToday();
    if (state.ad.count >= AD_MAX) { showToast('今日广告次数已用完'); openAd(); return; }
    adRunning = true;
    let left = 3;
    btn.disabled = true;
    label.textContent = '广告播放中… ' + left + 's';
    renderAdTab();
    adTimer = setInterval(() => {
      left--;
      if (left > 0) {
        const lb = $('adLabel');
        if (lb) lb.textContent = '广告播放中… ' + left + 's';
        return;
      }
      finishAdWatch();
    }, 1000);
  }

  // 播放结束：立即到账金币（即使中途关闭弹窗也会发放）
  function finishAdWatch() {
    if (adTimer) { clearInterval(adTimer); adTimer = null; }
    adRunning = false;
    ensureAdToday();
    state.ad.count++;
    addCoins(AD_REWARD, true);
    showToast('📺 观看完成，' + AD_REWARD + ' 金币已到账！');
    beep(990, .16);
    renderAll(); saveState();
    checkAchievements();
    if (!el.mask.hidden && el.modalTitle.textContent.indexOf('看广告') > -1) openAd();
  }

  /* ================= 成就系统 ================= */
  function checkAchievements() {
    if (!state.adopted) return;
    const ctx = { aliveDays: aliveDays() };
    window.Achievements.list.forEach((a) => {
      if (window.Achievements.isUnlocked(state, a.id)) return;
      let ok = false;
      try { ok = a.check(state, ctx); } catch (e) { ok = false; }
      if (!ok) return;
      state.achievements.push(a.id);
      saveState();
      pushModal(() => showAchievementUnlock(a));
    });
  }

  function showAchievementUnlock(ach) {
    const html =
      '<div class="unlock-body"><div class="unlock-emoji">' + ach.emoji + '</div>' +
      '<div class="unlock-name">🏆 ' + ach.name + '</div>' +
      '<p class="unlock-desc">' + ach.desc + '</p>' +
      '<button class="btn primary" id="unlockClose" style="width:100%;height:10vw;font-size:3.8vw">太棒了</button></div>';
    openModal('🎉 成就解锁', html);
    beep(1180, .18);
  }

  function openAchievements() {
    const ctx = { aliveDays: aliveDays() };
    const items = window.Achievements.list.map((a) => {
      const done = window.Achievements.isUnlocked(state, a.id);
      let progress = '';
      if (!done) {
        if (a.id === 'survive7') progress = '进度 ' + Math.min(ctx.aliveDays, 999) + '/7 天';
        else if (a.id === 'centenarian') progress = '进度 ' + ctx.aliveDays + '/100 天';
        else if (a.id === 'spendthrift') progress = '进度 ' + Math.min(state.totalCoinsEarned, 1000) + '/1000 金币';
        else if (a.id === 'shopper') progress = '进度 ' + Math.min(state.purchaseCount, 10) + '/10 次';
        else if (a.id === 'collector') progress = '进度 ' + state.ownedPets.length + '/' + window.PetConfig.pets.length + ' 种';
      }
      return '<div class="ach-item' + (done ? ' done' : '') + '">' +
        '<span class="a-emoji">' + a.emoji + '</span>' +
        '<div class="a-info"><div class="a-name">' + a.name + '</div>' +
        '<div class="a-desc">' + a.desc + '</div></div>' +
        '<span class="a-state">' + (done ? '✅ 已解锁' : (progress || '🔒 未解锁')) + '</span></div>';
    }).join('');
    const html =
      '<div class="ach-list">' + items + '</div>' +
      '<p class="ach-progress">已解锁 ' + state.achievements.length + ' / ' + window.Achievements.list.length + ' 项成就</p>';
    openModal('🏆 成就殿堂', html);
  }

  /* ================= 宠物属性面板 ================= */
  function openAttrPanel() {
    const cfg = window.PetConfig.get(state.petId);
    const stage = currentStage();
    const rows = STAT_META.map((m) =>
      '<div class="attr-row"><span>' + m.icon + ' ' + m.label + '</span><b>' + Math.round(state.stats[m.key]) + ' / ' + stage.cap + '</b></div>'
    ).join('');
    const props = state.ownedItems.length
      ? state.ownedItems.map((id) => {
          const p = window.ItemConfig.getProp(id);
          return '<span class="prop-chip">' + (p ? p.emoji + ' ' + p.name : id) + '</span>';
        }).join('')
      : '<span class="attr-tag bad">暂无道具</span>';
    const decos = state.decorations.length
      ? state.decorations.map((id) => {
          const d = window.ItemConfig.getDecoration(id);
          return '<span class="prop-chip">' + (d ? d.emoji + ' ' + d.name : id) + '</span>';
        }).join('')
      : '<span class="attr-tag bad">暂无装饰</span>';
    const html =
      '<div class="attr-list">' + rows + '</div>' +
      '<div class="attr-extra">' +
        '<div><span class="attr-tag">' + cfg.emoji + ' ' + cfg.label + '</span>' +
          '<span class="attr-tag' + (state.sick ? ' bad' : ' good') + '">' + (state.sick ? '🤒 生病中' : '✅ 健康') + '</span>' +
          '<span class="attr-tag' + (state.resting ? '' : ' bad') + '">' + (state.resting ? '😴 休息中' : '⏳ 清醒') + '</span>' +
          '<span class="attr-tag">' + stage.emoji + ' ' + stage.name + '</span></div>' +
        '<div>类型：' + cfg.label + '（' + cfg.desc + '）</div>' +
        '<div>年龄：' + window.Growth.ageDays(state) + ' 天（累计在线 ' + formatDuration(state.onlineMs) + '）</div>' +
        '<div>领养天数：' + aliveDays() + ' 天 ｜ 死亡次数：' + state.deaths + '</div>' +
        '<div>四维平均：' + Math.round(averageStats()) + '（≥70 每小时 +8🪙，≥50 +3🪙，&lt;30 -2🪙' +
          (stage.coinBonus ? '，老年 +' + Math.round(stage.coinBonus * 100) + '%' : '') + '）</div>' +
        '<div>金币总数：' + state.coins + ' ｜ 累计获得：' + state.totalCoinsEarned + '</div>' +
        '<div>收藏进度：' + state.ownedPets.length + '/' + window.PetConfig.pets.length + ' 种宠物</div>' +
        '<div style="margin-top:1.4vw">拥有道具：</div><div class="prop-bag">' + props + '</div>' +
        '<div style="margin-top:1.4vw">装饰栏：</div><div class="prop-bag">' + decos + '</div>' +
      '</div>' +
      '<div class="rename-row">' +
        '<input id="renameInput" class="name-input" type="text" maxlength="8" value="' + state.petName + '" placeholder="修改名字" />' +
        '<button class="btn primary" id="renameBtn">保存</button>' +
      '</div>' +
      '<div class="rename-row"><button class="btn ghost" id="hospitalBtn" style="width:100%">🏥 前往医院</button></div>';
    openModal('📊 宠物属性', html);
  }

  function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return days + ' 天 ' + (hours % 24) + ' 小时';
    return hours + ' 小时';
  }

  function renamePet() {
    const input = $('renameInput');
    const name = input ? input.value.trim() : '';
    if (!name) { showToast('名字不能为空哦'); return; }
    state.petName = name;
    showToast('✏️ 名字已改为「' + name + '」');
    beep(760, .1);
    renderAll(); saveState();
    openAttrPanel();
  }

  /* ================= 医院 ================= */
  function openHospital() {
    const critical = state.stats.health <= 0;
    const html =
      '<div class="hospital-body"><div class="hospital-emoji">🏥</div>' +
      '<p class="hospital-text">小宠物生病了，需要治疗！<br>当前健康度：' + Math.round(state.stats.health) + '</p>' +
      '<button class="hospital-opt" id="treatNormal"><span class="h-emoji">💊</span><span class="h-info">' +
      '<span class="h-name">普通治疗</span><span class="h-desc">健康 +40，解除生病状态</span></span>' +
      '<span class="h-price">🪙' + HOSPITAL_NORMAL + '</span></button>' +
      '<button class="hospital-opt" id="treatEmergency"' + (critical ? '' : ' disabled') + '><span class="h-emoji">🚑</span>' +
      '<span class="h-info"><span class="h-name">急救治疗</span>' +
      '<span class="h-desc">健康恢复到 30（仅健康≤0 可用）</span></span>' +
      '<span class="h-price">🪙' + HOSPITAL_EMERGENCY + '</span></button>' +
      '<button class="btn ghost hospital-close" id="hospitalClose">暂时离开</button></div>';
    openModal('🏥 宠物医院', html);
  }

  function treatNormal() {
    if (state.coins < HOSPITAL_NORMAL) { showToast('🪙 金币不足，还差 ' + (HOSPITAL_NORMAL - state.coins) + ' 枚'); beep(220, .18); return; }
    state.coins -= HOSPITAL_NORMAL;
    state.stats.health += 40;
    clampStats();
    refreshSickState();
    state.zeroSince = 0;
    showToast('💊 治疗完成，健康 +40');
    beep(860, .14);
    renderAll(); saveState();
    if (state.sick) openHospital(); else closeModal();
  }

  function treatEmergency() {
    if (state.stats.health > 0) { showToast('当前无需急救治疗'); return; }
    if (state.coins < HOSPITAL_EMERGENCY) { showToast('🪙 金币不足，还差 ' + (HOSPITAL_EMERGENCY - state.coins) + ' 枚'); beep(220, .18); return; }
    state.coins -= HOSPITAL_EMERGENCY;
    state.stats.health = 30;
    clampStats();
    refreshSickState();
    state.zeroSince = 0;
    showToast('🚑 急救成功，健康恢复到 30');
    beep(920, .18);
    renderAll(); saveState();
    closeModal();
  }

  /* ================= 模拟充值 ================= */
  function openRecharge() {
    const html =
      '<div class="recharge-list">' + RECHARGE_TIERS.map((t) =>
        '<div class="recharge-item"><span class="r-emoji">' + t.emoji + '</span>' +
        '<div class="r-info"><div class="r-price">' + t.price + '</div>' +
        '<div class="r-coin">到账 ' + t.coins + ' 金币</div></div>' +
        '<button class="buy-btn" data-pay="' + t.id + '">立即充值</button></div>').join('') +
      '</div><p class="recharge-note">本页面仅为前端模拟支付，不会产生任何真实交易</p>';
    openModal('💎 金币充值', html);
  }

  function doRecharge(tierId) {
    const tier = RECHARGE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    const payMask = document.createElement('div');
    payMask.className = 'pay-mask';
    payMask.innerHTML = '<div class="pay-box"><div class="p-emoji">💳</div><div class="p-text">支付中…</div></div>';
    document.body.appendChild(payMask);
    setTimeout(() => {
      payMask.remove();
      addCoins(tier.coins, false);
      showToast('💎 充值成功，到账 ' + tier.coins + ' 金币');
      beep(1180, .2);
      renderAll(); saveState();
      closeModal();
    }, 1200);
  }

  /* ================= 设置 ================= */
  function openSettings() {
    const info = makeupSignInfo();
    const makeupDesc = info.broken
      ? '已断签 ' + info.missed + ' 天，补齐需 ' + info.cost + ' 金币'
      : '签到连续，无需补卡';
    const html =
      '<div class="set-list">' +
        '<div class="set-item"><span class="s-emoji">🔊</span><div class="s-info">' +
          '<div class="s-name">音效</div><div class="s-desc">操作反馈提示音</div></div>' +
          '<div class="switch' + (state.soundOn ? ' on' : '') + '" id="soundSwitch"></div></div>' +
        '<div class="set-item"><span class="s-emoji">💎</span><div class="s-info">' +
          '<div class="s-name">金币充值</div><div class="s-desc">模拟充值，纯前端演示</div></div>' +
          '<button class="set-btn" id="settingRecharge">充值</button></div>' +
        '<div class="set-item"><span class="s-emoji">🗓️</span><div class="s-info">' +
          '<div class="s-name">补打卡</div><div class="s-desc">' + makeupDesc + '</div></div>' +
          '<button class="set-btn" id="makeupSignBtn"' + (info.broken ? '' : ' disabled') + '>补卡</button></div>' +
        '<div class="set-item"><span class="s-emoji">🗑️</span><div class="s-info">' +
          '<div class="s-name">清空存档</div><div class="s-desc">删除全部数据，重新开始</div></div>' +
          '<button class="set-btn danger" id="clearSaveBtn">清空</button></div>' +
      '</div>' +
      '<div class="set-info">' +
        '死亡次数：' + state.deaths + ' 次 ｜ 已解锁宠物：' + unlockedIds().length + '/' + window.PetConfig.pets.length + '<br>' +
        '累计在线：' + formatDuration(state.onlineMs) + ' ｜ 累计获得金币：' + state.totalCoinsEarned + '<br>' +
        '购买次数：' + state.purchaseCount + ' ｜ 成就：' + state.achievements.length + '/' + window.Achievements.list.length +
      '</div>';
    openModal('⚙️ 设置', html);
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    saveState();
    if (state.soundOn) beep(880, .12);
    showToast(state.soundOn ? '🔊 音效已开启' : '🔇 音效已关闭');
    openSettings();
  }

  function clearSave() {
    if (!clearArmed) { // 二次确认
      clearArmed = true;
      showToast('⚠️ 再点一次确认清空存档');
      const btn = $('clearSaveBtn');
      if (btn) btn.textContent = '确认清空？';
      setTimeout(() => {
        clearArmed = false;
        const b = $('clearSaveBtn');
        if (b) b.textContent = '清空';
      }, 4000);
      return;
    }
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    location.reload();
  }

  /* ================= 随机事件 ================= */
  function triggerDailyEvent() {
    if (!state.adopted || state.dead || state.eventDate === todayKey()) return;
    const ev = window.EventPool.random(state.petId); // 专属事件 + 通用事件
    state.eventDate = todayKey();
    const chips = [];
    if (ev.effect.stats) {
      Object.keys(ev.effect.stats).forEach((k) => {
        const meta = STAT_META.find((m) => m.key === k);
        const v = ev.effect.stats[k];
        chips.push('<span class="event-chip ' + (v >= 0 ? 'up' : 'down') + '">' + (meta ? meta.icon + meta.label : k) + ' ' + (v >= 0 ? '+' : '') + v + '</span>');
        state.stats[k] += v;
      });
    }
    if (ev.effect.coins) {
      const c = ev.effect.coins;
      chips.push('<span class="event-chip coin">🪙 ' + (c >= 0 ? '+' : '') + c + '</span>');
      addCoins(c, c > 0);
    }
    clampStats();
    refreshSickState();
    saveState();
    renderAll();
    checkAchievements();
    const html =
      '<div class="event-body"><div class="event-emoji">' + ev.emoji + '</div>' +
      '<div class="event-title">' + ev.title + '</div><p class="event-desc">' + ev.desc + '</p>' +
      '<div class="event-effect">' + chips.join('') + '</div>' +
      '<button class="btn primary" id="eventClose" style="width:100%;height:10vw;font-size:3.8vw">收下这份惊喜</button></div>';
    openModal('🎲 今日事件', html);
    beep(ev.type === 'negative' ? 320 : 940, .16);
  }

  /* ================= 死亡与轮回 ================= */
  function triggerDeath() {
    state.dead = true;
    state.deaths++;              // 记录历史死亡次数
    state.zeroSince = 0;
    state.resting = false;
    saveState();
    renderAll();
    const before = window.PetConfig.getUnlockedIds(state.deaths - 1);
    const after = window.PetConfig.getUnlockedIds(state.deaths);
    const fresh = after.filter((id) => before.indexOf(id) === -1);
    pushModal(() => openDeathModal(fresh));
  }

  function openDeathModal(freshUnlocked) {
    const inherit = BASE_COINS + 50 * state.deaths;
    const unlockTip = freshUnlocked.length
      ? '🎁 已解锁新宠物：' + freshUnlocked.map((id) => window.PetConfig.get(id).emoji + window.PetConfig.get(id).label).join('、')
      : '📦 已收集全部宠物';
    const html =
      '<div class="death-body"><div class="death-emoji">🕯️</div>' +
      '<p class="death-text">' + state.petName + ' 因为健康归零太久，离开了这个世界。<br>它的一生陪伴了你 ' + aliveDays() + ' 天。</p>' +
      '<p class="death-stat">累计死亡 ' + state.deaths + ' 次 ｜ 重新领养初始金币 ' + inherit + ' 🪙<br>' + unlockTip + '</p>' +
      '<button class="death-opt" id="reviveBtn"' + (state.coins < REVIVE_COST ? ' disabled' : '') + '>' +
        '<span class="d-emoji">💖</span><span class="d-info"><span class="d-name">复活</span>' +
        '<span class="d-desc">花费 ' + REVIVE_COST + ' 金币，健康恢复到 50</span></span>' +
        '<span class="d-price">🪙' + REVIVE_COST + '</span></button>' +
      '<button class="death-opt" id="reAdoptBtn"><span class="d-emoji">🐾</span><span class="d-info">' +
        '<span class="d-name">重新领养</span><span class="d-desc">继承遗产，初始金币 + 50×死亡次数</span></span>' +
        '<span class="d-price">🪙' + inherit + '</span></button>' +
      '</div>';
    openModal('🕯️ 宠物离世', html);
  }

  function revivePet() {
    if (state.coins < REVIVE_COST) { showToast('🪙 金币不足，还差 ' + (REVIVE_COST - state.coins) + ' 枚'); beep(220, .18); return; }
    state.coins -= REVIVE_COST;
    state.dead = false;
    state.zeroSince = 0;
    state.sick = false;
    state.criticalShown = false;
    state.hospitalPrompted = false;
    state.stats.health = 50;
    clampStats();
    showToast('💖 它又回来了！');
    beep(760, .2);
    renderAll(); saveState();
    closeModal();
  }

  function reAdopt() {
    state.adopted = false;
    state.dead = false;
    state.sick = false;
    state.criticalShown = false;
    state.hospitalPrompted = false;
    state.pendingCritical = false;
    state.zeroSince = 0;
    state.resting = false;
    saveState();
    closeModal();
    el.mainScreen.hidden = true;
    el.adoptScreen.hidden = false;
    el.adoptSub.textContent = '上一只宠物已离开，继承遗产：初始金币 = 50 + 50×' + state.deaths + ' = ' + (BASE_COINS + 50 * state.deaths) + ' 🪙';
    el.nameInput.value = '';
    selectedPetId = unlockedIds()[unlockedIds().length - 1] || 'cat';
    renderPetPicker();
  }

  /* ================= 离线结算 ================= */
  function settleOffline() {
    const now = Date.now();
    const elapsed = now - state.lastSave;
    if (elapsed < 60000) { state.lastSave = now; return; }

    const settleMs = Math.min(elapsed, MAX_SETTLE_MS); // 离线最多结算 24 小时
    const before = Object.assign({}, state.stats);
    applyDecay(settleMs / 60000); // 结算离线属性衰减

    let hours = Math.floor(settleMs / HOUR_MS);
    let coinDelta = 0;
    for (let i = 0; i < hours; i++) coinDelta += settleHourlyReward();
    if (elapsed > HIBERNATE_MS) {
      state.lastHourlyAt = now; // 超出 24 小时部分不计入收益
    } else if (hours > 0) {
      state.lastHourlyAt += hours * HOUR_MS;
    }

    const hibernated = elapsed > HIBERNATE_MS;                    // 超过 24 小时进入休眠
    let forced = false;
    if (elapsed > FORCED_CRITICAL_MS) {                          // 超过 7 天强制降到 10
      state.stats.health = 10;
      state.pendingCritical = true;
      forced = true;
    }

    state.lastSave = now;
    refreshSickState();
    saveState();

    const diff = (k) => Math.round(state.stats[k] - before[k]);
    const h = Math.floor(elapsed / HOUR_MS);
    const m = Math.floor((elapsed % HOUR_MS) / 60000);
    let tip = '欢迎回来！你的小宠物一直在等你～';
    if (hibernated) tip = '离线超过 24 小时，宠物进入「休眠」状态，未继续衰减，也没有金币收益。';
    if (forced) tip = '离线超过 7 天，宠物健康被强制降到 10，请尽快救治！';
    const html =
      '<div class="report-row"><span>离线时长</span><b>' + (h > 0 ? h + ' 小时 ' : '') + m + ' 分钟</b></div>' +
      '<div class="report-row"><span>结算时长</span><b>' + Math.floor(settleMs / HOUR_MS) + ' 小时（上限 24 小时）</b></div>' +
      '<div class="report-row"><span>❤️ 健康</span><b>' + diff('health') + '</b></div>' +
      '<div class="report-row"><span>🍚 饱腹</span><b>' + diff('fullness') + '</b></div>' +
      '<div class="report-row"><span>😄 快乐</span><b>' + diff('happiness') + '</b></div>' +
      '<div class="report-row"><span>🫧 清洁</span><b>' + diff('cleanliness') + '</b></div>' +
      '<div class="report-row"><span>🪙 金币</span><b>' + (coinDelta >= 0 ? '+' : '') + coinDelta + '</b></div>' +
      '<p class="report-tip">' + tip + '</p>';
    openModal('🌙 离线结算', html);
  }

  /* ================= 病危与医院提示 ================= */
  function checkCritical() {
    if (state.dead) return;
    if (state.stats.health <= 0 && !state.criticalShown) {
      state.criticalShown = true;
      pushModal(openCriticalModal);
    } else if (state.pendingCritical && !state.criticalShown) {
      state.criticalShown = true;
      state.pendingCritical = false;
      pushModal(openCriticalModal);
    }
  }

  function openCriticalModal() {
    const html =
      '<div class="critical-body"><div class="critical-emoji">🚨</div>' +
      '<p class="critical-text">小宠物已经病危了！<br>当前健康度：' + Math.round(state.stats.health) + '<br>请尽快前往医院接受治疗。</p>' +
      '<button class="btn primary" id="criticalGo">🏥 前往医院</button>' +
      '<button class="btn ghost" id="criticalLater">先看看</button></div>';
    openModal('⚠️ 病危警告', html);
    const go = $('criticalGo'); const later = $('criticalLater');
    if (go) go.addEventListener('click', () => { closeModal(); openHospital(); });
    if (later) later.addEventListener('click', closeModal);
    beep(180, .3);
  }

  function checkHospitalPrompt() {
    if (state.sick && !state.hospitalPrompted && state.stats.health > 0 && !state.dead) {
      state.hospitalPrompted = true;
      pushModal(openHospital);
    }
  }

  /* ================= 主循环 ================= */
  function checkAutoFeeder() {
    if (!owns('autoFeeder')) return;
    const today = todayKey();
    if (state.autoFeed.date !== today) { state.autoFeed.date = today; state.autoFeed.count = 0; }
    if (state.autoFeed.count >= AUTO_FEED_MAX) return;
    if (state.stats.fullness >= 30) return;
    state.stats.fullness = Math.min(stageCap(), state.stats.fullness + 15);
    state.autoFeed.count++;
    showToast('🤖 自动喂食器已喂食（今日 ' + state.autoFeed.count + '/' + AUTO_FEED_MAX + '）');
    beep(660, .1);
    saveState();
  }

  function tick() {
    const now = Date.now();
    state.onlineMs += 1000; // 累计在线时长（决定成长阶段）

    if (!state.dead) {
      applyDecay(1 / 60); // 主循环每秒执行一次
      refreshSickState();
      checkAutoFeeder();

      if (state.stats.health <= 0) {
        if (!state.zeroSince) state.zeroSince = now; // 记录归零时刻
        else if (now - state.zeroSince >= DEATH_CONFIRM_MS) triggerDeath(); // 持续 24 小时确认死亡
      } else {
        state.zeroSince = 0;
      }
    }

    renderAll();
    checkCritical();
    checkHospitalPrompt();
    triggerDailyEvent();
    checkAchievements();

    if (now - state.lastHourlyAt >= HOUR_MS && !state.dead) { // 每满 1 小时结算金币
      const delta = settleHourlyReward();
      state.lastHourlyAt += HOUR_MS;
      showToast('⏰ 每小时结算：' + (delta >= 0 ? '+' : '') + delta + ' 金币');
      saveState();
    }

    tickCount++;
    if (tickCount % 5 === 0) saveState(); // 每 5 秒落盘一次
  }

  /* ================= 初始化 ================= */
  function init() {
    buildBars();
    bindAdoptPage();

    const hasSave = loadState();
    renderPetPicker(); // 解锁状态依赖存档中的死亡次数，需在读档后渲染
    el.nameInput.placeholder = window.PetConfig.get(selectedPetId).defaultName;
    if (hasSave) {
      el.adoptScreen.hidden = true;
      el.mainScreen.hidden = false;
      renderAll();
      if (state.dead) {
        state.lastSave = Date.now(); // 已死亡状态跳过离线结算
        saveState();
        pushModal(() => openDeathModal([]));
      } else {
        settleOffline();
      }
      renderAll();
      triggerDailyEvent();
      checkAchievements();
    } else {
      el.adoptScreen.hidden = false;
      el.mainScreen.hidden = true;
      el.adoptSub.textContent = '选一只伙伴，它会陪着你成长，记得常来看看它呀～';
    }

    // 宠物点击 → 反馈 + 属性面板
    el.pet.addEventListener('click', petTapFeedback);
    // 充值按钮
    el.rechargeBtn.addEventListener('click', openRecharge);
    // 操作按钮
    el.actions.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (btn) doAction(btn.dataset.act);
    });
    // 底部导航
    document.querySelector('.tabbar').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;
      const map = {
        shop: openShop, sign: openSign, ad: openAd,
        achieve: openAchievements, attr: openAttrPanel, setting: openSettings
      };
      if (map[tab.dataset.tab]) map[tab.dataset.tab]();
    });
    // 弹窗内交互（事件委托）
    el.modalBody.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-shop-tab]');
      if (tabBtn) { openShop(tabBtn.dataset.shopTab); return; }
      const buy = e.target.closest('[data-buy]');
      if (buy) { buyConsumable(buy.dataset.buy); return; }
      const prop = e.target.closest('[data-prop]');
      if (prop) { buyProp(prop.dataset.prop); return; }
      const deco = e.target.closest('[data-deco]');
      if (deco) { buyDecoration(deco.dataset.deco); return; }
      const wear = e.target.closest('[data-wear]');
      if (wear) { toggleWear(wear.dataset.wear); return; }
      const pay = e.target.closest('[data-pay]');
      if (pay) { doRecharge(pay.dataset.pay); return; }
      // 优先取最近的带 id 按钮，避免点击按钮内层文字（span）时事件丢失
      const hit = e.target.closest('button[id]') || e.target.closest('[id]');
      const id = hit ? hit.id : '';
      if (id === 'signBtn') { doSign(); return; }
      if (id === 'adBtn') { startAdWatch(); return; }
      if (id === 'renameBtn') { renamePet(); return; }
      if (id === 'hospitalBtn') { openHospital(); return; }
      if (id === 'treatNormal') { treatNormal(); return; }
      if (id === 'treatEmergency') { treatEmergency(); return; }
      if (id === 'soundSwitch') { toggleSound(); return; }
      if (id === 'settingRecharge') { closeModal(); openRecharge(); return; }
      if (id === 'makeupSignBtn') { doMakeupSign(); return; }
      if (id === 'clearSaveBtn') { clearSave(); return; }
      if (id === 'reviveBtn') { revivePet(); return; }
      if (id === 'reAdoptBtn') { reAdopt(); return; }
      if (id === 'unlockClose' || id === 'eventClose' || id === 'adClose' || id === 'hospitalClose') {
        closeModal(); return;
      }
    });
    el.modalClose.addEventListener('click', closeModal);
    el.mask.addEventListener('click', (e) => { if (e.target === el.mask) closeModal(); });

    // 离开页面时立即存档，保证离线结算准确
    window.addEventListener('beforeunload', saveState);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });

    setInterval(tick, 1000); // 主循环：每秒更新状态
  }

  init();
})();
