// Masala Yatra — pure board engine (no DOM). Fully deterministic given an RNG.
//
// Layout legend (one string per row):
//   '.' playable cell with a random ingredient
//   '#' hole (not part of the board)
//   '1' / '2' dough (atta) blocker with that many layers
//   'L' random ingredient locked under a steel jaali (net)
//   'a'..'f' fixed ingredient colour 0..5 (used for hand-crafted tutorials)
//
// The engine mutates its own state immediately and returns a list of "phases"
// describing what happened, which the renderer replays as animations.

export const SP = Object.freeze({ ROW: 'row', COL: 'col', COOKER: 'cooker', DABBA: 'dabba' });

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const k = (r, c) => r * 64 + c;
const unk = (key) => [Math.floor(key / 64), key % 64];

export class Board {
  constructor({ layout, colors }, rng) {
    this.rng = rng;
    this.nColors = colors;
    this.rows = layout.length;
    this.cols = Math.max(...layout.map((s) => s.length));
    this.nextId = 1;
    this.playable = [];
    this.tiles = [];
    this.dough = [];
    this.lock = [];
    const fixed = [];
    for (let r = 0; r < this.rows; r++) {
      this.playable.push([]); this.tiles.push([]); this.dough.push([]); this.lock.push([]); fixed.push([]);
      for (let c = 0; c < this.cols; c++) {
        const ch = layout[r][c] || '#';
        this.playable[r][c] = ch !== '#';
        this.dough[r][c] = ch === '1' ? 1 : ch === '2' ? 2 : 0;
        this.lock[r][c] = ch === 'L' ? 1 : 0;
        this.tiles[r][c] = null;
        fixed[r][c] = ch >= 'a' && ch <= 'f' ? ch.charCodeAt(0) - 97 : -1;
      }
    }
    this._initialFill(fixed);
  }

  // ---------- basic queries ----------
  inBounds(r, c) { return r >= 0 && c >= 0 && r < this.rows && c < this.cols; }
  isPlayable(r, c) { return this.inBounds(r, c) && this.playable[r][c]; }
  tileAt(r, c) { return this.inBounds(r, c) ? this.tiles[r][c] : null; }
  isEmpty(r, c) { return this.isPlayable(r, c) && !this.dough[r][c] && !this.tiles[r][c]; }
  isSwappable(r, c) { return !!this.tileAt(r, c) && !this.lock[r][c]; }
  canFall(r, c) { return !!this.tileAt(r, c) && !this.lock[r][c]; }
  colorAt(r, c) {
    const t = this.tileAt(r, c);
    return t && t.special !== SP.DABBA ? t.color : -1;
  }
  newTile(color, special = null) { return { id: this.nextId++, color, special }; }

  totalDough() {
    let n = 0;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) n += this.dough[r][c];
    return n;
  }
  countLocks() {
    let n = 0;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) n += this.lock[r][c];
    return n;
  }

  // ---------- fill ----------
  _initialFill(fixed) {
    const allFixed = () => {
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++)
        if (this.playable[r][c] && !this.dough[r][c] && fixed[r][c] < 0) return false;
      return true;
    };
    for (let attempt = 0; attempt < 100; attempt++) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          this.tiles[r][c] = null;
          if (!this.playable[r][c] || this.dough[r][c]) continue;
          let color = fixed[r][c];
          if (color < 0) {
            const banned = new Set();
            if (this.colorAt(r, c - 1) >= 0 && this.colorAt(r, c - 1) === this.colorAt(r, c - 2)) banned.add(this.colorAt(r, c - 1));
            if (this.colorAt(r - 1, c) >= 0 && this.colorAt(r - 1, c) === this.colorAt(r - 2, c)) banned.add(this.colorAt(r - 1, c));
            const options = [];
            for (let i = 0; i < this.nColors; i++) if (!banned.has(i)) options.push(i);
            color = this.rng.pick(options);
          }
          this.tiles[r][c] = this.newTile(color);
        }
      }
      if (allFixed()) return;
      if (this.findGroups().length === 0 && this.hasPossibleMove()) return;
    }
  }

  // ---------- matching ----------
  findGroups() {
    const runs = [];
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const color = this.colorAt(r, c);
        let e = c + 1;
        if (color >= 0) while (e < this.cols && this.colorAt(r, e) === color) e++;
        if (color >= 0 && e - c >= 3) runs.push({ dir: 'h', color, cells: Array.from({ length: e - c }, (_, i) => [r, c + i]) });
        c = e;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const color = this.colorAt(r, c);
        let e = r + 1;
        if (color >= 0) while (e < this.rows && this.colorAt(e, c) === color) e++;
        if (color >= 0 && e - r >= 3) runs.push({ dir: 'v', color, cells: Array.from({ length: e - r }, (_, i) => [r + i, c]) });
        r = e;
      }
    }
    if (!runs.length) return [];
    // union runs that share cells
    const parent = runs.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const owner = new Map();
    runs.forEach((run, i) => {
      for (const [r, c] of run.cells) {
        const key = k(r, c);
        if (owner.has(key)) parent[find(i)] = find(owner.get(key));
        else owner.set(key, i);
      }
    });
    const byRoot = new Map();
    runs.forEach((run, i) => {
      const root = find(i);
      if (!byRoot.has(root)) byRoot.set(root, []);
      byRoot.get(root).push(run);
    });
    const groups = [];
    for (const groupRuns of byRoot.values()) {
      const cellSet = new Map();
      for (const run of groupRuns) for (const [r, c] of run.cells) cellSet.set(k(r, c), [r, c]);
      groups.push({
        color: groupRuns[0].color,
        runs: groupRuns,
        cells: [...cellSet.values()],
        hasH: groupRuns.some((x) => x.dir === 'h'),
        hasV: groupRuns.some((x) => x.dir === 'v'),
        maxRun: Math.max(...groupRuns.map((x) => x.cells.length)),
      });
    }
    return groups;
  }

  _decideSpecial(group, preferKeys) {
    let special = null;
    if (group.maxRun >= 5) special = SP.DABBA;
    else if (group.hasH && group.hasV) special = SP.COOKER;
    else if (group.maxRun === 4) special = group.runs.find((x) => x.cells.length === 4).dir === 'h' ? SP.ROW : SP.COL;
    if (!special) return null;
    const keys = new Set(group.cells.map(([r, c]) => k(r, c)));
    const usable = (key) => { const [r, c] = unk(key); return keys.has(key) && !this.lock[r][c]; };
    let pos = null;
    for (const pk of preferKeys || []) if (usable(pk)) { pos = unk(pk); break; }
    if (!pos && special === SP.COOKER) {
      const h = group.runs.filter((x) => x.dir === 'h');
      const v = group.runs.filter((x) => x.dir === 'v');
      outer: for (const hr of h) for (const [r, c] of hr.cells) for (const vr of v)
        if (vr.cells.some(([r2, c2]) => r2 === r && c2 === c) && !this.lock[r][c]) { pos = [r, c]; break outer; }
    }
    if (!pos) {
      const longest = group.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
      const ordered = [...longest.cells.slice(Math.floor(longest.cells.length / 2)), ...longest.cells];
      pos = ordered.find(([r, c]) => !this.lock[r][c]) || group.cells.find(([r, c]) => !this.lock[r][c]);
    }
    if (!pos) return null;
    return { r: pos[0], c: pos[1], special, color: special === SP.DABBA ? -1 : group.color, cells: group.cells };
  }

  _hasMatchAt(r, c) {
    const color = this.colorAt(r, c);
    if (color < 0) return false;
    let h = 1, v = 1;
    for (let x = c - 1; this.colorAt(r, x) === color; x--) h++;
    for (let x = c + 1; this.colorAt(r, x) === color; x++) h++;
    if (h >= 3) return true;
    for (let y = r - 1; this.colorAt(y, c) === color; y--) v++;
    for (let y = r + 1; this.colorAt(y, c) === color; y++) v++;
    return v >= 3;
  }

  /** All valid swaps as [[r1,c1],[r2,c2]] pairs. */
  listMoves(limit = Infinity) {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.isSwappable(r, c)) continue;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = r + dr, c2 = c + dc;
          if (!this.isSwappable(r2, c2)) continue;
          const a = this.tiles[r][c], b = this.tiles[r2][c2];
          let ok = false;
          if ((a.special && b.special) || a.special === SP.DABBA || b.special === SP.DABBA) ok = true;
          else {
            this.tiles[r][c] = b; this.tiles[r2][c2] = a;
            ok = this._hasMatchAt(r, c) || this._hasMatchAt(r2, c2);
            this.tiles[r][c] = a; this.tiles[r2][c2] = b;
          }
          if (ok) { out.push([[r, c], [r2, c2]]); if (out.length >= limit) return out; }
        }
      }
    }
    return out;
  }
  hasPossibleMove() { return this.listMoves(1).length > 0; }
  findHint() { const m = this.listMoves(); return m.length ? m[this.rng.int(m.length)] : null; }

  // ---------- clearing ----------
  _runClear(spec, cascade) {
    const phase = {
      kind: 'clear', cascade, cleared: [], activated: [], created: [], converted: [],
      dough: [], unlocked: [], collected: {}, doughHits: 0, score: 0,
    };
    const clearedKeys = new Set();
    const doughHit = new Set();
    const unlocked = new Set();
    const queue = [];

    const hitDough = (r, c) => {
      const key = k(r, c);
      if (!this.dough[r][c] || doughHit.has(key)) return;
      doughHit.add(key);
      this.dough[r][c]--;
      phase.dough.push({ r, c, left: this.dough[r][c] });
      phase.doughHits++;
      phase.score += 20;
    };
    const enqueueArea = (cells) => { for (const [r, c] of cells) if (this.isPlayable(r, c)) queue.push({ r, c, byMatch: false }); };
    const activate = (t, r, c) => {
      const info = { r, c, special: t.special, color: t.color };
      if (t.special === SP.ROW) enqueueArea(Array.from({ length: this.cols }, (_, x) => [r, x]));
      else if (t.special === SP.COL) enqueueArea(Array.from({ length: this.rows }, (_, y) => [y, c]));
      else if (t.special === SP.COOKER) enqueueArea(this._diamond(r, c, 2));
      else if (t.special === SP.DABBA) {
        const target = t.dabbaColor != null ? t.dabbaColor : this._mostCommonColor();
        info.targetColor = target;
        info.targets = [];
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++)
          if (this.colorAt(y, x) === target) { info.targets.push([y, x]); queue.push({ r: y, c: x, byMatch: false }); }
      }
      phase.activated.push(info);
    };
    const applySeed = (seed) => {
      const info = { ...seed };
      if (seed.type === 'cross') {
        const cells = [];
        const half = Math.floor(seed.width / 2);
        for (let d = -half; d <= half; d++) {
          for (let x = 0; x < this.cols; x++) cells.push([seed.r + d, x]);
          for (let y = 0; y < this.rows; y++) cells.push([y, seed.c + d]);
        }
        enqueueArea(cells);
      } else if (seed.type === 'diamond') {
        enqueueArea(this._diamond(seed.r, seed.c, seed.radius));
      } else if (seed.type === 'all') {
        const cells = [];
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) cells.push([y, x]);
        enqueueArea(cells);
      } else if (seed.type === 'convert') {
        info.targets = [];
        for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
          const t = this.tiles[y][x];
          if (!t || t.color !== seed.color || t.special === SP.DABBA) continue;
          if (!t.special && !this.lock[y][x]) {
            t.special = seed.to === 'pin' ? (this.rng() < 0.5 ? SP.ROW : SP.COL) : seed.to;
            phase.converted.push({ id: t.id, r: y, c: x, special: t.special });
          }
          info.targets.push([y, x]);
          queue.push({ r: y, c: x, byMatch: false });
        }
      } else if (seed.type === 'tadka') {
        enqueueArea(seed.cells);
      }
      phase.activated.push(info);
    };

    const creations = [];
    const reserved = new Set();
    for (const g of spec.groups || []) {
      const cr = this._decideSpecial(g, spec.prefer);
      if (cr && !reserved.has(k(cr.r, cr.c))) { creations.push(cr); reserved.add(k(cr.r, cr.c)); }
      for (const [r, c] of g.cells) queue.push({ r, c, byMatch: true });
    }
    for (const [r, c] of spec.consume || []) {
      const t = this.tiles[r][c];
      if (!t) continue;
      clearedKeys.add(k(r, c));
      phase.cleared.push({ id: t.id, r, c, color: t.color, special: t.special });
      this.tiles[r][c] = null;
    }
    for (const seed of spec.seeds || []) applySeed(seed);
    for (const [r, c] of spec.direct || []) queue.push({ r, c, byMatch: false });

    let guard = 0;
    while (queue.length && guard++ < 10000) {
      const { r, c, byMatch } = queue.shift();
      const key = k(r, c);
      if (byMatch) for (const [dr, dc] of DIRS4) if (this.isPlayable(r + dr, c + dc)) hitDough(r + dr, c + dc);
      if (this.dough[r][c]) { hitDough(r, c); continue; }
      const t = this.tiles[r][c];
      if (!t || clearedKeys.has(key) || unlocked.has(key)) continue;
      if (this.lock[r][c]) {
        this.lock[r][c] = 0;
        unlocked.add(key);
        phase.unlocked.push({ r, c });
        phase.score += 20;
        continue;
      }
      clearedKeys.add(key);
      phase.cleared.push({ id: t.id, r, c, color: t.color, special: t.special });
      if (t.color >= 0) phase.collected[t.color] = (phase.collected[t.color] || 0) + 1;
      phase.score += 10 * cascade;
      this.tiles[r][c] = null;
      if (t.special) activate(t, r, c);
    }

    for (const cr of creations) {
      let pos = [cr.r, cr.c];
      if (!this.isEmpty(pos[0], pos[1])) pos = cr.cells.find(([r, c]) => this.isEmpty(r, c));
      if (!pos) continue;
      const t = this.newTile(cr.color, cr.special);
      this.tiles[pos[0]][pos[1]] = t;
      phase.created.push({ id: t.id, r: pos[0], c: pos[1], color: t.color, special: t.special });
      phase.score += 50;
    }
    return phase;
  }

  _diamond(r, c, radius) {
    const cells = [];
    for (let dr = -radius; dr <= radius; dr++)
      for (let dc = -radius; dc <= radius; dc++)
        if (Math.abs(dr) + Math.abs(dc) <= radius && this.isPlayable(r + dr, c + dc)) cells.push([r + dr, c + dc]);
    return cells;
  }

  _mostCommonColor() {
    const counts = new Array(this.nColors).fill(0);
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const col = this.colorAt(r, c);
      if (col >= 0) counts[col]++;
    }
    let best = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
    return best;
  }

  // ---------- gravity ----------
  _isSpawnCell(r, c) { return r === 0 || !this.playable[r - 1][c]; }

  _canBeFilledVertically(r, c) {
    for (let y = r - 1; ; y--) {
      if (y < 0 || !this.playable[y][c]) return true; // reached a spawn edge
      if (this.dough[y][c] || this.lock[y][c]) return false;
      if (this.tiles[y][c]) return true;
    }
  }

  applyGravity() {
    const moves = new Map();
    const spawnCount = new Array(this.cols).fill(0);
    const move = (r1, c1, r2, c2) => {
      const t = this.tiles[r1][c1];
      if (!moves.has(t.id)) moves.set(t.id, { id: t.id, fromR: r1, fromC: c1, spawned: false });
      const m = moves.get(t.id);
      m.toR = r2; m.toC = c2;
      this.tiles[r2][c2] = t;
      this.tiles[r1][c1] = null;
    };
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 5000) {
      changed = false;
      for (let r = this.rows - 1; r >= 0; r--) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.isEmpty(r, c)) continue;
          if (r - 1 >= 0 && this.playable[r - 1][c]) {
            if (this.canFall(r - 1, c)) { move(r - 1, c, r, c); changed = true; }
          } else if (this._isSpawnCell(r, c)) {
            const t = this.newTile(this.rng.int(this.nColors));
            this.tiles[r][c] = t;
            spawnCount[c]++;
            moves.set(t.id, { id: t.id, fromR: r - spawnCount[c], fromC: c, toR: r, toC: c, spawned: true, color: t.color });
            changed = true;
          }
        }
      }
      if (changed) continue;
      // Diagonal slide for cells sheltered beneath blockers.
      outer: for (let r = this.rows - 1; r >= 0; r--) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.isEmpty(r, c) || this._canBeFilledVertically(r, c)) continue;
          for (const dc of this.rng() < 0.5 ? [-1, 1] : [1, -1]) {
            const rr = r - 1, cc = c + dc;
            if (!this.isPlayable(rr, cc) || !this.canFall(rr, cc)) continue;
            if (this.isEmpty(r, cc)) continue; // it will fall straight down instead
            move(rr, cc, r, c);
            changed = true;
            break outer;
          }
        }
      }
    }
    for (const m of moves.values()) {
      const t = this.tiles[m.toR][m.toC];
      if (t) { m.color = t.color; m.special = t.special; }
    }
    return { kind: 'fall', moves: [...moves.values()] };
  }

  // ---------- turn resolution ----------
  _cascade(phases, firstSpec) {
    let spec = firstSpec;
    let cascade = 1;
    while (spec && cascade < 60) {
      phases.push(this._runClear(spec, cascade));
      const fall = this.applyGravity();
      if (fall.moves.length) phases.push(fall);
      const groups = this.findGroups();
      spec = groups.length ? { groups } : null;
      cascade++;
    }
    if (!this.hasPossibleMove()) phases.push(this.shuffle());
    return phases;
  }

  _comboSpec(a, b) {
    // tile ta now sits at b (it was dragged there), tb at a.
    const ta = this.tiles[b[0]][b[1]], tb = this.tiles[a[0]][a[1]];
    const s1 = ta.special, s2 = tb.special;
    const isPin = (s) => s === SP.ROW || s === SP.COL;
    if (s1 === SP.DABBA && s2 === SP.DABBA) return { consume: [a, b], seeds: [{ type: 'all', r: b[0], c: b[1] }] };
    if (s1 === SP.DABBA || s2 === SP.DABBA) {
      const other = s1 === SP.DABBA ? tb : ta;
      const dabbaPos = s1 === SP.DABBA ? b : a;
      return { consume: [dabbaPos], seeds: [{ type: 'convert', color: other.color, to: isPin(other.special) ? 'pin' : other.special, r: dabbaPos[0], c: dabbaPos[1] }] };
    }
    if (isPin(s1) && isPin(s2)) return { consume: [a, b], seeds: [{ type: 'cross', r: b[0], c: b[1], width: 1 }] };
    if (s1 === SP.COOKER && s2 === SP.COOKER) return { consume: [a, b], seeds: [{ type: 'diamond', r: b[0], c: b[1], radius: 4 }] };
    return { consume: [a, b], seeds: [{ type: 'cross', r: b[0], c: b[1], width: 3 }] };
  }

  /** Attempt to swap the tile at a into b. */
  trySwap(a, b, { free = false } = {}) {
    const [r1, c1] = a, [r2, c2] = b;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return { ok: false, reason: 'notAdjacent' };
    if (!this.isSwappable(r1, c1) || !this.isSwappable(r2, c2)) return { ok: false, reason: 'blocked' };
    const ta = this.tiles[r1][c1], tb = this.tiles[r2][c2];
    this.tiles[r1][c1] = tb; this.tiles[r2][c2] = ta;
    const phases = [{ kind: 'swap', a, b, idA: ta.id, idB: tb.id }];
    let spec;
    if (ta.special && tb.special) spec = this._comboSpec(a, b);
    else if (ta.special === SP.DABBA || tb.special === SP.DABBA) {
      const dabba = ta.special === SP.DABBA ? ta : tb;
      const other = dabba === ta ? tb : ta;
      dabba.dabbaColor = other.color;
      spec = { direct: [dabba === ta ? b : a] };
    } else {
      const groups = this.findGroups();
      if (!groups.length) {
        if (!free) {
          this.tiles[r1][c1] = ta; this.tiles[r2][c2] = tb;
          return { ok: false, reason: 'noMatch' };
        }
        if (!this.hasPossibleMove()) phases.push(this.shuffle());
        return { ok: true, phases };
      }
      spec = { groups, prefer: [k(r2, c2), k(r1, c1)] };
    }
    return { ok: true, phases: this._cascade(phases, spec) };
  }

  /** Booster: Chamach (spoon) scoops one cell. */
  useSpoon(r, c) {
    if (!this.isPlayable(r, c) || (!this.tiles[r][c] && !this.dough[r][c])) return { ok: false };
    return { ok: true, phases: this._cascade([], { direct: [[r, c]] }) };
  }

  /** Tadka: sizzles `count` tiles, preferring the given colours (what the orders still need). */
  tadka(priorityColors, count = 8) {
    const picked = [];
    const used = new Set();
    const take = (r, c) => { if (!used.has(k(r, c)) && picked.length < count) { used.add(k(r, c)); picked.push([r, c]); } };
    const tilesOf = (color) => {
      const list = [];
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++)
        if (this.colorAt(r, c) === color && !this.lock[r][c] && !this.tiles[r][c].special) list.push([r, c]);
      return this.rng.shuffle(list);
    };
    for (const color of priorityColors) for (const [r, c] of tilesOf(color)) take(r, c);
    const doughCells = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.dough[r][c]) doughCells.push([r, c]);
    for (const [r, c] of this.rng.shuffle(doughCells)) take(r, c);
    const rest = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.tiles[r][c] || this.lock[r][c]) rest.push([r, c]);
    for (const [r, c] of this.rng.shuffle(rest)) take(r, c);
    return { ok: true, phases: this._cascade([], { seeds: [{ type: 'tadka', cells: picked }] }) };
  }

  shuffle() {
    const cells = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const t = this.tiles[r][c];
      if (t && !this.lock[r][c] && !t.special) cells.push([r, c]);
    }
    const original = new Map(cells.map(([r, c]) => [this.tiles[r][c].id, [r, c]]));
    const pool = cells.map(([r, c]) => this.tiles[r][c]);
    for (let attempt = 0; attempt < 300; attempt++) {
      this.rng.shuffle(pool);
      if (attempt > 150) for (const t of pool) t.color = this.rng.int(this.nColors);
      cells.forEach(([r, c], i) => { this.tiles[r][c] = pool[i]; });
      if (!this.findGroups().length && this.hasPossibleMove()) break;
    }
    const moves = [];
    cells.forEach(([r, c]) => {
      const t = this.tiles[r][c];
      const [fr, fc] = original.get(t.id);
      moves.push({ id: t.id, fromR: fr, fromC: fc, toR: r, toC: c, color: t.color });
    });
    return { kind: 'shuffle', moves };
  }

  /** Compact text snapshot (debugging/tests). */
  toString() {
    const sym = { row: '-', col: '|', cooker: '@', dabba: '*' };
    return this.tiles.map((row, r) => row.map((t, c) => {
      if (!this.playable[r][c]) return ' ';
      if (this.dough[r][c]) return String(this.dough[r][c]);
      if (!t) return '_';
      if (t.special) return sym[t.special];
      return String.fromCharCode(97 + t.color);
    }).join('')).join('\n');
  }
}
