import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RAGAS, ragaForHour, composeSection, degreeFreq, TAALS, TIHAI } from '../www/js/music/theory.js';
import { questsForDate, ensureQuests, questEvent, claimable } from '../www/js/game/quests.js';

test('every hour of the day maps to a known raga, following time theory', () => {
  for (let h = 0; h < 24; h++) assert.ok(RAGAS[ragaForHour(h)], `hour ${h}`);
  assert.equal(ragaForHour(6), 'bhairav');  // dawn
  assert.equal(ragaForHour(13), 'sarang');  // midday
  assert.equal(ragaForHour(21), 'yaman');   // evening
  assert.equal(ragaForHour(2), 'malkauns'); // late night
});

test('ragas are well-formed: start on Sa, ascending notes, stable notes in the scale', () => {
  for (const [id, r] of Object.entries(RAGAS)) {
    assert.equal(r.notes[0], 0, id);
    for (let i = 1; i < r.notes.length; i++) assert.ok(r.notes[i] > r.notes[i - 1], id);
    for (const s of r.stable) assert.ok(r.notes.includes(s), `${id} stable ${s}`);
    if (r.noPa) assert.ok(!r.notes.includes(7), `${id} should omit Pa`);
  }
});

test('composed melodies only use raga notes, are deterministic and resolve to Sa', () => {
  for (const id of Object.keys(RAGAS)) {
    const a = composeSection(id, 0, 1), b = composeSection(id, 0, 1);
    assert.deepEqual(a, b, 'deterministic');
    assert.ok(a.length >= 8, `${id} has notes`);
    const r = RAGAS[id];
    const allowed = new Set();
    for (let d = -10; d < 30; d++) allowed.add(Math.round(degreeFreq(r, d) * 100));
    for (const n of a) {
      assert.ok(allowed.has(Math.round(degreeFreq(r, n.deg) * 100)));
      assert.ok(n.step >= 0 && n.step < 64);
    }
    // A A B A′ form: the first motif repeats exactly in bars 3–4
    const A1 = a.filter((n) => n.step < 16).map((n) => [n.step, n.deg]);
    const A2 = a.filter((n) => n.step >= 16 && n.step < 32).map((n) => [n.step - 16, n.deg]);
    assert.deepEqual(A1, A2);
    assert.equal(a[a.length - 1].deg, 0, `${id} ends on Sa`);
  }
});

test('taals and tihai have the right lengths', () => {
  assert.equal(TAALS.keherwa.bols.length, 16);
  assert.equal(TAALS.dadra.bols.length, 12);
  assert.equal(TIHAI.filter((b) => b.toLowerCase() === 'dha').length, 6); // phrase ends ×3 + final sam
  assert.equal(TIHAI[TIHAI.length - 1], 'DHA');
});

test('daily quests: 3 distinct, deterministic per date, progress + claim', () => {
  const q1 = questsForDate('2026-11-15', 20), q2 = questsForDate('2026-11-15', 20);
  assert.deepEqual(q1, q2);
  assert.equal(new Set(q1.map((q) => q.id)).size, 3);
  assert.notDeepEqual(questsForDate('2026-11-16', 20).map((q) => q.id + q.target), q1.map((q) => q.id + q.target));
  const save = { unlocked: 20 };
  ensureQuests(save, '2026-11-15');
  const quest = save.quests.list[0];
  let done = [];
  for (let i = 0; i < 100 && !done.length; i++) done = questEvent(save, quest.id, quest.id === 'cascade' ? quest.target : 1, { color: quest.color });
  assert.equal(done.length, 1);
  assert.equal(claimable(save), 1);
  assert.equal(questEvent(save, quest.id, 5, { color: quest.color }).length, 0, 'no double completion');
  ensureQuests(save, '2026-11-16');
  assert.equal(save.quests.date, '2026-11-16');
  assert.equal(claimable(save), 0);
});

test('early players do not get quests for mechanics they have not met', () => {
  for (let d = 1; d <= 28; d++) {
    const ids = questsForDate(`2026-02-${String(d).padStart(2, '0')}`, 2).map((q) => q.id);
    assert.ok(!ids.includes('tadka') && !ids.includes('special'));
  }
});
