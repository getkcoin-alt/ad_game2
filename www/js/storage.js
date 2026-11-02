// Local save (works offline in the Android WebView). Versioned with migrations so updates never
// wipe a player's journey.

const KEY = 'masala-yatra:save';
const VERSION = 1;

export function todayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function defaultSave() {
  return {
    v: VERSION,
    unlocked: 1,
    stars: {},
    coins: 150,
    boosters: { spoon: 2, hand: 1, shuffle: 1 },
    recipes: [],
    seenIntros: [],
    settings: { sfx: true, music: false, haptics: true, lang: null, reduceMotion: false, analytics: true, personalizedAds: false, breakReminder: true },
    daily: { lastWin: null, streak: 0, best: 0, graceUsedWeek: null },
    gift: { lastClaim: null },
    adCaps: { date: null, counts: {} },
    stats: { sessions: 0, levelsWon: 0, levelsLost: 0, totalPlayMs: 0, adsWatched: 0, firstOpen: Date.now() },
    privacyAccepted: false,
  };
}

function migrate(data) {
  const base = defaultSave();
  const merged = { ...base, ...data };
  for (const k of ['boosters', 'settings', 'daily', 'gift', 'adCaps', 'stats']) merged[k] = { ...base[k], ...(data[k] || {}) };
  merged.v = VERSION;
  return merged;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

let timer = null;
export function persist(save, immediate = false) {
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full or blocked */ } };
  clearTimeout(timer);
  if (immediate) write(); else timer = setTimeout(write, 250);
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
