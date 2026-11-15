// Music theory for the procedural soundtrack: ragas chosen by the player's local time of day
// (Hindustani "samay" tradition), taals (rhythmic cycles) for the tabla, and a seeded melody
// writer that builds memorable, repeating motifs (A A B A′) so the tune becomes familiar.
// Pure functions — no Web Audio here, so it can be unit-tested in Node.

import { mulberry32, hashString } from '../engine/rng.js';

// Semitone offsets from Sa (S=0, r=1, R=2, g=3, G=4, m=5, M=6, P=7, d=8, D=9, n=10, N=11).
// `stable` = resting notes for phrase endings (Sa, Pa and the raga's vadi/samvadi).
export const RAGAS = {
  bhairav: { en: 'Bhairav', hi: 'भैरव', notes: [0, 1, 4, 5, 7, 8, 11], stable: [0, 8, 1], mood: 'dawn', voice: 'bansuri', sa: 233.08 },
  bilawal: { en: 'Bilawal', hi: 'बिलावल', notes: [0, 2, 4, 5, 7, 9, 11], stable: [0, 7, 9], mood: 'morning', voice: 'santoor', sa: 261.63 },
  sarang: { en: 'Brindavani Sarang', hi: 'बृंदावनी सारंग', notes: [0, 2, 5, 7, 10, 11], stable: [0, 2, 7], mood: 'noon', voice: 'santoor', sa: 246.94 },
  bhimpalasi: { en: 'Bhimpalasi', hi: 'भीमपलासी', notes: [0, 2, 3, 5, 7, 9, 10], stable: [0, 5, 7], mood: 'afternoon', voice: 'santoor', sa: 233.08 },
  yaman: { en: 'Yaman', hi: 'यमन', notes: [0, 2, 4, 6, 7, 9, 11], stable: [0, 4, 11], mood: 'evening', voice: 'bansuri', sa: 246.94 },
  bhupali: { en: 'Bhupali', hi: 'भूपाली', notes: [0, 2, 4, 7, 9], stable: [0, 4, 9], mood: 'evening', voice: 'santoor', sa: 261.63 },
  bageshri: { en: 'Bageshri', hi: 'बागेश्री', notes: [0, 2, 3, 5, 9, 10], stable: [0, 5, 3], mood: 'night', voice: 'bansuri', sa: 220.0 },
  malkauns: { en: 'Malkauns', hi: 'मालकौंस', notes: [0, 3, 5, 8, 10], stable: [0, 5, 3], mood: 'midnight', voice: 'bansuri', sa: 207.65, noPa: true },
};

export const MOODS = {
  dawn: { en: 'dawn', hi: 'भोर' }, morning: { en: 'morning', hi: 'सुबह' }, noon: { en: 'midday', hi: 'दोपहर' },
  afternoon: { en: 'afternoon', hi: 'तीसरा पहर' }, evening: { en: 'evening', hi: 'शाम' }, night: { en: 'night', hi: 'रात' }, midnight: { en: 'late night', hi: 'आधी रात' },
};

/** Raga for a local hour 0–23, following the traditional prahar time theory. */
export function ragaForHour(hour) {
  if (hour >= 5 && hour < 8) return 'bhairav';
  if (hour >= 8 && hour < 11) return 'bilawal';
  if (hour >= 11 && hour < 15) return 'sarang';
  if (hour >= 15 && hour < 18) return 'bhimpalasi';
  if (hour >= 18 && hour < 20) return 'bhupali';
  if (hour >= 20 && hour < 22) return 'yaman';
  if (hour >= 22) return 'bageshri';
  return 'malkauns';
}

// Taals: bols per 8th-note step. '-' = rest. Keherwa (8 beats) for play, Dadra (6) for menus.
export const TAALS = {
  keherwa: { beats: 8, bols: ['dha', '-', 'ge', 'na', 'ti', '-', 'na', 'ka', 'na', '-', 'ka', 'dhi', 'na', '-', 'dha', 'ge'], tali: [0, 8] },
  dadra: { beats: 6, bols: ['dha', '-', 'dhi', '-', 'na', '-', 'dha', '-', 'ti', '-', 'na', '-'], tali: [0, 6] },
};
// Busier "laggi"-style variation used when the music is at high intensity.
export const LAGGI = ['dha', 'ge', 'na', 'ge', 'dhi', 'na', 'ka', 'na', 'dha', 'ge', 'na', 'ge', 'ti', 'na', 'ka', 'dha'];
// Tihai: a phrase played three times that lands on sam — the classical cadence. Used for wins.
export const TIHAI = ['dha', 'ti', 'ra', 'ki', 'ta', 'dha', '-', 'dha', 'ti', 'ra', 'ki', 'ta', 'dha', '-', 'dha', 'ti', 'ra', 'ki', 'ta', 'DHA'];
// Short fill for big cascades.
export const FILL = ['ti', 'ra', 'ki', 'ta', 'dha', 'ge', 'dha'];

/** Frequency of a scale degree (0 = Sa, may be negative or above the octave) in the raga. */
export function degreeFreq(raga, degree) {
  const n = raga.notes.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return raga.sa * Math.pow(2, oct + raga.notes[idx] / 12);
}

const RHYTHMS = [
  [2, 0, 1, 1, 2, 0, 2, 0], // values = length in 8ths, 0 = continuation/rest
  [1, 1, 2, 0, 1, 1, 2, 0],
  [3, 0, 0, 1, 2, 0, 2, 0],
  [1, 1, 1, 1, 2, 0, 2, 0],
  [2, 0, 2, 0, 1, 1, 2, 0],
  [4, 0, 0, 0, 2, 0, 2, 0],
];

/**
 * Builds a melody for one 8-bar section as a list of {step, deg, len} (steps are 8ths, 8 per bar).
 * Deterministic for a given raga + seed so a raga's tune is recognisable session to session.
 * Structure A A B A′: repetition is what makes a melody catchy; B gives contrast; A′ resolves to Sa.
 */
export function composeSection(ragaId, seed = 0, density = 1) {
  const raga = RAGAS[ragaId];
  const rng = mulberry32(hashString(ragaId + ':' + seed));
  const n = raga.notes.length;
  const stableDegs = raga.stable.map((st) => raga.notes.indexOf(st)).filter((d) => d >= 0);
  const motif = (startDeg, endOnStable, bars = 2) => {
    const notes = [];
    let deg = startDeg;
    for (let bar = 0; bar < bars; bar++) {
      const rhythm = RHYTHMS[rng.int(RHYTHMS.length)];
      for (let s = 0; s < 8; s++) {
        const len = rhythm[s];
        if (!len) continue;
        if (density < 1 && rng() > density && !(bar === bars - 1 && s >= 4)) continue; // sparser at low intensity
        const r = rng();
        const stepMove = r < 0.42 ? 1 : r < 0.84 ? -1 : r < 0.92 ? 2 : -2;
        deg = Math.max(-2, Math.min(n + 4, deg + stepMove));
        notes.push({ step: bar * 8 + s, deg, len });
      }
    }
    if (endOnStable && notes.length) {
      const last = notes[notes.length - 1];
      const target = stableDegs[rng.int(stableDegs.length)];
      // pick the stable degree in the octave closest to where the phrase is
      const cands = [target - n, target, target + n];
      last.deg = cands.reduce((a, b) => (Math.abs(b - last.deg) < Math.abs(a - last.deg) ? b : a));
    }
    return notes;
  };
  const A = motif(stableDegs[0] + 1, true);
  const B = motif(Math.min(n + 2, stableDegs[stableDegs.length - 1] + 2), true);
  const A2 = A.map((x) => ({ ...x }));
  if (A2.length) A2[A2.length - 1].deg = 0; // A′ comes home to Sa
  const out = [];
  [A, A, B, A2].forEach((part, i) => part.forEach((x) => out.push({ ...x, step: x.step + i * 16 })));
  return out;
}
