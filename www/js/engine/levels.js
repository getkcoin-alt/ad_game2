// Level generation. Levels are deterministic (seeded) so every player sees the same
// puzzle, and move counts / star thresholds are calibrated offline by tools/balance.mjs
// (results live in tuning.js).

import { mulberry32, hashString } from './rng.js';
import { CITIES, LEVELS_PER_CITY, TOTAL_LEVELS, GUESTS } from './content.js';
import { TUNING } from './tuning.js';

const SHAPES = [
  // 0 full
  ['........', '........', '........', '........', '........', '........', '........', '........'],
  // 1 thali (rounded corners)
  ['##....##', '#......#', '........', '........', '........', '........', '#......#', '##....##'],
  // 2 temple
  ['###..###', '##....##', '#......#', '........', '........', '........', '........', '........'],
  // 3 two halves
  ['...##...', '...##...', '........', '........', '........', '........', '...##...', '...##...'],
  // 4 heart
  ['#..##..#', '........', '........', '........', '........', '#......#', '##....##', '###..###'],
  // 5 plus / rangoli
  ['##....##', '##....##', '........', '........', '........', '........', '##....##', '##....##'],
  // 6 tall 7x9
  ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  // 7 kite (diamond)
  ['###..###', '##....##', '#......#', '........', '........', '#......#', '##....##', '###..###'],
  // 8 tiffin (columns with gap rows)
  ['........', '........', '.##..##.', '........', '........', '.##..##.', '........', '........'],
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function setChar(rows, r, c, ch) {
  rows[r] = rows[r].substring(0, c) + ch + rows[r].substring(c + 1);
}

function playableCells(rows) {
  const cells = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '#') cells.push([r, c]); }));
  return cells;
}

function placeDough(rows, rng, style, layers, amount) {
  const H = rows.length;
  const cells = playableCells(rows);
  let chosen = [];
  if (style === 'bottom') {
    const bandRows = clamp(amount, 1, 3);
    chosen = cells.filter(([r]) => r >= H - bandRows);
  } else if (style === 'center') {
    const W = rows[0].length;
    const cr = (H - 1) / 2, cc = (W - 1) / 2;
    const radius = amount >= 3 ? 2.2 : 1.6;
    chosen = cells.filter(([r, c]) => Math.abs(r - cr) + Math.abs(c - cc) <= radius + 0.5);
  } else if (style === 'sides') {
    const W = rows[0].length;
    chosen = cells.filter(([r, c]) => (c <= 0 || c >= W - 1) && r >= 2);
    if (amount >= 3) chosen = chosen.concat(cells.filter(([r, c]) => (c === 1 || c === W - 2) && r >= H - 3));
  } else {
    // scatter
    chosen = rng.shuffle(cells.filter(([r]) => r >= 2)).slice(0, 6 + amount * 3);
  }
  for (const [r, c] of chosen) setChar(rows, r, c, String(layers));
  return chosen.length * layers;
}

function placeLocks(rows, rng, count) {
  const cells = rng.shuffle(playableCells(rows).filter(([r, c]) => rows[r][c] === '.' && r >= 1));
  for (const [r, c] of cells.slice(0, count)) setChar(rows, r, c, 'L');
  return Math.min(count, cells.length);
}

/** Difficulty in [0,1] with a gentle sawtooth: each city ramps up to a "signature dish" level,
 *  and the 4th level of every city is a breather. */
export function difficultyOf(n) {
  const stage = (n - 1) % LEVELS_PER_CITY;
  const base = 0.12 + 0.7 * ((n - 1) / (TOTAL_LEVELS - 1));
  const wave = [0, 0.05, 0.1, -0.08, 0.08, 0.18][stage];
  return clamp(base + wave, 0.05, 1);
}

function splitNeeds(total, count, rng) {
  if (count === 1) return [total];
  const parts = [];
  let left = total;
  for (let i = 0; i < count - 1; i++) {
    const share = Math.round((left / (count - i)) * (0.8 + rng() * 0.4));
    parts.push(share);
    left -= share;
  }
  parts.push(left);
  return parts.map((p) => Math.max(4, p));
}

function makeDish(dishDef, guest, items) {
  return { en: dishDef.en, hi: dishDef.hi, guest, items };
}

export function buildLevel(n, { seedKey = `level-${n}`, daily = false } = {}) {
  const rng = mulberry32(hashString(seedKey));
  const cityIndex = clamp(Math.floor((n - 1) / LEVELS_PER_CITY), 0, CITIES.length - 1);
  const city = CITIES[cityIndex];
  const stage = (n - 1) % LEVELS_PER_CITY;
  const signature = stage === LEVELS_PER_CITY - 1 && !daily;
  const D = difficultyOf(n);

  // ---- board shape ----
  let shapeIdx = 0;
  if (n >= 6) shapeIdx = rng.int(SHAPES.length);
  if (n === 1) shapeIdx = -1;
  const rows = shapeIdx < 0 ? Array(7).fill('.......') : [...SHAPES[shapeIdx]];

  const colors = n < 16 ? 5 : stage === 3 ? 5 : n < 30 ? (rng() < 0.6 ? 6 : 5) : 6;

  // ---- obstacles ----
  let doughTotal = 0;
  let locks = 0;
  const doughLevel = n >= 7 && (stage === 1 || stage === 4 || (signature && n >= 12) || (n === 7));
  if (doughLevel) {
    const style = n === 7 ? 'bottom' : rng.pick(['bottom', 'center', 'sides', 'scatter']);
    const layers = n >= 30 && rng() < D * 0.7 ? 2 : 1;
    const amount = clamp(Math.round(1 + D * 2.5) - (signature ? 1 : 0), 1, 3);
    doughTotal = placeDough(rows, rng, style, layers, amount);
  }
  if (n >= 13 && (stage === 2 || stage === 5 || (n >= 25 && stage === 0))) {
    locks = placeLocks(rows, rng, n === 13 ? 4 : Math.round(4 + D * 8));
  }

  // ---- orders (dishes) ----
  const ingredientTotal = Math.round((doughLevel ? 14 : 30) + D * (doughLevel ? 24 : 60) + (signature ? 8 : 0));
  const dishCount = n <= 2 ? n : signature ? 2 : n < 8 ? 2 : 1 + (rng() < 0.5 ? 1 : 2);
  const dishes = [];
  const pool = rng.shuffle([...city.dishes.slice(0, 4)]);
  const sigDish = city.dishes[4];
  const guestPick = () => rng.pick(GUESTS);
  const valid = (c) => c < colors;
  let parts = splitNeeds(ingredientTotal, doughLevel ? Math.max(1, dishCount - 1) : dishCount, rng);
  if (n === 1) parts = [15];
  const usedColors = new Set();
  parts.forEach((need, i) => {
    const def = signature && i === 0 ? sigDish : pool[i % pool.length];
    let uses = def.uses.filter(valid).filter((c) => !usedColors.has(c));
    if (!uses.length) uses = [0, 1, 2, 3, 4].filter((c) => !usedColors.has(c));
    const nItems = n < 5 ? 1 : clamp(1 + (D > 0.45 ? 1 : 0) + (signature ? 1 : 0), 1, Math.min(3, uses.length));
    const chosen = uses.slice(0, nItems);
    chosen.forEach((c) => usedColors.add(c));
    const sub = splitNeeds(need, chosen.length, rng);
    dishes.push(makeDish(def, guestPick(), chosen.map((color, j) => ({ kind: 'ing', color, need: sub[j] }))));
  });
  if (doughTotal) {
    dishes.push({ en: 'Fresh Rotis', hi: 'ताज़ी रोटियां', guest: guestPick(), items: [{ kind: 'dough', need: doughTotal }] });
  }
  if (locks && (signature || n === 13)) {
    dishes.push({ en: 'Steel Tiffin', hi: 'स्टील टिफ़िन', guest: guestPick(), items: [{ kind: 'lock', need: locks }] });
  }

  // ---- moves & stars ----
  const totalNeed = dishes.reduce((s, dsh) => s + dsh.items.reduce((a, it) => a + it.need * (it.kind === 'ing' ? 1 : 1.6), 0), 0);
  const estimate = Math.round(clamp(8 + totalNeed / (colors === 5 ? 3.1 : 2.6), 12, 40));
  const tuned = !daily && TUNING[n];
  const moves = tuned ? tuned[0] : estimate;
  const stars = tuned ? [tuned[1], tuned[2]] : [Math.max(2, Math.round(moves * 0.15)), Math.max(4, Math.round(moves * 0.3))];

  return {
    n, daily, seed: hashString(seedKey + ':board'), cityIndex, cityId: city.id, stage, signature,
    layout: rows, colors, moves, stars, dishes, difficulty: D,
  };
}

export function getLevel(n) {
  return buildLevel(clamp(n, 1, TOTAL_LEVELS));
}

/** Daily Thali — one fresh puzzle per calendar day, same for everyone. */
export function getDailyLevel(dateKey) {
  const rng = mulberry32(hashString('daily-' + dateKey));
  const n = 14 + rng.int(36);
  const lvl = buildLevel(n, { seedKey: 'daily-' + dateKey, daily: true });
  lvl.moves += 3; // dailies are meant to feel relaxing
  lvl.dailyKey = dateKey;
  return lvl;
}

export { TOTAL_LEVELS };
