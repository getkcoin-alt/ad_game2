// App shell: boot, navigation and the meta screens (home, Yatra map, recipe diary, shelf,
// settings, daily thali, gifts, chai-break reminder).

import { getLevel, getDailyLevel, TOTAL_LEVELS } from './engine/levels.js';
import { CITIES, LEVELS_PER_CITY } from './engine/content.js';
import { GameScreen, BOOSTER_COST, BOOSTER_ICON } from './game/controller.js';
import { iconURL, tileSprite } from './render/art.js';
import { sound } from './audio.js';
import { ads } from './ads.js';
import { analytics } from './analytics.js';
import { t, L, setLang, getLang } from './i18n.js';
import { todayKey, resetSave } from './storage.js';
import { save, commit, $, $$, openModal, choose, toast, backModal, closeAllModals, confetti } from './ui.js';

const BREAK_MINUTES = 30;
let current = 'home';
let game = null;
let activeMs = 0;
let lastTick = Date.now();
let lastBreakAt = 0;
let levelsThisSession = 0;

// ---------- navigation ----------
function show(name) {
  current = name;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  window.scrollTo(0, 0);
}

function coinsHTML() { return `<div class="coins" aria-label="${t('coins')}">🪙 <b>${save.coins}</b></div>`; }
function refreshCoins() { $$('.coins b').forEach((el) => { el.textContent = save.coins; }); }

function totalStars() { return Object.values(save.stars).reduce((a, b) => a + b, 0); }

// ---------- home ----------
function renderHome() {
  const el = $('#screen-home');
  const next = Math.min(save.unlocked, TOTAL_LEVELS);
  const done = save.unlocked > TOTAL_LEVELS;
  const dailyDone = save.daily.lastWin === todayKey();
  const city = CITIES[Math.floor((next - 1) / LEVELS_PER_CITY)];
  el.innerHTML = `
    <div class="topbar">${coinsHTML()}<div class="star-total">★ ${totalStars()}</div><button class="icon-btn" data-a="settings" aria-label="${t('settings')}">⚙️</button></div>
    <div class="logo">
      <div class="logo-hi">मसाला यात्रा</div>
      <div class="logo-en">Masala Yatra</div>
      <div class="tagline">${t('tagline')}</div>
    </div>
    <canvas class="hero" width="320" height="220" aria-hidden="true"></canvas>
    <button class="btn primary big play-btn" data-a="play">
      <span>${done ? t('map') : t('play')}</span>
      <small>${done ? '' : `${t('levelN', { n: next })} · ${L(city)}`}</small>
    </button>
    <div class="home-cards">
      <button class="card daily ${dailyDone ? 'done' : ''}" data-a="daily"><span class="c-ico">🍽️</span><b>${t('daily')}</b><small>${dailyDone ? t('dailyDone') : save.daily.streak ? t('streak', { n: save.daily.streak }) : t('dailySub')}</small></button>
      <button class="card" data-a="diary"><span class="c-ico">📖</span><b>${t('diary')}</b><small>${t('diarySub', { n: save.recipes.length, t: CITIES.length })}</small></button>
      <button class="card" data-a="map"><span class="c-ico">🗺️</span><b>${t('map')}</b><small>${L(city)}</small></button>
      <button class="card" data-a="shelf"><span class="c-ico">🧺</span><b>${t('shelf')}</b><small>🥄${save.boosters.spoon} ✋${save.boosters.hand} 🔀${save.boosters.shuffle}</small></button>
    </div>
    <p class="footnote">${t('noLives')}</p>`;
  drawHero($('.hero', el));
  el.querySelector('[data-a="play"]').onclick = () => { sound.tap(); done ? openMap() : openPreLevel(getLevel(next)); };
  el.querySelector('[data-a="daily"]').onclick = () => { sound.tap(); openDaily(); };
  el.querySelector('[data-a="diary"]').onclick = () => { sound.tap(); openDiary(); };
  el.querySelector('[data-a="map"]').onclick = () => { sound.tap(); openMap(); };
  el.querySelector('[data-a="shelf"]').onclick = () => { sound.tap(); openShelf().then(renderHome); };
  el.querySelector('[data-a="settings"]').onclick = () => { sound.tap(); openSettings(); };
}

function drawHero(cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 320, H = 220;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  // brass thali
  const g = ctx.createRadialGradient(W / 2 - 30, H / 2 - 30, 10, W / 2, H / 2, 110);
  g.addColorStop(0, '#fff1c1'); g.addColorStop(0.6, '#e8b04a'); g.addColorStop(1, '#a8701e');
  ctx.fillStyle = 'rgba(90,40,0,0.25)';
  ctx.beginPath(); ctx.ellipse(W / 2, H / 2 + 10, 120, 92, 0, 0, 7); ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 118, 90, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 100, 76, 0, 0, 7); ctx.stroke();
  const px = Math.round(64 * dpr);
  const spots = [[0, -60, -38], [1, 0, -52], [2, 60, -38], [3, -72, 18], [4, 72, 18], [5, -26, 40], [-1, 30, 40]];
  for (const [c, x, y] of spots) {
    const spr = c < 0 ? tileSprite(0, 'dabba', px) : tileSprite(c, null, px);
    ctx.drawImage(spr, W / 2 + x - 32, H / 2 + y - 32, 64, 64);
  }
}

// ---------- map ----------
function openMap(focusLevel) {
  show('map');
  const el = $('#screen-map');
  const sections = CITIES.map((city, ci) => {
    const first = ci * LEVELS_PER_CITY + 1;
    const unlockedCity = save.unlocked >= first;
    const cityStars = Array.from({ length: LEVELS_PER_CITY }, (_, i) => save.stars[first + i] || 0).reduce((a, b) => a + b, 0);
    const nodes = Array.from({ length: LEVELS_PER_CITY }, (_, i) => {
      const n = first + i;
      const st = save.stars[n] || 0;
      const state = n < save.unlocked ? 'done' : n === save.unlocked ? 'current' : 'locked';
      const sig = i === LEVELS_PER_CITY - 1;
      return `<button class="node ${state} ${sig ? 'sig' : ''}" data-n="${n}" ${state === 'locked' ? 'disabled' : ''} aria-label="${t('levelN', { n })}">
        <span class="node-n">${sig ? '🍛' : n}</span>
        <span class="node-stars">${[1, 2, 3].map((s) => `<i class="${s <= st ? 'on' : ''}">★</i>`).join('')}</span>
        ${state === 'current' ? '<span class="pin">👩🏽‍🍳</span>' : ''}
      </button>`;
    }).join('');
    const recipeHave = save.recipes.includes(city.id);
    return `
      <section class="city ${unlockedCity ? '' : 'locked'}" style="--tint1:${city.tint[0]};--tint2:${city.tint[1]}" data-city="${city.id}">
        <div class="city-recipe ${recipeHave ? 'have' : ''}" data-recipe="${city.id}">📖 ${recipeHave ? L(city.recipe) : t('recipeTease')}</div>
        ${unlockedCity ? `<div class="path">${nodes}</div>` : `<div class="city-teaser"><b>${t('nextStop')}</b> · ${t('unlockAfter', { city: L(CITIES[ci - 1]) })}<br><span>${t('signature')}: ${ci === Math.floor((save.unlocked - 1) / LEVELS_PER_CITY) + 1 ? L(city.dishes[4]) : '???'}</span></div>`}
        <div class="city-head">
          <div><h3>${L(city)}</h3><p>${L(city.blurb)}</p></div>
          <div class="city-meta">${unlockedCity ? `★ ${cityStars}/${LEVELS_PER_CITY * 3}` : '🔒'}</div>
        </div>
      </section>`;
  }).reverse().join('');
  el.innerHTML = `
    <div class="topbar"><button class="icon-btn" data-a="back" aria-label="Back">←</button><h2>${t('map')}</h2>${coinsHTML()}</div>
    <div class="map-scroll">
      <div class="coming-soon">✨ ${getLang() === 'hi' ? 'और शहर जल्द आ रहे हैं…' : 'More cities coming soon…'}</div>
      ${sections}
    </div>`;
  $('[data-a="back"]', el).onclick = () => { sound.tap(); goHome(); };
  $$('.node', el).forEach((b) => b.addEventListener('click', () => { sound.tap(); openPreLevel(getLevel(Number(b.dataset.n))); }));
  $$('.city-recipe.have', el).forEach((b) => b.addEventListener('click', () => openRecipe(CITIES.find((c) => c.id === b.dataset.recipe))));
  const target = $(`.node[data-n="${focusLevel || Math.min(save.unlocked, TOTAL_LEVELS)}"]`, el);
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'center' }));
}

// ---------- pre-level ----------
function openPreLevel(level) {
  const city = CITIES[level.cityIndex];
  const m = openModal(`
    <div class="prelevel" style="--tint1:${city.tint[0]};--tint2:${city.tint[1]}">
      <div class="pre-head"><small>${level.daily ? t('daily') : L(city)}</small><h2>${level.daily ? level.dailyKey : t('levelN', { n: level.n })}</h2>${level.signature ? `<span class="sig-tag">★ ${t('signature')}</span>` : ''}</div>
      <div class="pre-dishes">${level.dishes.map((d) => `
        <div class="pre-dish"><small>${t('cookFor', { guest: L(d.guest) })}</small><b>${L(d)}</b>
          <div class="pre-items">${d.items.map((it) => `<span><img src="${iconURL(it.kind === 'ing' ? String(it.color) : it.kind, 64)}" alt="">×${it.need}</span>`).join('')}</div>
        </div>`).join('')}</div>
      <div class="pre-info"><span>🔁 ${level.moves} ${t('moves')}</span><span>${t('starsRule', { n: level.stars[1] })}</span></div>
      <button class="btn primary big wide" data-a="go">${t('start')}</button>
    </div>`);
  $('[data-a="go"]', m.el).onclick = () => { sound.tap(); m.close(); enterLevel(level); };
}

function enterLevel(level, attempt = 1) {
  show('game');
  if (!game) game = new GameScreen($('#screen-game'), gameHooks);
  game.start(level, { attempt });
  levelsThisSession++;
}

const gameHooks = {
  toMap: (n) => { maybeBreak(() => openMap(n)); },
  home: () => goHome(),
  next: (level) => {
    maybeBreak(() => {
      if (level.n >= TOTAL_LEVELS) { goHome(); choose(`<h2>🎉</h2><p>${t('allDone')}</p>`, [{ id: 'ok', label: t('ok'), cls: 'primary' }]); return; }
      const nextLevel = getLevel(level.n + 1);
      if (nextLevel.cityIndex !== level.cityIndex) openMap(level.n + 1);
      else openPreLevel(nextLevel);
    });
  },
  afterWin: async (level) => {
    refreshCoins();
    if (level.daily) return dailyReward(level);
    const city = CITIES[level.cityIndex];
    if (level.signature && !save.recipes.includes(city.id)) {
      save.recipes.push(city.id);
      commit(true);
      analytics.track('recipe_unlock', { city: city.id });
      await recipeUnlocked(city);
    }
  },
  openShelf: (type) => openShelf(type),
};

// ---------- recipes ----------
function recipeUnlocked(city) {
  return new Promise((resolve) => {
    const m = openModal(`
      <div class="recipe-unlock" style="--tint1:${city.tint[0]};--tint2:${city.tint[1]}">
        <div class="burst">📖</div>
        <h2>${t('recipeUnlocked')}</h2>
        <p>${t('recipeFrom', { city: L(city) })}</p>
        <div class="recipe-title">${L(city.recipe)}</div>
        <div class="modal-actions col">
          <button class="btn primary" data-a="open">${t('viewRecipe')}</button>
          <button class="btn ghost" data-a="go">${t('travel')}</button>
        </div>
      </div>`, { dismiss: false, onClose: resolve });
    confetti(m.el, 50);
    sound.win();
    $('[data-a="open"]', m.el).onclick = () => { m.close(); openRecipe(city).then(() => {}); };
    $('[data-a="go"]', m.el).onclick = () => m.close();
  });
}

function openRecipe(city) {
  return new Promise((resolve) => {
    const r = city.recipe;
    const m = openModal(`
      <div class="recipe" style="--tint1:${city.tint[0]};--tint2:${city.tint[1]}">
        <div class="recipe-head"><small>${L(city)}</small><h2>${L(r)}</h2><p>⏱ ${r.time} · 🍽 ${t('serves', { n: r.serves })}</p></div>
        <h4>${t('ingredients')}</h4>
        <ul>${r.ingredients.map((i) => `<li>${i}</li>`).join('')}</ul>
        <h4>${t('method')}</h4>
        <ol>${r.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
        <div class="tip">👵🏽 ${L(r.tip)}</div>
        <div class="modal-actions">
          <button class="btn" data-a="share">📤 ${getLang() === 'hi' ? 'शेयर करें' : 'Share'}</button>
          <button class="btn primary" data-a="close">${t('close')}</button>
        </div>
      </div>`, { cls: 'tall', onClose: resolve });
    $('[data-a="close"]', m.el).onclick = () => m.close();
    $('[data-a="share"]', m.el).onclick = async () => {
      const text = `${r.en} (${r.hi})\n\n${t('ingredients')}:\n- ${r.ingredients.join('\n- ')}\n\n${t('method')}:\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${r.tip.en}\n\n— from Masala Yatra 🍛`;
      analytics.track('recipe_share', { city: city.id });
      try {
        if (navigator.share) await navigator.share({ title: r.en, text });
        else { await navigator.clipboard.writeText(text); toast('Copied ✓'); }
      } catch { /* user cancelled */ }
    };
  });
}

function openDiary() {
  show('diary');
  const el = $('#screen-diary');
  el.innerHTML = `
    <div class="topbar"><button class="icon-btn" data-a="back" aria-label="Back">←</button><h2>${t('diary')}</h2><div class="pill">${save.recipes.length}/${CITIES.length}</div></div>
    <div class="diary-grid">${CITIES.map((c) => {
      const have = save.recipes.includes(c.id);
      return `<button class="recipe-card ${have ? 'have' : 'locked'}" data-id="${c.id}" style="--tint1:${c.tint[0]};--tint2:${c.tint[1]}" ${have ? '' : 'disabled'}>
        <small>${L(c)}</small><b>${have ? L(c.recipe) : '???'}</b><span>${have ? `⏱ ${c.recipe.time}` : '🔒 ' + t('unlockAfter', { city: L(c) })}</span>
      </button>`;
    }).join('')}</div>`;
  $('[data-a="back"]', el).onclick = () => { sound.tap(); goHome(); };
  $$('.recipe-card.have', el).forEach((b) => b.addEventListener('click', () => openRecipe(CITIES.find((c) => c.id === b.dataset.id))));
}

// ---------- shelf (booster shop) ----------
function openShelf(focus) {
  return new Promise((resolve) => {
    const render = () => `
      <h2>🧺 ${t('shelf')}</h2>
      <div class="shelf-coins">${coinsHTML()}</div>
      <div class="shelf">${Object.keys(BOOSTER_COST).map((b) => `
        <div class="shelf-item ${focus === b ? 'focus' : ''}">
          <div class="s-ico">${BOOSTER_ICON[b]}<span>${save.boosters[b]}</span></div>
          <div class="s-txt"><b>${t(b)}</b><small>${t(b + 'Desc')}</small></div>
          <div class="s-buy">
            <button class="btn small coin" data-buy="${b}">🪙 ${BOOSTER_COST[b]}</button>
            ${ads.canOffer('booster', save.unlocked) ? `<button class="btn small ad" data-ad="${b}">${t('freeAd')}</button>` : ''}
          </div>
        </div>`).join('')}</div>
      <p class="fine">${ads.remaining('booster') ? t('adsLeft', { n: ads.remaining('booster') }) : ''}</p>
      <div class="modal-actions"><button class="btn primary" data-a="close">${t('close')}</button></div>`;
    const m = openModal(render(), { onClose: () => { refreshCoins(); resolve(); } });
    const bind = () => {
      $('[data-a="close"]', m.el).onclick = () => m.close();
      $$('[data-buy]', m.el).forEach((btn) => btn.onclick = () => {
        const b = btn.dataset.buy;
        if (save.coins < BOOSTER_COST[b]) { toast(t('notEnough')); return; }
        save.coins -= BOOSTER_COST[b];
        save.boosters[b]++;
        commit(true);
        sound.coin();
        analytics.track('booster_get', { booster: b, source: 'coins' });
        m.el.innerHTML = render(); bind();
      });
      $$('[data-ad]', m.el).forEach((btn) => btn.onclick = async () => {
        const b = btn.dataset.ad;
        btn.disabled = true;
        const res = await ads.showRewarded('booster', { booster: b });
        if (res.rewarded) {
          save.boosters[b]++;
          commit(true);
          sound.coin();
          analytics.track('booster_get', { booster: b, source: 'ad' });
          toast(t('adThanks'));
        } else if (res.reason !== 'closed') toast(t('noAd'));
        m.el.innerHTML = render(); bind();
      });
    };
    bind();
  });
}

// ---------- daily thali, gift, streaks ----------
function openDaily() {
  const key = todayKey();
  const lvl = getDailyLevel(key);
  if (save.daily.lastWin === key) toast(t('dailyDone'));
  openPreLevel(lvl);
}

function dayDiff(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

async function dailyReward(level) {
  const key = level.dailyKey;
  if (save.daily.lastWin === key) return; // already rewarded today
  const gap = save.daily.lastWin ? dayDiff(save.daily.lastWin, key) : 99;
  const week = key.slice(0, 8) + String(Math.floor((Number(key.slice(8)) - 1) / 7));
  if (gap === 1) save.daily.streak++;
  else if (gap === 2 && save.daily.graceUsedWeek !== week) { save.daily.streak++; save.daily.graceUsedWeek = week; } // one forgiving miss per week
  else save.daily.streak = 1;
  save.daily.best = Math.max(save.daily.best, save.daily.streak);
  save.daily.lastWin = key;
  const reward = 40 + 5 * Math.min(save.daily.streak, 7);
  save.coins += reward;
  commit(true);
  analytics.track('daily_win', { streak: save.daily.streak });
  await choose(`<div class="center"><div class="big-emoji">🍽️</div><h2>${t('daily')}</h2><p>${t('streak', { n: save.daily.streak })}</p><div class="win-coins">🪙 +${reward}</div></div>`, [{ id: 'ok', label: t('ok'), cls: 'primary' }]);
}

function maybeGift() {
  const key = todayKey();
  if (save.gift.lastClaim === key || !save.privacyAccepted) return;
  const canAd = ads.canOffer('daily', save.unlocked) && save.unlocked >= 5;
  const m = openModal(`
    <div class="center gift">
      <div class="big-emoji">🎁</div>
      <h2>${t('gift')}</h2>
      <p>${t('giftBody')}</p>
      <div class="win-coins">🪙 +30</div>
      <div class="modal-actions col">
        <button class="btn primary" data-a="claim">${t('claim')}</button>
        ${canAd ? `<button class="btn ad" data-a="ad">${t('giftAdMore')}</button>` : ''}
      </div>
    </div>`, { dismiss: false });
  const claim = () => {
    save.gift.lastClaim = key;
    save.coins += 30;
    commit(true);
    analytics.track('gift_claim', { day: key });
    sound.coin();
    refreshCoins();
  };
  $('[data-a="claim"]', m.el).onclick = () => { claim(); m.close(); renderHome(); };
  const adBtn = $('[data-a="ad"]', m.el);
  if (adBtn) adBtn.onclick = async () => {
    adBtn.disabled = true;
    const res = await ads.showRewarded('daily', {});
    if (res.rewarded) { save.boosters.spoon++; toast(t('adThanks')); }
    claim(); m.close(); renderHome();
  };
}

// ---------- healthy play: chai break ----------
function maybeBreak(then) {
  const minutes = Math.floor(activeMs / 60000);
  if (!save.settings.breakReminder || activeMs - lastBreakAt < BREAK_MINUTES * 60000) { then(); return; }
  lastBreakAt = activeMs;
  analytics.track('break_prompt', { minutes });
  const m = openModal(`
    <div class="center">
      <div class="big-emoji">☕</div>
      <h2>${t('breakTitle')}</h2>
      <p>${t('breakBody', { m: minutes })}</p>
      <div class="modal-actions col">
        <button class="btn primary" data-a="take">${t('breakTake')}</button>
        <button class="btn ghost" data-a="keep">${t('breakKeep')}</button>
      </div>
    </div>`, { dismiss: false });
  $('[data-a="take"]', m.el).onclick = () => {
    m.close();
    analytics.track('break_taken', { minutes });
    goHome();
    toast(t('breakBye'), 4000);
  };
  $('[data-a="keep"]', m.el).onclick = () => { m.close(); then(); };
}

// ---------- settings ----------
function openSettings() {
  const tg = (k, label) => `<label class="toggle"><span>${label}</span><input type="checkbox" data-k="${k}" ${save.settings[k] ? 'checked' : ''}></label>`;
  const m = openModal(`
    <h2>⚙️ ${t('settings')}</h2>
    <div class="lang-switch"><span>${t('language')}</span>
      <button class="btn small ${getLang() === 'en' ? 'primary' : ''}" data-lang="en">English</button>
      <button class="btn small ${getLang() === 'hi' ? 'primary' : ''}" data-lang="hi">हिंदी</button>
    </div>
    <div class="toggles">
      ${tg('sfx', t('sound'))}${tg('music', t('music'))}${tg('haptics', t('haptics'))}${tg('reduceMotion', t('reduceMotion'))}${tg('breakReminder', t('breakReminder'))}
    </div>
    <h4>${t('privacy')}</h4>
    <div class="toggles">${tg('analytics', t('analyticsToggle'))}${tg('personalizedAds', t('personalAds'))}</div>
    <p class="fine">${t('privacyBody')}</p>
    <details class="debug"><summary>${t('events')}</summary><pre>${analytics.recent.slice(-15).reverse().map((e) => `${new Date(e.ts).toLocaleTimeString()} ${e.name} ${JSON.stringify(e.params)}`).join('\n') || '—'}</pre></details>
    <p class="fine">${t('about')}</p>
    <div class="modal-actions">
      <button class="btn ghost danger" data-a="reset">${t('reset')}</button>
      <button class="btn primary" data-a="close">${t('close')}</button>
    </div>`, { cls: 'tall' });
  $$('input[data-k]', m.el).forEach((inp) => inp.addEventListener('change', () => {
    const k = inp.dataset.k;
    save.settings[k] = inp.checked;
    commit(true);
    if (k === 'sfx') sound.setSfx(inp.checked);
    if (k === 'music') { sound.unlock(); sound.setMusic(inp.checked); }
    if (k === 'analytics') analytics.setEnabled(inp.checked);
    analytics.track('setting_change', { key: k, value: inp.checked });
  }));
  $$('[data-lang]', m.el).forEach((b) => b.onclick = () => {
    save.settings.lang = b.dataset.lang;
    setLang(b.dataset.lang);
    commit(true);
    m.close();
    rebuildForLanguage();
    openSettings();
  });
  $('[data-a="close"]', m.el).onclick = () => m.close();
  $('[data-a="reset"]', m.el).onclick = async () => {
    const ok = await choose(`<p>${t('resetConfirm')}</p>`, [{ id: 'no', label: t('no') }, { id: 'yes', label: t('yes'), cls: 'danger' }]);
    if (ok === 'yes') { resetSave(); location.reload(); }
  };
}

function rebuildForLanguage() {
  game = null;
  $('#screen-game').innerHTML = '';
  if (current === 'map') openMap(); else if (current === 'diary') openDiary(); else goHome();
}

// ---------- first run ----------
function welcome() {
  return new Promise((resolve) => {
    const m = openModal(`
      <div class="welcome center">
        <div class="big-emoji">🙏</div>
        <h2>Namaste! · नमस्ते!</h2>
        <p>${t('chooseLang')} · अपनी भाषा चुनें</p>
        <div class="modal-actions">
          <button class="btn primary" data-lang="en">English</button>
          <button class="btn primary" data-lang="hi">हिंदी</button>
        </div>
      </div>`, { dismiss: false });
    $$('[data-lang]', m.el).forEach((b) => b.onclick = () => {
      save.settings.lang = b.dataset.lang;
      setLang(b.dataset.lang);
      m.close();
      const p = openModal(`
        <div class="welcome center">
          <h2>${t('welcome')}</h2>
          <p>${t('welcomeBody')}</p>
          <p class="fine">${t('privacyBody')}</p>
          <div class="toggles">
            <label class="toggle"><span>${t('analyticsToggle')}</span><input type="checkbox" data-k="analytics" checked></label>
            <label class="toggle"><span>${t('personalAds')}</span><input type="checkbox" data-k="personalizedAds"></label>
          </div>
          <button class="btn primary big wide" data-a="go">${t('letsCook')}</button>
        </div>`, { dismiss: false });
      $('[data-a="go"]', p.el).onclick = () => {
        $$('input[data-k]', p.el).forEach((inp) => { save.settings[inp.dataset.k] = inp.checked; });
        save.privacyAccepted = true;
        commit(true);
        analytics.setEnabled(save.settings.analytics);
        analytics.track('privacy_accepted', { analytics: save.settings.analytics, personalized: save.settings.personalizedAds });
        p.close();
        resolve();
      };
    });
  });
}

function goHome() {
  closeAllModals();
  show('home');
  renderHome();
}

// ---------- boot ----------
async function boot() {
  setLang(save.settings.lang || ((navigator.language || '').startsWith('hi') ? 'hi' : 'en'));
  analytics.init({ enabled: save.settings.analytics });
  sound.setSfx(save.settings.sfx);
  sound.setMusic(save.settings.music);
  ads.init(save, () => commit());
  const first = !save.privacyAccepted;
  save.stats.sessions++;
  commit();
  analytics.track('app_open', { first, sessions: save.stats.sessions, level: save.unlocked, day_index: Math.floor((Date.now() - save.stats.firstOpen) / 86400000) });

  const unlockAudio = () => sound.unlock();
  window.addEventListener('pointerdown', unlockAudio, { capture: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sound.suspend();
      commit(true);
      analytics.track('session_end', { duration_s: Math.round(activeMs / 1000), levels_played: levelsThisSession });
    } else {
      lastTick = Date.now();
      sound.resume();
    }
  });
  setInterval(() => {
    const now = Date.now();
    if (!document.hidden && current === 'game') activeMs += Math.min(now - lastTick, 5000);
    lastTick = now;
  }, 1000);

  const App = window.Capacitor?.Plugins?.App;
  if (App) {
    App.addListener('backButton', () => {
      if (backModal()) return;
      if (current === 'game') { game && game.pause(); return; }
      if (current !== 'home') { goHome(); return; }
      App.exitApp();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (backModal()) return;
    if (current === 'game') game && game.pause();
    else if (current !== 'home') goHome();
  });

  $('#splash')?.classList.add('hide');
  setTimeout(() => $('#splash')?.remove(), 600);
  goHome();
  if (first) {
    await welcome();
    renderHome();
    // straight into level 1 — the best tutorial is playing
    openPreLevel(getLevel(1));
  } else {
    maybeGift();
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.hostname.match(/^(localhost|127\.)/)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.__my = { save, getLevel, enterLevel, openMap, goHome, get game() { return game; } };
}

boot();
