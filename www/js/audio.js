// Synthesised Indian soundtrack + sound effects (no audio files — tiny APK, works offline).
//
//  • Music follows the player's local time of day (raga samay): Bhairav at dawn, Sarang at noon,
//    Yaman in the evening, Malkauns late at night (see music/theory.js).
//  • Layers: tanpura drone → tabla theka (Keherwa in play, Dadra in menus) → santoor/bansuri melody
//    → manjira/shaker. An "intensity" value (combos, last few moves) brings layers in and out.
//  • Every sound effect is tuned to the current raga, so matches always sound in key with the music.
//  • Wins end on a tabla tihai — the classical three-times cadence that lands on sam.
//  • Scheduling uses the audio clock with a short look-ahead (stable even on slow phones).

import { RAGAS, MOODS, TAALS, LAGGI, TIHAI, FILL, ragaForHour, degreeFreq, composeSection } from './music/theory.js';

const LOOKAHEAD = 0.18;  // seconds scheduled ahead of the audio clock
const TICK_MS = 40;

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfx = true;
    this.music = true;
    this.lastLand = 0;
    this.scene = 'menu';
    this.intensity = 0;
    this.intensityFloor = 0;
    this.ragaId = ragaForHour(new Date().getHours());
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.section = null;
    this.sectionIdx = 0;
    this.pending = [];       // one-off tabla phrases (fills, tihai) queued onto the beat grid
    this.lastBansuri = null;
  }

  get raga() { return RAGAS[this.ragaId]; }
  ragaInfo() { const r = this.raga; return { id: this.ragaId, en: r.en, hi: r.hi, mood: MOODS[r.mood] }; }

  // ---------------------------------------------------------------- lifecycle
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(comp);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0; this.musicBus.connect(this.master);
      // a little room reverb for the music (feedback delay network-lite)
      const d = this.ctx.createDelay(); d.delayTime.value = 0.13;
      const fb = this.ctx.createGain(); fb.gain.value = 0.28;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      this.verb = this.ctx.createGain(); this.verb.gain.value = 0.22;
      this.verb.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(this.musicBus);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.music) this._startMusic();
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); this.nextTime = this.ctx.currentTime + 0.05; } }

  setSfx(on) { this.sfx = on; }
  setMusic(on) {
    this.music = on;
    if (on && this.ctx) this._startMusic(); else this._stopMusic();
  }

  /** 'menu' (Dadra, gentle) or 'game' (Keherwa, fuller). */
  setScene(scene) {
    if (scene === this.scene) return;
    this.scene = scene;
    this.intensity = scene === 'game' ? 0.35 : 0;
    this.intensityFloor = scene === 'game' ? 0.25 : 0;
    this.step = 0; // restart the taal cycle on sam
    this.section = null;
  }
  /** Raise the energy briefly (combos) — decays on its own. */
  pulse(amount = 0.2) { this.intensity = Math.min(1, this.intensity + amount); }
  /** Sustained tension, e.g. when only a few moves are left. */
  setTension(on) { this.intensityFloor = this.scene === 'game' ? (on ? 0.75 : 0.25) : 0; }
  /** Re-check the raga (call when the app returns to the foreground). */
  refreshRaga() {
    const id = ragaForHour(new Date().getHours());
    if (id !== this.ragaId) { this.ragaId = id; this.section = null; }
  }

  _ok() { return this.sfx && this.ctx && this.ctx.state === 'running'; }
  _musicOk() { return this.music && this.ctx && this.ctx.state === 'running'; }

  // ---------------------------------------------------------------- synthesis primitives
  _tone(freq, { dur = 0.3, type = 'sine', vol = 0.2, attack = 0.005, when = 0, bend = 0, out, at } = {}) {
    const t = at != null ? at : this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * bend), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    return g;
  }

  _noise({ dur = 0.3, vol = 0.2, type = 'bandpass', freq = 1000, q = 1, when = 0, sweepTo, out, at } = {}) {
    const t = at != null ? at : this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out || this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // Santoor: bright hammered strings — several inharmonic partials and a quick double strike.
  _santoor(freq, at, vol, out, len = 1) {
    const partials = [[1, 1], [2.01, 0.45], [3.02, 0.22], [4.1, 0.1]];
    for (const [m, a] of partials) this._tone(freq * m, { at, dur: 0.9 / m + 0.25, type: m === 1 ? 'triangle' : 'sine', vol: vol * a, attack: 0.003, out });
    if (len >= 2) for (const k of [1, 2]) this._tone(freq, { at: at + k * 0.075, dur: 0.35, type: 'triangle', vol: vol * 0.35, attack: 0.003, out });
  }

  // Bansuri: breathy flute with vibrato and a meend (glide) from the previous note.
  _bansuri(freq, at, dur, vol, out) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'sine';
    const from = this.lastBansuri && Math.abs(this.lastBansuri / freq - 1) < 0.5 ? this.lastBansuri : freq;
    o.frequency.setValueAtTime(from, at);
    o.frequency.exponentialRampToValueAtTime(freq, at + 0.07);
    this.lastBansuri = freq;
    lfo.frequency.value = 5.2; lg.gain.value = freq * 0.006;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.06);
    g.gain.setValueAtTime(vol * 0.85, at + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.12);
    o.connect(g); g.connect(out);
    o.start(at); lfo.start(at); o.stop(at + dur + 0.2); lfo.stop(at + dur + 0.2);
    this._tone(freq * 2, { at, dur: dur * 0.8, vol: vol * 0.12, attack: 0.05, out });
    this._noise({ at, dur: Math.min(0.25, dur), vol: vol * 0.25, type: 'bandpass', freq: freq * 2, q: 4, out });
  }

  // Tanpura pluck: buzzy sawtooth (jawari) through a moving filter, long decay.
  _tanpura(freq, at, out) {
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(freq * 6, at); f.frequency.exponentialRampToValueAtTime(freq * 2, at + 2.4);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.05, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 2.8);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(at); o.stop(at + 2.9);
  }

  // Tabla bols. Dayan (right, tuned to Sa) + bayan (left, bass with pitch glide).
  _bol(bol, at, vol, out) {
    const sa = this.raga.sa * 2;
    const dayan = (v = 1, dur = 0.28) => {
      this._tone(sa, { at, dur, vol: vol * 0.5 * v, attack: 0.002, out });
      this._tone(sa * 2.0, { at, dur: dur * 0.6, vol: vol * 0.18 * v, attack: 0.002, out });
      this._tone(sa * 2.95, { at, dur: dur * 0.4, vol: vol * 0.1 * v, attack: 0.002, out });
      this._noise({ at, dur: 0.03, vol: vol * 0.25 * v, type: 'highpass', freq: 3000, out });
    };
    const bayan = (v = 1, glideUp = false, dur = 0.42) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(glideUp ? 68 : 120, at);
      o.frequency.exponentialRampToValueAtTime(glideUp ? 100 : 72, at + (glideUp ? 0.18 : 0.12));
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol * 0.9 * v, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + dur + 0.05);
    };
    const click = (v = 1) => this._noise({ at, dur: 0.045, vol: vol * 0.45 * v, type: 'lowpass', freq: 500, out });
    switch (bol) {
      case 'dha': bayan(); dayan(); break;
      case 'DHA': bayan(1.4, true, 0.8); dayan(1.4, 0.6); break;
      case 'dhi': bayan(0.8); dayan(0.7, 0.18); break;
      case 'ge': bayan(0.8, true); break;
      case 'na': case 'ta': dayan(0.9); break;
      case 'tin': case 'ti': dayan(0.55, 0.12); break;
      case 'ka': case 'ke': case 'ki': click(); break;
      case 'ra': this._noise({ at, dur: 0.04, vol: vol * 0.3, type: 'bandpass', freq: 2200, q: 2, out }); break;
      default: break;
    }
  }

  _manjira(at, vol, out) {
    this._tone(2793, { at, dur: 0.7, vol: vol * 0.25, attack: 0.002, out });
    this._tone(4186 * 1.01, { at, dur: 0.5, vol: vol * 0.15, attack: 0.002, out });
  }

  // ---------------------------------------------------------------- music sequencer
  _startMusic() {
    if (!this.ctx || this.timer) return;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0.75, this.ctx.currentTime, 0.8); // gentle fade-in
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._schedule(), TICK_MS);
  }

  _stopMusic() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  _schedule() {
    if (!this._musicOk()) { if (this.ctx) this.nextTime = this.ctx.currentTime + 0.05; return; }
    // let one-off energy decay back toward the floor
    this.intensity += (this.intensityFloor - this.intensity) * 0.006;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      this._playStep(this.step, this.nextTime);
      const bpm = this.scene === 'game' ? 92 + this.intensity * 14 : 76;
      this.nextTime += 30 / bpm; // one 8th note
      this.step++;
    }
  }

  _playStep(step, at) {
    const out = this.musicBus;
    const game = this.scene === 'game';
    const taal = TAALS[game ? 'keherwa' : 'dadra'];
    const cycle = taal.bols.length;
    const pos = step % cycle;
    const I = this.intensity;

    // tanpura: Pa – Sa' – Sa' – Sa (Ma for ragas without Pa), one pluck per beat pair
    if (pos % 4 === 0) {
      const sa = this.raga.sa / 2;
      const seq = [this.raga.noPa ? sa * Math.pow(2, 5 / 12) : sa * 1.5, sa * 2, sa * 2, sa];
      this._tanpura(seq[(step / 4) % 4 | 0], at, out);
    }

    // tabla — queued fills / tihai take over the grid when present
    if (this.pending.length) {
      const bol = this.pending.shift();
      if (bol !== '-') this._bol(bol, at, 0.16, out);
    } else if (game || step >= cycle * 2) { // menus: tabla joins after two cycles of just drone
      const bols = game && I > 0.7 ? LAGGI : taal.bols;
      const bol = bols[pos % bols.length];
      if (bol !== '-') this._bol(bol, at, game ? 0.13 : 0.09, out);
    }

    // manjira on the tali beats, shaker on off-beats when energetic
    if (taal.tali.includes(pos) && (game || I > 0.2)) this._manjira(at, 0.5 + I * 0.5, out);
    if (game && I > 0.55 && step % 2 === 1) this._noise({ at, dur: 0.05, vol: 0.03 + I * 0.03, type: 'highpass', freq: 6000, out });

    // melody: 64-step (8-bar) sections, sparse in menus, fuller with intensity
    const secPos = step % 64;
    if (secPos === 0 || !this.section) {
      this.sectionIdx = Math.floor(step / 64);
      const density = game ? 0.55 + I * 0.45 : 0.45;
      // alternate composed sections with a rest section so the tune breathes and never fatigues
      const rest = !game && this.sectionIdx % 3 === 2;
      this.section = rest ? [] : composeSection(this.ragaId, this.sectionIdx % 2, density);
      this.sectionMap = new Map(this.section.map((n) => [n.step, n]));
    }
    const note = this.sectionMap.get(secPos);
    if (note) {
      const f = degreeFreq(this.raga, note.deg + this.raga.notes.length); // one octave above Sa
      const eighth = 30 / (game ? 92 + I * 14 : 76);
      const mvol = game ? 0.07 + I * 0.03 : 0.055;
      if (this.raga.voice === 'bansuri') this._bansuri(f, at, note.len * eighth, mvol, out);
      else this._santoor(f, at, mvol, out, note.len);
      if (this.verb) this._tone(f, { at, dur: 0.4, vol: mvol * 0.3, out: this.verb });
    }
  }

  _queue(bols) { this.pending = [...bols]; }

  // ---------------------------------------------------------------- sound effects (all in the raga)
  note(i) { return degreeFreq(this.raga, Math.max(0, i)); }
  _pluck(freq, vol = 0.18, when = 0) {
    this._tone(freq, { dur: 0.6, type: 'triangle', vol, when });
    this._tone(freq * 2, { dur: 0.25, type: 'sine', vol: vol * 0.45, when });
    this._tone(freq * 3.01, { dur: 0.12, type: 'sine', vol: vol * 0.2, when });
  }

  tap() { if (!this._ok()) return; this._tone(330, { dur: 0.12, vol: 0.16, bend: 0.7 }); this._noise({ dur: 0.04, vol: 0.07, freq: 3000 }); }
  swap() { if (!this._ok()) return; this._tone(900, { dur: 0.07, vol: 0.05, bend: 0.8 }); }
  invalid() { if (!this._ok()) return; this._tone(220, { dur: 0.12, type: 'square', vol: 0.04 }); this._tone(180, { dur: 0.16, type: 'square', vol: 0.04, when: 0.08 }); }
  match(cascade = 1) {
    if (!this._ok()) return;
    const n = this.raga.notes.length;
    const base = n + Math.min(cascade - 1, n + 2); // climbs the raga with every cascade
    this._pluck(this.note(base));
    this._pluck(this.note(base + 2), 0.1, 0.06);
    if (cascade >= 2) this.pulse(0.12);
  }
  cheer(cascade) {
    if (!this._ok()) return;
    const n = this.raga.notes.length;
    for (let i = 0; i < 4; i++) this._pluck(this.note(n + cascade + i), 0.12, i * 0.07);
    if (cascade >= 3) { this.pulse(0.3); if (this.music) this._queue(FILL); }
  }
  special() {
    if (!this._ok()) return;
    const n = this.raga.notes.length;
    this._pluck(this.note(n + 4), 0.16); this._pluck(this.note(n + 6), 0.14, 0.08);
    this._ghungroo(0.12);
    this.pulse(0.15);
  }
  _ghungroo(when = 0) { // ankle bells: a cluster of tiny bright jingles
    for (let i = 0; i < 6; i++) this._tone(5200 + Math.random() * 1800, { dur: 0.09, vol: 0.035, when: when + i * 0.025 + Math.random() * 0.01 });
  }
  whoosh() { if (!this._ok()) return; this._noise({ dur: 0.35, vol: 0.22, freq: 400, sweepTo: 4000, q: 0.8 }); }
  whistle() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.linearRampToValueAtTime(1900, t + 0.5);
    lfo.frequency.value = 28; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); lfo.start(t); o.stop(t + 0.65); lfo.stop(t + 0.65);
    this._noise({ dur: 0.5, vol: 0.1, type: 'highpass', freq: 3000 });
  }
  dabba() { if (!this._ok()) return; const n = this.raga.notes.length; for (let i = 0; i < n + 1; i++) this._pluck(this.note(n + i), 0.11, i * 0.045); this._ghungroo(0.3); }
  sizzle() { if (!this._ok()) return; this._noise({ dur: 0.8, vol: 0.16, type: 'highpass', freq: 2500 }); this._noise({ dur: 0.5, vol: 0.09, type: 'bandpass', freq: 6000, q: 2, when: 0.1 }); }
  thud() { if (!this._ok()) return; this._tone(140, { dur: 0.18, vol: 0.18, bend: 0.5 }); }
  clink() { if (!this._ok()) return; this._tone(2100, { dur: 0.25, vol: 0.06 }); this._tone(2950, { dur: 0.2, vol: 0.045 }); }
  land() {
    if (!this._ok()) return;
    const now = performance.now();
    if (now - this.lastLand < 120) return;
    this.lastLand = now;
    this._tone(260, { dur: 0.06, vol: 0.045, bend: 0.8 });
  }
  shuffle() { if (!this._ok()) return; for (let i = 0; i < 5; i++) this._noise({ dur: 0.08, vol: 0.1, freq: 2000 + i * 300, when: i * 0.06 }); }
  coin() { if (!this._ok()) return; this._tone(this.note(this.raga.notes.length * 2), { dur: 0.12, vol: 0.07 }); this._tone(this.note(this.raga.notes.length * 2 + 2), { dur: 0.2, vol: 0.07, when: 0.07 }); }
  star(i) { if (!this._ok()) return; const n = this.raga.notes.length; this._pluck(this.note(n + 2 + i * 2), 0.2); this._ghungroo(0.02); }
  ding() { if (!this._ok()) return; this._pluck(this.note(this.raga.notes.length + 4), 0.14); }

  /** Level won: ascending raga run + a tabla tihai that lands on sam. */
  win() {
    if (!this._ok()) return;
    const n = this.raga.notes.length;
    for (let i = 0; i <= n; i++) this._pluck(this.note(n + i), 0.15, i * 0.08);
    [0, 2, 4].forEach((k) => this._tone(this.note(2 * n + k), { dur: 1.3, vol: 0.045, when: 0.6, type: 'triangle' }));
    if (this.ctx) { // the tihai plays even if music is off — it is the "win" sound
      const out = this.sfxBus;
      const t0 = this.ctx.currentTime + 0.05;
      TIHAI.forEach((bol, i) => { if (bol !== '-') this._bol(bol, t0 + i * 0.085, 0.2, out); });
    }
    this.pulse(0.5);
  }
  /** Signature dish / recipe unlocked: a shankh (conch) call before the win run. */
  shankh() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(this.raga.sa / 2, t); o.frequency.linearRampToValueAtTime(this.raga.sa / 2 * 1.02, t + 1.2);
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1600, t + 0.6); f.frequency.linearRampToValueAtTime(900, t + 1.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.35); g.gain.setValueAtTime(0.14, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    o.connect(f); f.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + 1.8);
  }
  lose() { if (!this._ok()) return; const n = this.raga.notes.length; [n + 3, n + 2, n + 1, n].forEach((d, i) => this._pluck(this.note(d) / 2, 0.13, i * 0.15)); }
}

export const sound = new SoundEngine();
