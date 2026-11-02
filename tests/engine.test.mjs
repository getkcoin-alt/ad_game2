import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Board, SP } from '../www/js/engine/board.js';
import { mulberry32 } from '../www/js/engine/rng.js';
import { getLevel, getDailyLevel, TOTAL_LEVELS } from '../www/js/engine/levels.js';
import { GameSession, TADKA_MAX } from '../www/js/game/session.js';

const mk = (layout, colors = 5, seed = 1) => new Board({ layout, colors }, mulberry32(seed));

function invariants(b) {
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
    if (!b.playable[r][c]) assert.equal(b.tiles[r][c], null, `hole ${r},${c} has tile`);
    if (b.dough[r][c]) assert.equal(b.tiles[r][c], null, `dough ${r},${c} has tile`);
  }
  const ids = new Set();
  for (const row of b.tiles) for (const t of row) if (t) { assert.ok(!ids.has(t.id), 'duplicate id'); ids.add(t.id); }
}

test('initial board has no matches and at least one move', () => {
  for (let s = 1; s <= 50; s++) {
    const b = mk(Array(8).fill('........'), 5, s);
    assert.equal(b.findGroups().length, 0);
    assert.ok(b.hasPossibleMove());
    invariants(b);
  }
});

test('fixed layout letters are respected', () => {
  const b = mk(['abca', 'bcab', 'aabc']);
  assert.equal(b.tiles[0][0].color, 0);
  assert.equal(b.tiles[1][2].color, 0);
  assert.equal(b.tiles[2][3].color, 2);
});

test('simple swap clears three and refills', () => {
  // swap (0,2) 'c' with (1,2) 'a' → row 0 becomes a a a
  const b = mk(['aacd', 'bdab', 'cbdc', 'dcbd']);
  const res = b.trySwap([1, 2], [0, 2]);
  assert.ok(res.ok);
  const clear = res.phases.find((p) => p.kind === 'clear');
  assert.equal(clear.collected[0], 3);
  invariants(b);
  for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) assert.ok(b.tiles[r][c]);
});

test('invalid swap is reverted', () => {
  const b = mk(['abcd', 'bcda', 'cdab', 'dabc']);
  const before = b.toString();
  assert.equal(b.trySwap([0, 0], [0, 1]).ok, false);
  assert.equal(b.toString(), before);
  assert.equal(b.trySwap([0, 0], [2, 2]).reason, 'notAdjacent');
});

test('four in a row creates a rolling pin at the swap target', () => {
  const b = mk(['aaba', 'cdac', 'dcdb', 'cdcd']);
  const res = b.trySwap([1, 2], [0, 2]);
  assert.ok(res.ok);
  const created = res.phases[1].created;
  assert.equal(created.length, 1);
  assert.equal(created[0].special, SP.ROW);
  assert.deepEqual([created[0].r, created[0].c], [0, 2]);
});

test('five in a row creates a masala dabba', () => {
  const b5 = mk(['aabaa', 'cdadc', 'dcbcd', 'cdcdb']);
  const r5 = b5.trySwap([1, 2], [0, 2]);
  assert.equal(r5.phases[1].created[0].special, SP.DABBA);

});

test('L-shape match produces a cooker', () => {
  const b = mk(['abcd', 'acdb', 'caab', 'adbc']);
  const res = b.trySwap([3, 0], [2, 0]);
  assert.ok(res.ok);
  assert.equal(res.phases[1].created[0].special, SP.COOKER);
  assert.deepEqual([res.phases[1].created[0].r, res.phases[1].created[0].c], [2, 0]);
});

test('rolling pin clears its whole row when matched', () => {
  const b = mk(['abcdab', 'bcdabc', 'cdabcd', 'dabcda']);
  b.tiles[1][0].special = SP.ROW; // 'b' at (1,0) is a row pin
  // make a vertical match on column 0 including the pin: col0 = a b c d → set (0,0) b and (2,0) b
  b.tiles[0][0].color = 1; b.tiles[2][0].color = 1;
  b.tiles[0][1].color = 4; // avoid incidental matches
  const res = b._cascade([], { groups: b.findGroups() });
  const first = res[0];
  assert.ok(first.activated.some((a) => a.special === SP.ROW));
  assert.ok(first.cleared.length >= 6 + 2);
  invariants(b);
});

test('dabba swapped with a colour clears every tile of that colour', () => {
  const b = mk(Array(6).fill('......'), 5, 7);
  b.tiles[0][0].special = SP.DABBA; b.tiles[0][0].color = -1;
  const target = b.tiles[0][1].color;
  let count = 0;
  for (const row of b.tiles) for (const t of row) if (t && t.color === target && !t.special) count++;
  const res = b.trySwap([0, 0], [0, 1]);
  assert.ok(res.ok);
  assert.ok((res.phases[1].collected[target] || 0) >= count);
  invariants(b);
});

test('special + special combos are always valid swaps', () => {
  const b = mk(Array(6).fill('......'), 5, 3);
  b.tiles[2][2].special = SP.ROW; b.tiles[2][3].special = SP.COOKER;
  const res = b.trySwap([2, 2], [2, 3]);
  assert.ok(res.ok);
  const clear = res.phases[1];
  assert.ok(clear.activated.some((a) => a.type === 'cross' && a.width === 3));
  invariants(b);
});

test('dough is hit by adjacent matches and never holds tiles', () => {
  const b = mk(['aacd', 'bdab', 'cbdc', '1111'], 5);
  assert.equal(b.totalDough(), 4);
  const res = b.trySwap([1, 2], [0, 2]);
  assert.ok(res.ok);
  invariants(b);
  // row 0 match is not adjacent to dough row (row 3), so dough intact
  assert.equal(b.totalDough(), 4 - res.phases.filter((p) => p.kind === 'clear').reduce((s, p) => s + p.doughHits, 0));
});

test('locked tile is unlocked by a match but stays in place', () => {
  const b = mk(['aacd', 'bdab', 'cbdc', 'dcbd']);
  b.lock[0][0] = 1;
  const id = b.tiles[0][0].id;
  const res = b.trySwap([1, 2], [0, 2]);
  assert.ok(res.ok);
  assert.equal(b.lock[0][0], 0);
  assert.equal(res.phases[1].unlocked.length, 1);
  // the formerly-locked tile was not consumed by the match (it may have fallen by now)
  assert.ok(!res.phases[1].cleared.some((x) => x.id === id));
});

test('locked tiles cannot be swapped', () => {
  const b = mk(['aacd', 'bdab', 'cbdc', 'dcbd']);
  b.lock[1][2] = 1;
  assert.equal(b.trySwap([1, 2], [0, 2]).ok, false);
});

test('gravity fills cells under dough via diagonal slides', () => {
  const b = mk(['....', '.1..', '....', '....'], 5, 9);
  b.tiles[2][1] = null; b.tiles[3][1] = null;
  b.applyGravity();
  assert.ok(b.tiles[2][1] && b.tiles[3][1], 'sheltered cells refilled');
  invariants(b);
});

test('shuffle keeps tiles, removes matches and leaves a move', () => {
  const b = mk(Array(7).fill('.......'), 5, 11);
  const ids = new Set(b.tiles.flat().filter(Boolean).map((t) => t.id));
  const p = b.shuffle();
  assert.equal(p.kind, 'shuffle');
  assert.deepEqual(new Set(b.tiles.flat().filter(Boolean).map((t) => t.id)), ids);
  assert.equal(b.findGroups().length, 0);
  assert.ok(b.hasPossibleMove());
});

test('random play never breaks invariants (fuzz)', () => {
  for (let lv = 1; lv <= TOTAL_LEVELS; lv += 3) {
    const level = getLevel(lv);
    const s = new GameSession(level);
    const rng = mulberry32(lv);
    let turns = 0;
    while (s.state === 'playing' && turns++ < 200) {
      const moves = s.board.listMoves();
      assert.ok(moves.length > 0, `level ${lv} deadlocked`);
      const [a, b] = moves[rng.int(moves.length)];
      const res = s.swap(a, b);
      assert.ok(res.ok, 'listed move must be valid');
      if (rng() < 0.1 && s.tadkaReady()) s.useTadka();
      invariants(s.board);
    }
  }
});

test('all levels build with sane parameters', () => {
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const l = getLevel(n);
    assert.ok(l.moves >= 10 && l.moves <= 45, `level ${n} moves ${l.moves}`);
    assert.ok(l.dishes.length >= 1);
    for (const d of l.dishes) for (const it of d.items) {
      assert.ok(it.need > 0);
      if (it.kind === 'ing') assert.ok(it.color < l.colors, `level ${n} colour out of range`);
    }
    const b = new Board(l, mulberry32(l.seed));
    if (l.dishes.some((d) => d.items.some((it) => it.kind === 'dough'))) {
      const need = l.dishes.flatMap((d) => d.items).find((it) => it.kind === 'dough').need;
      assert.equal(b.totalDough(), need);
    }
    assert.ok(b.hasPossibleMove(), `level ${n} starts with no move`);
  }
  assert.equal(getDailyLevel('2026-11-02').dailyKey, '2026-11-02');
  assert.deepEqual(getDailyLevel('2026-11-02').layout, getDailyLevel('2026-11-02').layout);
});

test('session credits dishes, tracks tadka and supports continues', () => {
  const s = new GameSession(getLevel(2));
  s.movesLeft = 1;
  const [a, b] = s.board.listMoves()[0];
  s.swap(a, b);
  if (s.state === 'lost') {
    assert.ok(s.addMoves(5));
    assert.equal(s.movesLeft, 5);
    assert.equal(s.state, 'playing');
  }
  s.tadka = TADKA_MAX;
  const before = s.progressRatio();
  const r = s.useTadka();
  assert.ok(r.ok);
  assert.ok(s.progressRatio() >= before);
  assert.equal(s.tadka >= 0, true);
});
