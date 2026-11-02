// One play-through of one level: moves, dish orders, tadka meter, boosters, stars.
// Pure logic (no DOM) so it can be unit-tested and driven by the balancing bot.

import { Board } from '../engine/board.js';
import { mulberry32 } from '../engine/rng.js';

export const TADKA_MAX = 30;
export const AD_EXTRA_MOVES = 5;

/** Credit collected items to the first unfinished dish that needs them. */
export function creditDishes(dishes, kind, amount, color) {
  let left = amount;
  for (const dish of dishes) {
    for (const it of dish.items) {
      if (left <= 0) return;
      if (it.kind !== kind || (kind === 'ing' && it.color !== color)) continue;
      const take = Math.min(left, it.need - it.got);
      if (take > 0) { it.got += take; left -= take; }
    }
  }
}

/** Apply one clear phase to a dishes array (used by the HUD to animate progress phase by phase). */
export function creditPhase(dishes, p) {
  for (const [color, n] of Object.entries(p.collected)) creditDishes(dishes, 'ing', n, Number(color));
  if (p.doughHits) creditDishes(dishes, 'dough', p.doughHits);
  if (p.unlocked.length) creditDishes(dishes, 'lock', p.unlocked.length);
}

export class GameSession {
  constructor(level, { seedOffset = 0 } = {}) {
    this.level = level;
    this.board = new Board(level, mulberry32(level.seed + seedOffset));
    this.movesLeft = level.moves;
    this.movesUsed = 0;
    this.score = 0;
    this.tadka = 0;
    this.state = 'playing';
    this.continues = 0;
    this.bestCascade = 1;
    this.specialsMade = 0;
    this.dishes = level.dishes.map((d) => ({ ...d, items: d.items.map((it) => ({ ...it, got: 0 })) }));
  }

  // ---------- progress ----------
  _credit(kind, amount, color) { creditDishes(this.dishes, kind, amount, color); }

  applyPhases(phases, { fromTadka = false } = {}) {
    const events = [];
    for (const p of phases) {
      if (p.kind !== 'clear') continue;
      creditPhase(this.dishes, p);
      this.score += p.score;
      this.bestCascade = Math.max(this.bestCascade, p.cascade);
      this.specialsMade += p.created.length;
      if (!fromTadka) {
        const gain = p.cleared.length * (p.cascade >= 2 ? 1 : 0.34) + p.created.length * 4;
        this.tadka = Math.min(TADKA_MAX, this.tadka + gain);
      }
      events.push(p);
    }
    this._checkEnd();
    return events;
  }

  isComplete() {
    return this.dishes.every((d) => d.items.every((it) => it.got >= it.need));
  }

  dishDone(i) { return this.dishes[i].items.every((it) => it.got >= it.need); }

  neededColors() {
    const remaining = new Map();
    for (const d of this.dishes) for (const it of d.items)
      if (it.kind === 'ing' && it.got < it.need) remaining.set(it.color, (remaining.get(it.color) || 0) + it.need - it.got);
    return [...remaining.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }

  _checkEnd() {
    if (this.state !== 'playing') return;
    if (this.isComplete()) this.state = 'won';
    else if (this.movesLeft <= 0) this.state = 'lost';
  }

  // ---------- actions ----------
  swap(a, b) {
    if (this.state !== 'playing') return { ok: false, reason: 'over' };
    const res = this.board.trySwap(a, b);
    if (!res.ok) return res;
    this.movesLeft--;
    this.movesUsed++;
    this.applyPhases(res.phases);
    return res;
  }

  tadkaReady() { return this.tadka >= TADKA_MAX && this.state === 'playing'; }

  useTadka() {
    if (!this.tadkaReady()) return { ok: false };
    this.tadka = 0;
    const res = this.board.tadka(this.neededColors(), 8);
    this.applyPhases(res.phases, { fromTadka: true });
    return res;
  }

  useSpoon(r, c) {
    if (this.state !== 'playing') return { ok: false };
    const res = this.board.useSpoon(r, c);
    if (res.ok) this.applyPhases(res.phases);
    return res;
  }

  useHand(a, b) {
    if (this.state !== 'playing') return { ok: false };
    const res = this.board.trySwap(a, b, { free: true });
    if (res.ok) this.applyPhases(res.phases);
    return res;
  }

  useShuffle() {
    if (this.state !== 'playing') return { ok: false };
    return { ok: true, phases: [this.board.shuffle()] };
  }

  /** Continue after running out of moves (rewarded ad or coins). */
  addMoves(n = AD_EXTRA_MOVES) {
    if (this.state !== 'lost') return false;
    this.movesLeft += n;
    this.continues++;
    this.state = 'playing';
    return true;
  }

  // ---------- results ----------
  stars() {
    if (this.state !== 'won') return 0;
    const [s2, s3] = this.level.stars;
    return this.movesLeft >= s3 ? 3 : this.movesLeft >= s2 ? 2 : 1;
  }

  coins() {
    if (this.state !== 'won') return 0;
    return 20 + Math.min(this.movesLeft, 15) * 2 + this.stars() * 5 + (this.level.signature ? 25 : 0);
  }

  progressRatio() {
    let got = 0, need = 0;
    for (const d of this.dishes) for (const it of d.items) { got += Math.min(it.got, it.need); need += it.need; }
    return need ? got / need : 1;
  }
}
