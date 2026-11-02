// Rewarded ads only — opt-in, clearly labelled, always the player's choice. No interstitials,
// no banners, no ads in the first few levels, daily caps per placement.
//
// Provider selection:
//   • Android build with @capacitor-community/admob → real AdMob rewarded video.
//   • Browser / dev → a mock "test ad" overlay so the full flow can be exercised.

import { analytics } from './analytics.js';
import { todayKey } from './storage.js';

// Google's public TEST rewarded unit. Replace with your own unit id (see README) for release.
const ADMOB_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

export const PLACEMENTS = {
  continue: { cap: 8, minLevel: 4 },   // +5 moves when out of moves (1 per attempt)
  double: { cap: 8, minLevel: 3 },     // double the coins after a win
  booster: { cap: 3, minLevel: 5 },    // free booster from the kitchen shelf
  daily: { cap: 1, minLevel: 1 },      // extra daily gift
};
const GLOBAL_DAILY_CAP = 20;

class MockProvider {
  constructor() { this.name = 'mock'; }
  async init() {}
  isReady() { return true; }
  show(placement) {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'mock-ad';
      el.innerHTML = `
        <div class="mock-ad-card">
          <div class="mock-ad-tag">TEST AD · ${placement}</div>
          <div class="mock-ad-art">🫖</div>
          <div class="mock-ad-title">Your ad could be here</div>
          <div class="mock-ad-sub">In the Android build this is a real AdMob rewarded video.</div>
          <div class="mock-ad-bar"><i></i></div>
          <button class="mock-ad-close" disabled>Reward in <b>5</b>s</button>
          <button class="mock-ad-skip">Close without reward</button>
        </div>`;
      document.body.appendChild(el);
      const btn = el.querySelector('.mock-ad-close');
      const bar = el.querySelector('.mock-ad-bar i');
      const secs = window.__FAST_ADS ? 1 : 5;
      let left = secs;
      btn.querySelector('b').textContent = left;
      requestAnimationFrame(() => { bar.style.transition = `width ${secs}s linear`; bar.style.width = '100%'; });
      const iv = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(iv);
          btn.disabled = false;
          btn.textContent = 'Collect reward ✓';
        } else btn.querySelector('b').textContent = left;
      }, 1000);
      btn.onclick = () => { el.remove(); resolve({ rewarded: true }); };
      el.querySelector('.mock-ad-skip').onclick = () => { clearInterval(iv); el.remove(); resolve({ rewarded: false, reason: 'closed' }); };
    });
  }
}

class AdMobProvider {
  constructor(plugin) { this.plugin = plugin; this.name = 'admob'; this.ready = false; }
  async init({ personalized }) {
    await this.plugin.initialize({ initializeForTesting: ADMOB_REWARDED_ID.includes('3940256099942544') });
    this.npa = !personalized;
    this.prepare();
  }
  async prepare() {
    try {
      await this.plugin.prepareRewardVideoAd({ adId: ADMOB_REWARDED_ID, npa: this.npa });
      this.ready = true;
    } catch { this.ready = false; setTimeout(() => this.prepare(), 30000); }
  }
  isReady() { return this.ready; }
  async show() {
    if (!this.ready) { this.prepare(); return { rewarded: false, reason: 'no_fill' }; }
    this.ready = false;
    try {
      const reward = await this.plugin.showRewardVideoAd();
      return { rewarded: !!reward };
    } catch (e) {
      return { rewarded: false, reason: 'error' };
    } finally {
      this.prepare();
    }
  }
}

class Ads {
  constructor() { this.provider = new MockProvider(); this.save = null; this.persist = null; this.showing = false; }

  async init(save, persist) {
    this.save = save; this.persist = persist;
    const plugin = window.Capacitor?.Plugins?.AdMob;
    if (plugin) {
      try {
        const p = new AdMobProvider(plugin);
        await p.init({ personalized: save.settings.personalizedAds });
        this.provider = p;
      } catch { this.provider = new MockProvider(); }
    }
  }

  _caps() {
    const t = todayKey();
    if (this.save.adCaps.date !== t) this.save.adCaps = { date: t, counts: {} };
    return this.save.adCaps.counts;
  }

  remaining(placement) {
    const cfg = PLACEMENTS[placement];
    if (!cfg) return 0;
    const counts = this._caps();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Math.max(0, Math.min(cfg.cap - (counts[placement] || 0), GLOBAL_DAILY_CAP - total));
  }

  canOffer(placement, level = 99) {
    const cfg = PLACEMENTS[placement];
    return !!cfg && level >= cfg.minLevel && this.remaining(placement) > 0 && this.provider.isReady();
  }

  async showRewarded(placement, context = {}) {
    if (this.showing) return { rewarded: false, reason: 'busy' };
    if (this.remaining(placement) <= 0) return { rewarded: false, reason: 'cap' };
    this.showing = true;
    analytics.track('ad_start', { placement, ...context });
    try {
      const res = await this.provider.show(placement);
      if (res.rewarded) {
        const counts = this._caps();
        counts[placement] = (counts[placement] || 0) + 1;
        this.save.stats.adsWatched++;
        this.persist(this.save);
        analytics.track('ad_reward', { placement, ...context });
      } else {
        analytics.track(res.reason === 'closed' ? 'ad_skip' : 'ad_fail', { placement, reason: res.reason, ...context });
      }
      return res;
    } finally {
      this.showing = false;
    }
  }
}

export const ads = new Ads();
