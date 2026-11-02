// Rewarded ads only — opt-in, clearly labelled, always the player's choice. No interstitials,
// no banners, no ads in the first few levels, daily caps per placement.
//
// Providers (picked automatically):
//   • Android/iOS app  → AdMob rewarded video via @capacitor-community/admob, with Google UMP consent.
//   • Web (Vercel etc.) → Google H5 Games Ads (AdSense Ad Placement API) when an AdSense client is set.
//   • Otherwise        → a clearly-marked mock "test ad" so the flow can be exercised in development.
// All IDs live in ad-config.js.

import { analytics } from './analytics.js';
import { todayKey } from './storage.js';
import { sound } from './audio.js';
import { AD_CONFIG, TEST_IDS } from './ad-config.js';

export const PLACEMENTS = {
  continue: { cap: 8, minLevel: 4 },   // +5 moves when out of moves (1 per attempt)
  double: { cap: 8, minLevel: 3 },     // double the coins after a win
  booster: { cap: 3, minLevel: 5 },    // free booster from the kitchen shelf
  daily: { cap: 1, minLevel: 1 },      // extra daily gift
};
const GLOBAL_DAILY_CAP = 20;

// ───────────────────────────── mock (development) ─────────────────────────────
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
          <div class="mock-ad-sub">Real ads appear once AdMob (app) or AdSense (web) ids are configured.</div>
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
        if (left <= 0) { clearInterval(iv); btn.disabled = false; btn.textContent = 'Collect reward ✓'; }
        else btn.querySelector('b').textContent = left;
      }, 1000);
      btn.onclick = () => { el.remove(); resolve({ rewarded: true }); };
      el.querySelector('.mock-ad-skip').onclick = () => { clearInterval(iv); el.remove(); resolve({ rewarded: false, reason: 'closed' }); };
    });
  }
}

// Real ads are configured but unavailable (ad blocker, offline): offer no ad buttons at all,
// rather than handing out rewards for a fake ad.
class NoAdsProvider {
  constructor() { this.name = 'none'; }
  async init() {}
  isReady() { return false; }
  async show() { return { rewarded: false, reason: 'no_fill' }; }
}

// ───────────────────────────── AdMob (Android / iOS) ─────────────────────────────
class AdMobProvider {
  constructor(plugin, platform) {
    this.plugin = plugin;
    this.platform = platform;
    this.name = 'admob';
    this.ready = false;
    this.loading = false;
    const real = platform === 'ios' ? AD_CONFIG.admob.rewardedIos : AD_CONFIG.admob.rewardedAndroid;
    this.testing = AD_CONFIG.admob.forceTest || !real;
    this.adId = this.testing ? (platform === 'ios' ? TEST_IDS.rewardedIos : TEST_IDS.rewardedAndroid) : real;
    this.retry = 0;
  }

  async init({ personalized, userId }) {
    this.npa = !personalized;
    this.userId = userId;
    // Google UMP consent (GDPR/EEA, UK, US state laws). In India this usually resolves to NOT_REQUIRED.
    try {
      const info = await this.plugin.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') await this.plugin.showConsentForm();
    } catch { /* consent API unavailable — continue with non-personalised ads */ }
    await this.plugin.initialize({ initializeForTesting: this.testing });
    this.plugin.addListener?.('onRewardedVideoAdFailedToLoad', (e) => { this.ready = false; analytics.track('ad_load_fail', { code: e?.code, msg: e?.message }); });
    this.plugin.addListener?.('onRewardedVideoAdLoaded', () => { this.ready = true; this.retry = 0; });
    this.prepare();
  }

  async prepare() {
    if (this.loading || this.ready) return;
    this.loading = true;
    try {
      const opts = { adId: this.adId, npa: this.npa, isTesting: this.testing };
      // Server-side verification hook: AdMob forwards these to your SSV callback if you enable it.
      if (this.userId) opts.ssv = { userId: this.userId };
      await this.plugin.prepareRewardVideoAd(opts);
      this.ready = true;
      this.retry = 0;
    } catch {
      this.ready = false;
      this.retry = Math.min(this.retry + 1, 6);
      setTimeout(() => this.prepare(), 1000 * 2 ** this.retry); // exponential back-off: 2s … 64s
    } finally {
      this.loading = false;
    }
  }

  isReady() { return this.ready; }

  async show() {
    if (!this.ready) { this.prepare(); return { rewarded: false, reason: 'no_fill' }; }
    this.ready = false;
    try {
      const reward = await this.plugin.showRewardVideoAd();
      return { rewarded: !!reward && (reward.amount == null || reward.amount > 0) };
    } catch {
      return { rewarded: false, reason: 'error' };
    } finally {
      this.prepare(); // preload the next one
    }
  }
}

// ───────────────────────────── Web: H5 Games Ads (AdSense) ─────────────────────────────
// https://developers.google.com/ad-placement — rewarded ads in browser games.
class H5GamesProvider {
  constructor(client, testMode) { this.client = client; this.testMode = testMode; this.name = 'h5'; this.loaded = false; }

  init() {
    return new Promise((resolve) => {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(this.client)}`;
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-ad-client', this.client);
      s.setAttribute('data-ad-frequency-hint', '30s');
      if (this.testMode) s.setAttribute('data-adbreak-test', 'on');
      s.onload = () => { this.loaded = true; resolve(); };
      s.onerror = () => { this.loaded = false; resolve(); }; // blocked by an ad blocker / offline
      document.head.appendChild(s);
      window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
    });
  }

  isReady() { return this.loaded; }

  show(placement) {
    return new Promise((resolve) => {
      let offered = false, rewarded = false, settled = false;
      const done = (res) => { if (!settled) { settled = true; resolve(res); } };
      window.adBreak({
        type: 'reward',
        name: `reward_${placement}`,
        beforeAd: () => sound.suspend(),
        afterAd: () => sound.resume(),
        // The player already chose to watch (they tapped the ad button), so show immediately.
        beforeReward: (showAdFn) => { offered = true; showAdFn(); },
        adViewed: () => { rewarded = true; },
        adDismissed: () => { rewarded = false; },
        adBreakDone: (info) => {
          if (rewarded) done({ rewarded: true });
          else if (!offered) done({ rewarded: false, reason: info?.breakStatus === 'frequencyCapped' ? 'cap' : 'no_fill' });
          else done({ rewarded: false, reason: 'closed' });
        },
      });
      setTimeout(() => done({ rewarded: false, reason: 'timeout' }), 60000);
    });
  }
}

// ───────────────────────────── facade ─────────────────────────────
class Ads {
  constructor() { this.provider = new MockProvider(); this.save = null; this.persist = null; this.showing = false; }

  async init(save, persist) {
    this.save = save; this.persist = persist;
    const cap = window.Capacitor;
    const plugin = cap?.Plugins?.AdMob;
    const native = cap?.isNativePlatform?.() && plugin;
    try {
      if (native) {
        const p = new AdMobProvider(plugin, cap.getPlatform());
        await p.init({ personalized: save.settings.personalizedAds, userId: analytics.userId });
        this.provider = p;
      } else if (AD_CONFIG.adsense.client) {
        const p = new H5GamesProvider(AD_CONFIG.adsense.client, AD_CONFIG.adsense.testMode);
        await p.init();
        this.provider = p.isReady() ? p : new NoAdsProvider();
      }
    } catch {
      this.provider = new MockProvider();
    }
    analytics.track('ads_ready', { provider: this.provider.name, testing: !!this.provider.testing || this.provider.name === 'mock' || !!this.provider.testMode });
  }

  get providerName() { return this.provider.name; }

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
    analytics.track('ad_start', { placement, provider: this.provider.name, ...context });
    sound.suspend();
    try {
      const res = await this.provider.show(placement);
      if (res.rewarded) {
        const counts = this._caps();
        counts[placement] = (counts[placement] || 0) + 1;
        this.save.stats.adsWatched++;
        this.persist(this.save);
        analytics.track('ad_reward', { placement, provider: this.provider.name, ...context });
      } else {
        analytics.track(res.reason === 'closed' ? 'ad_skip' : 'ad_fail', { placement, reason: res.reason, provider: this.provider.name, ...context });
      }
      return res;
    } finally {
      sound.resume();
      this.showing = false;
    }
  }
}

export const ads = new Ads();
