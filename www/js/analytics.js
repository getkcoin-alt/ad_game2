// Analytics: a small typed event layer with pluggable sinks.
//  • Always: a capped local queue (useful for debugging and for batching to a backend later).
//  • On Android with @capacitor-firebase/analytics installed: forwarded to Firebase / GA4.
// Respects the player's consent toggle; no personal data (names, phone, contacts) is collected.

const QUEUE_KEY = 'masala-yatra:events';
const ID_KEY = 'masala-yatra:uid';
const MAX_QUEUE = 300;

function uid() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch { return 'anon'; }
}

class Analytics {
  constructor() {
    this.enabled = true;
    this.sessionId = Math.random().toString(36).slice(2, 10);
    this.sessionStart = Date.now();
    this.userId = null;
    this.buffer = [];
    this.recent = [];
  }

  init({ enabled }) {
    this.enabled = enabled;
    this.userId = uid();
    try { this.buffer = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { this.buffer = []; }
    this.firebase = window.Capacitor?.Plugins?.FirebaseAnalytics || null;
    if (this.firebase) this.firebase.setEnabled?.({ enabled }).catch?.(() => {});
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.firebase) this.firebase.setEnabled?.({ enabled: on }).catch?.(() => {});
    if (!on) { this.buffer = []; this._flush(); }
  }

  track(name, params = {}) {
    const ev = { name, params, ts: Date.now(), sid: this.sessionId };
    this.recent.push(ev);
    if (this.recent.length > 50) this.recent.shift();
    if (typeof window !== 'undefined') (window.__myEvents = window.__myEvents || []).push(ev);
    if (!this.enabled) return;
    this.buffer.push(ev);
    if (this.buffer.length > MAX_QUEUE) this.buffer.splice(0, this.buffer.length - MAX_QUEUE);
    this._flush();
    if (this.firebase) {
      const clean = {};
      for (const [k, v] of Object.entries(params)) clean[k] = typeof v === 'object' ? JSON.stringify(v) : v;
      this.firebase.logEvent({ name, params: clean }).catch?.(() => {});
    }
  }

  _flush() {
    clearTimeout(this._t);
    this._t = setTimeout(() => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(this.buffer)); } catch { /* ignore */ } }, 500);
  }
}

export const analytics = new Analytics();

/* Event dictionary (keep in sync with docs/ANALYTICS.md)
 * app_open {first, day_index}            session_end {duration_s, levels_played}
 * privacy_accepted {analytics}           tutorial_step {level, step}
 * level_start {level, attempt, city, boosters}   level_win {level, moves_left, stars, attempt, continues, duration_s}
 * level_fail {level, progress, attempt}  level_quit {level, moves_used}
 * continue_offer {level, progress}       continue_accept {level, method}
 * ad_offer {placement}  ad_start {placement}  ad_reward {placement}  ad_fail {placement, reason}  ad_skip {placement}
 * booster_use {booster, level}           booster_get {booster, source}
 * tadka_use {level}                      special_made {type}
 * recipe_unlock {city}                   daily_win {streak}   gift_claim {day}
 * break_prompt {minutes}  break_taken {minutes}   setting_change {key, value}
 */
