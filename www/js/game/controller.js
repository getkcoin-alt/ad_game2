// The in-level screen: HUD, dish orders, boosters, tadka pan, tutorials, win/lose flows.

import { GameSession, creditPhase, TADKA_MAX, AD_EXTRA_MOVES } from './session.js';
import { BoardView } from '../render/view.js';
import { iconURL } from '../render/art.js';
import { sound } from '../audio.js';
import { ads } from '../ads.js';
import { analytics } from '../analytics.js';
import { t, L, getLang } from '../i18n.js';
import { save, commit, $, $$, openModal, toast, haptic, confetti, animateNumber, hasModal } from '../ui.js';
import { CITIES, INTRODUCTIONS } from '../engine/content.js';

export const BOOSTER_COST = { spoon: 120, hand: 150, shuffle: 80 };
export const CONTINUE_COST = 250;
const BOOSTERS = ['spoon', 'hand', 'shuffle'];
const BOOSTER_ICON = { spoon: '🥄', hand: '✋', shuffle: '🔀' };
export { BOOSTER_ICON };

const KADHAI = `<svg viewBox="0 0 100 70" class="kadhai" aria-hidden="true">
  <defs><linearGradient id="kd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#1d1d1d"/></linearGradient></defs>
  <g class="flames"><path d="M30 64 q4-14 10-6 q2-12 8-2 q4-10 8 0 q6-8 8 6z" fill="#ff7b00"/><path d="M38 64 q4-9 8-3 q3-8 6 0 q4-6 6 3z" fill="#ffd000"/></g>
  <path d="M8 22 h84 q-4 30 -42 32 q-38 -2 -42 -32z" fill="url(#kd)"/>
  <rect x="0" y="18" width="14" height="6" rx="3" fill="#333"/><rect x="86" y="18" width="14" height="6" rx="3" fill="#333"/>
  <ellipse cx="50" cy="22" rx="42" ry="6" fill="#6b4a1e"/>
  <g class="seeds" fill="#2b1a0a"><circle cx="38" cy="21" r="1.6"/><circle cx="46" cy="23" r="1.6"/><circle cx="55" cy="21" r="1.6"/><circle cx="62" cy="23" r="1.6"/></g>
</svg>`;

const INTRO_ICONS = {
  basics: ['0', '1', '2'], rowpin: ['0:row', '0:col'], tadka: null, cooker: ['1:cooker'], dough: ['dough'],
  dabba: ['0:dabba'], combo: ['2:row', '3:cooker'], lock: ['lock'], sixth: ['5'],
};

export class GameScreen {
  constructor(root, hooks) {
    this.root = root;
    this.hooks = hooks; // { toMap(level), next(level), afterWin(level, stars) → Promise, openShelf(type) → Promise, home() }
    root.innerHTML = `
      <canvas class="board-canvas"></canvas>
      <header class="hud-top">
        <button class="icon-btn hud-pause" aria-label="Pause">❚❚</button>
        <div class="hud-level"></div>
        <div class="hud-moves"><b class="moves-num">0</b><small>${t('moves')}</small></div>
      </header>
      <div class="orders"></div>
      <footer class="hud-bottom">
        <div class="boosters">${BOOSTERS.map((b) => `<button class="booster" data-b="${b}" aria-label="${t(b)}"><span class="b-ico">${BOOSTER_ICON[b]}</span><span class="b-cnt"></span><span class="b-name">${t(b)}</span></button>`).join('')}</div>
        <button class="tadka-btn" aria-label="${t('tadka')}">
          <div class="tadka-meter"><i></i></div>${KADHAI}<span class="tadka-label">${t('tadka')}</span>
        </button>
      </footer>
      <div class="mode-banner" hidden><span></span><button class="btn small">${t('cancel')}</button></div>`;
    this.canvas = $('.board-canvas', root);
    this.mode = 'swap';
    this.busy = false;
    this.view = new BoardView(this.canvas, {
      audio: sound,
      haptics: haptic,
      lang: getLang,
      reduceMotion: () => save.settings.reduceMotion,
      boardArea: () => this._boardArea(),
      getTarget: (color) => this._targetFor(color),
      neededColors: () => this.session.neededColors(),
      onSwap: (a, b) => this.handleSwap(a, b),
      onTap: (cell) => this.handleTap(cell),
      onInteract: () => { this.lastInteract = Date.now(); this.view.clearHint(); },
      onPhase: (p) => this._onPhase(p),
    });
    $('.hud-pause', root).addEventListener('click', () => this.pause());
    $$('.booster', root).forEach((el) => el.addEventListener('click', () => this.useBooster(el.dataset.b)));
    $('.tadka-btn', root).addEventListener('click', () => this.useTadka());
    $('.mode-banner button', root).addEventListener('click', () => this.setMode('swap'));
    this._onResize = () => { if (this.session) this.view.relayout(); };
    window.addEventListener('resize', this._onResize);
    this._idleTimer = setInterval(() => this._idleTick(), 1000);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    clearInterval(this._idleTimer);
    this.root.innerHTML = '';
  }

  // ---------- lifecycle ----------
  start(level, { attempt = 1 } = {}) {
    this.level = level;
    this.attempt = attempt;
    this.session = new GameSession(level, { seedOffset: attempt - 1 });
    this.shown = this.session.dishes.map((d) => ({ ...d, items: d.items.map((it) => ({ ...it })) }));
    this.adContinueUsed = false;
    this.coinContinues = 0;
    this.startTime = Date.now();
    this.lastInteract = Date.now();
    this.ended = false;
    this.tadkaHinted = false;
    this.setMode('swap');
    const city = CITIES[level.cityIndex];
    this.root.style.setProperty('--tint1', city.tint[0]);
    this.root.style.setProperty('--tint2', city.tint[1]);
    $('.hud-level', this.root).innerHTML = level.daily
      ? `<b>${t('daily')}</b><small>${level.dailyKey}</small>`
      : `<b>${t('levelN', { n: level.n })}</b><small>${L(city)}${level.signature ? ' · ★ ' + t('signature') : ''}</small>`;
    this._renderOrders();
    this._updateMoves();
    this._updateBoosters();
    this._updateTadka();
    requestAnimationFrame(() => {
      this.view.attach(this.session);
      this._maybeIntro();
    });
    analytics.track('level_start', { level: level.n, daily: !!level.daily, attempt, city: level.cityId });
  }

  _boardArea() {
    const cv = this.canvas.getBoundingClientRect();
    const top = $('.orders', this.root).getBoundingClientRect().bottom - cv.top + 4;
    const bottom = $('.hud-bottom', this.root).getBoundingClientRect().top - cv.top - 4;
    return { top, bottom };
  }

  _targetFor(color) {
    const items = $$(`.item[data-kind="ing"][data-color="${color}"]`, this.root);
    const el = items.find((i) => !i.classList.contains('done')) || items[0];
    if (!el) return null;
    const r = el.getBoundingClientRect(), cv = this.canvas.getBoundingClientRect();
    return { x: r.left + r.width / 2 - cv.left, y: r.top + r.height / 2 - cv.top };
  }

  // ---------- HUD ----------
  _renderOrders() {
    const box = $('.orders', this.root);
    box.innerHTML = this.shown.map((d, i) => `
      <div class="dish" data-i="${i}">
        <div class="dish-guest">${t('cookFor', { guest: L(d.guest) })}</div>
        <div class="dish-name">${L(d)}</div>
        <div class="dish-items">${d.items.map((it, j) => `
          <div class="item" data-kind="${it.kind}" data-color="${it.kind === 'ing' ? it.color : ''}" data-j="${j}">
            <img src="${iconURL(it.kind === 'ing' ? String(it.color) : it.kind, 72)}" alt="">
            <b>${it.need - it.got}</b><i class="tick">✓</i>
          </div>`).join('')}
        </div>
      </div>`).join('');
  }

  _updateOrders() {
    this.shown.forEach((d, i) => {
      const card = $(`.dish[data-i="${i}"]`, this.root);
      let done = true;
      d.items.forEach((it, j) => {
        const el = $(`.item[data-j="${j}"]`, card);
        const left = Math.max(0, it.need - it.got);
        const b = $('b', el);
        if (b.textContent !== String(left)) {
          b.textContent = left;
          el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        }
        el.classList.toggle('done', left === 0);
        if (left > 0) done = false;
      });
      if (done && !card.classList.contains('done')) { card.classList.add('done'); sound.ding(); }
    });
  }

  _onPhase(p) {
    if (p.kind !== 'clear') return;
    creditPhase(this.shown, p);
    this._updateOrders();
  }

  _syncShown() {
    this.shown = this.session.dishes.map((d) => ({ ...d, items: d.items.map((it) => ({ ...it })) }));
    this._updateOrders();
  }

  _updateMoves() {
    const el = $('.moves-num', this.root);
    el.textContent = this.session.movesLeft;
    $('.hud-moves', this.root).classList.toggle('low', this.session.movesLeft <= 3);
  }

  _updateBoosters() {
    $$('.booster', this.root).forEach((el) => {
      const n = save.boosters[el.dataset.b] || 0;
      $('.b-cnt', el).textContent = n > 0 ? n : '+';
      el.classList.toggle('empty', n <= 0);
      el.classList.toggle('active', this.mode === el.dataset.b);
    });
  }

  _updateTadka() {
    const ratio = Math.min(1, this.session.tadka / TADKA_MAX);
    const btn = $('.tadka-btn', this.root);
    $('.tadka-meter i', btn).style.height = `${ratio * 100}%`;
    const ready = this.session.tadkaReady();
    btn.classList.toggle('ready', ready);
    if (ready && !this.tadkaHinted) { this.tadkaHinted = true; toast(t('tadkaReady')); }
  }

  setMode(mode) {
    this.mode = mode;
    this.view.mode = mode === 'spoon' ? 'spoon' : 'swap';
    const banner = $('.mode-banner', this.root);
    banner.hidden = mode === 'swap';
    if (mode !== 'swap') $('span', banner).textContent = mode === 'spoon' ? t('tapToUse') : t('tapTwo');
    this._updateBoosters();
  }

  // ---------- actions ----------
  async handleSwap(a, b) {
    if (this.busy || this.view.busy || this.session.state !== 'playing') return;
    this.lastInteract = Date.now();
    let res;
    if (this.mode === 'hand') {
      res = this.session.useHand(a, b);
      if (res.ok) this._consume('hand');
    } else if (this.mode === 'spoon') {
      return;
    } else {
      res = this.session.swap(a, b);
    }
    if (!res.ok) {
      if (res.reason === 'noMatch') await this.view.animateInvalid(a, b);
      return;
    }
    if (this.mode === 'hand') this.setMode('swap');
    this._updateMoves();
    await this._play(res.phases);
    this._afterTurn();
  }

  async handleTap([r, c]) {
    if (this.mode !== 'spoon' || this.busy) return;
    const res = this.session.useSpoon(r, c);
    if (!res.ok) return;
    this._consume('spoon');
    this.setMode('swap');
    await this._play(res.phases);
    this._afterTurn();
  }

  _consume(type) {
    save.boosters[type] = Math.max(0, (save.boosters[type] || 0) - 1);
    commit();
    analytics.track('booster_use', { booster: type, level: this.level.n });
    this._updateBoosters();
  }

  async useBooster(type) {
    if (this.busy || this.view.busy || this.session.state !== 'playing') return;
    sound.tap();
    if (this.mode === type) { this.setMode('swap'); return; }
    if ((save.boosters[type] || 0) <= 0) {
      await this.hooks.openShelf(type);
      this._updateBoosters();
      return;
    }
    if (type === 'shuffle') {
      const res = this.session.useShuffle();
      this._consume('shuffle');
      await this._play(res.phases);
      this._afterTurn();
      return;
    }
    this.setMode(type);
  }

  async useTadka() {
    if (this.busy || this.view.busy) return;
    if (!this.session.tadkaReady()) { toast(t('tadkaHelp'), 3500); return; }
    const res = this.session.useTadka();
    if (!res.ok) return;
    analytics.track('tadka_use', { level: this.level.n });
    haptic(40);
    this._updateTadka();
    await this._play(res.phases);
    this._afterTurn();
  }

  async _play(phases) {
    this.busy = true;
    try {
      await this.view.play(phases);
    } finally {
      this.busy = false;
    }
  }

  _afterTurn() {
    this._syncShown();
    this._updateTadka();
    this._updateMoves();
    if (this.session.state === 'won') this._win();
    else if (this.session.state === 'lost') this._lose();
  }

  _idleTick() {
    if (!this.session || this.session.state !== 'playing' || this.busy || this.view.busy || this.view.hint || hasModal()) return;
    if (!this.root.classList.contains('active')) return;
    const delay = this.level.n <= 2 && !this.level.daily ? 2500 : 7000;
    if (Date.now() - this.lastInteract > delay) this.view.showHint(this.session.board.findHint());
  }

  // ---------- tutorials ----------
  _maybeIntro() {
    if (this.level.daily) return;
    const key = INTRODUCTIONS[this.level.n];
    if (!key || save.seenIntros.includes(key)) return;
    const icons = INTRO_ICONS[key];
    const art = icons ? icons.map((k) => `<img src="${iconURL(k, 120)}" alt="">`).join('') : KADHAI;
    const m = openModal(`
      <div class="intro">
        <div class="dadi-badge">👵🏽 ${t('dadiSays')}</div>
        <div class="intro-art ${icons ? '' : 'pan'}">${art}</div>
        <p>${t('intro_' + key)}</p>
        <button class="btn primary wide">${t('gotIt')}</button>
      </div>`, { dismiss: false, cls: 'intro-modal' });
    $('button', m.el).addEventListener('click', () => {
      m.close();
      save.seenIntros.push(key);
      commit();
      analytics.track('tutorial_step', { level: this.level.n, step: key });
      if (key === 'tadka') { this.session.tadka = TADKA_MAX; this._updateTadka(); }
      this.lastInteract = Date.now() - 5000;
    });
  }

  // ---------- pause ----------
  pause() {
    if (this.busy) return;
    sound.tap();
    const m = openModal(`
      <h2>${t('pause')}</h2>
      <div class="toggles">
        <label class="toggle"><span>${t('sound')}</span><input type="checkbox" data-k="sfx" ${save.settings.sfx ? 'checked' : ''}></label>
        <label class="toggle"><span>${t('music')}</span><input type="checkbox" data-k="music" ${save.settings.music ? 'checked' : ''}></label>
        <label class="toggle"><span>${t('haptics')}</span><input type="checkbox" data-k="haptics" ${save.settings.haptics ? 'checked' : ''}></label>
      </div>
      <div class="modal-actions col">
        <button class="btn primary" data-a="resume">${t('resume')}</button>
        <button class="btn" data-a="restart">${t('restart')}</button>
        <button class="btn ghost" data-a="quit">${t('quit')}</button>
      </div>
      <p class="fine">${t('quitWarn')}</p>`);
    $$('input[data-k]', m.el).forEach((inp) => inp.addEventListener('change', () => {
      save.settings[inp.dataset.k] = inp.checked;
      if (inp.dataset.k === 'sfx') sound.setSfx(inp.checked);
      if (inp.dataset.k === 'music') sound.setMusic(inp.checked);
      commit();
    }));
    $('[data-a="resume"]', m.el).onclick = () => m.close();
    $('[data-a="restart"]', m.el).onclick = () => { m.close(); this._quitTrack(); this.start(this.level, { attempt: this.attempt + 1 }); };
    $('[data-a="quit"]', m.el).onclick = () => { m.close(); this._quitTrack(); this.exit(); };
  }

  _quitTrack() {
    if (!this.ended) analytics.track('level_quit', { level: this.level.n, moves_used: this.session.movesUsed, progress: Math.round(this.session.progressRatio() * 100) });
  }

  exit() {
    this.session.state = 'quit';
    if (this.level.daily) this.hooks.home(); else this.hooks.toMap(this.level.n);
  }

  // ---------- end of level ----------
  async _win() {
    if (this.ended) return;
    this.ended = true;
    const s = this.session, lvl = this.level;
    const stars = s.stars();
    let coins = s.coins();
    const firstClear = !lvl.daily && !save.stars[lvl.n];
    if (!lvl.daily) {
      save.stars[lvl.n] = Math.max(save.stars[lvl.n] || 0, stars);
      save.unlocked = Math.max(save.unlocked, lvl.n + 1);
      if (!firstClear) coins = Math.round(coins / 2); // replays still pay, just less
    }
    save.coins += coins;
    save.stats.levelsWon++;
    commit(true);
    analytics.track('level_win', { level: lvl.n, daily: !!lvl.daily, moves_left: s.movesLeft, stars, attempt: this.attempt, continues: s.continues, duration_s: Math.round((Date.now() - this.startTime) / 1000), best_cascade: s.bestCascade });
    sound.win();
    haptic(40);
    confetti(this.root, 70);
    this.view.floatText(t('win1'), this.view.W / 2, this.view.H * 0.45, { size: 44, color: '#fff3c4', stroke: '#c2185b', life: 1.4 });
    await new Promise((r) => setTimeout(r, 1100));
    this._winModal(stars, coins);
  }

  _winModal(stars, coins) {
    const lvl = this.level;
    const canDouble = ads.canOffer('double', lvl.n);
    const m = openModal(`
      <div class="win">
        <div class="ribbon">${t('win1')}</div>
        <div class="win-stars">${[1, 2, 3].map((i) => `<span class="star" data-i="${i}">★</span>`).join('')}</div>
        <p class="win-sub">${t('winSub')}</p>
        <div class="win-dishes">${this.session.dishes.map((d) => `<span>✓ ${L(d)}</span>`).join('')}</div>
        <div class="win-coins">🪙 <b>0</b></div>
        ${this.session.bestCascade >= 3 ? `<p class="fine">${t('bestCascade', { n: this.session.bestCascade })}</p>` : ''}
        <div class="modal-actions col">
          ${canDouble ? `<button class="btn ad" data-a="double">${t('doubleAd')}</button>` : ''}
          <button class="btn primary" data-a="next">${lvl.daily ? t('ok') : t('next')}</button>
          ${lvl.daily ? '' : `<button class="btn ghost" data-a="map">${t('map')}</button>`}
        </div>
      </div>`, { dismiss: false, cls: 'win-modal' });
    if (canDouble) analytics.track('ad_offer', { placement: 'double', level: lvl.n });
    const coinEl = $('.win-coins b', m.el);
    $$('.star', m.el).forEach((el, i) => {
      if (i < stars) setTimeout(() => { el.classList.add('on'); sound.star(i); haptic(15); }, 300 + i * 380);
    });
    setTimeout(() => { animateNumber(coinEl, 0, coins, 700); sound.coin(); }, 300 + stars * 380);
    const dbl = $('[data-a="double"]', m.el);
    if (dbl) dbl.onclick = async () => {
      dbl.disabled = true;
      const res = await ads.showRewarded('double', { level: lvl.n });
      if (res.rewarded) {
        save.coins += coins;
        commit(true);
        animateNumber(coinEl, coins, coins * 2, 700);
        sound.coin();
        dbl.textContent = '✓ 2×';
      } else {
        dbl.disabled = false;
        if (res.reason !== 'closed') toast(t('noAd'));
      }
    };
    const proceed = async (where) => {
      m.close();
      await this.hooks.afterWin(lvl, stars);
      if (where === 'map' || lvl.daily) this.exit();
      else this.hooks.next(lvl);
    };
    $('[data-a="next"]', m.el).onclick = () => proceed('next');
    const mapBtn = $('[data-a="map"]', m.el);
    if (mapBtn) mapBtn.onclick = () => proceed('map');
  }

  _lose() {
    const s = this.session, lvl = this.level;
    const progress = Math.round(s.progressRatio() * 100);
    analytics.track('level_fail', { level: lvl.n, daily: !!lvl.daily, progress, attempt: this.attempt, continues: s.continues });
    sound.lose();
    const canAd = !this.adContinueUsed && ads.canOffer('continue', lvl.n);
    const canCoins = this.coinContinues < 2;
    analytics.track('continue_offer', { level: lvl.n, progress, ad: canAd });
    const remaining = s.dishes.flatMap((d) => d.items.filter((it) => it.got < it.need))
      .map((it) => `<span class="rem"><img src="${iconURL(it.kind === 'ing' ? String(it.color) : it.kind, 56)}" alt=""><b>${it.need - it.got}</b></span>`).join('');
    const m = openModal(`
      <div class="lose">
        <h2>${t('lose')}</h2>
        <p>${t('loseSub', { p: progress })}</p>
        <div class="progress"><i style="width:${progress}%"></i></div>
        <div class="remaining">${remaining}</div>
        <div class="modal-actions col">
          ${canAd ? `<button class="btn ad" data-a="ad">${t('moreMovesAd')}</button>` : ''}
          ${canCoins ? `<button class="btn coin ${save.coins < CONTINUE_COST ? 'disabled' : ''}" data-a="coins">${t('moreMovesCoins', { c: CONTINUE_COST })}</button>` : ''}
          <button class="btn primary" data-a="retry">${t('retryFree')}</button>
          <button class="btn ghost" data-a="map">${lvl.daily ? t('close') : t('map')}</button>
        </div>
        <p class="fine">${t('noLives')}</p>
      </div>`, { dismiss: false });
    const cont = (method) => {
      m.close();
      s.addMoves(AD_EXTRA_MOVES);
      analytics.track('continue_accept', { level: lvl.n, method });
      this._updateMoves();
      toast(`+${AD_EXTRA_MOVES} ${t('moves')}`);
      this.lastInteract = Date.now();
    };
    const adBtn = $('[data-a="ad"]', m.el);
    if (adBtn) adBtn.onclick = async () => {
      adBtn.disabled = true;
      const res = await ads.showRewarded('continue', { level: lvl.n });
      if (res.rewarded) { this.adContinueUsed = true; cont('ad'); }
      else { adBtn.disabled = false; if (res.reason !== 'closed') toast(t('noAd')); }
    };
    const coinBtn = $('[data-a="coins"]', m.el);
    if (coinBtn) coinBtn.onclick = () => {
      if (save.coins < CONTINUE_COST) { toast(t('notEnough')); return; }
      save.coins -= CONTINUE_COST;
      this.coinContinues++;
      commit(true);
      cont('coins');
    };
    $('[data-a="retry"]', m.el).onclick = () => { m.close(); this.ended = true; save.stats.levelsLost++; commit(); this.start(lvl, { attempt: this.attempt + 1 }); };
    $('[data-a="map"]', m.el).onclick = () => { m.close(); this.ended = true; save.stats.levelsLost++; commit(); this.exit(); };
  }
}
