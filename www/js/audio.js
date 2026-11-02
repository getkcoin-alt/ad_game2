// Synthesised sound (no audio files): santoor-like plucks on the Bhupali pentatonic scale,
// tabla-ish taps, a pressure-cooker whistle and a soft tanpura drone. Tiny APK, zero loading.

const BHUPALI = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3, 4];
const SA = 392; // G4 as Sa — warm and not shrill on phone speakers

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.sfx = true;
    this.music = false;
    this.lastLand = 0;
    this.droneTimer = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.music) this._startDrone();
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setSfx(on) { this.sfx = on; }
  setMusic(on) {
    this.music = on;
    if (on && this.ctx) this._startDrone(); else this._stopDrone();
  }

  _ok() { return this.sfx && this.ctx && this.ctx.state === 'running'; }

  _tone(freq, { dur = 0.3, type = 'sine', vol = 0.2, attack = 0.005, when = 0, bend = 0, out } = {}) {
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * bend), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _noise({ dur = 0.3, vol = 0.2, type = 'bandpass', freq = 1000, q = 1, when = 0, sweepTo } = {}) {
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  _pluck(freq, vol = 0.18, when = 0) {
    this._tone(freq, { dur: 0.6, type: 'triangle', vol, when });
    this._tone(freq * 2, { dur: 0.25, type: 'sine', vol: vol * 0.45, when });
    this._tone(freq * 3.01, { dur: 0.12, type: 'sine', vol: vol * 0.2, when });
  }

  note(i) { return SA * BHUPALI[Math.max(0, Math.min(BHUPALI.length - 1, i))]; }

  tap() { if (!this._ok()) return; this._tone(330, { dur: 0.12, vol: 0.18, bend: 0.7 }); this._noise({ dur: 0.04, vol: 0.08, freq: 3000 }); }
  swap() { if (!this._ok()) return; this._tone(900, { dur: 0.07, vol: 0.06, bend: 0.8 }); }
  invalid() { if (!this._ok()) return; this._tone(220, { dur: 0.12, type: 'square', vol: 0.05 }); this._tone(180, { dur: 0.16, type: 'square', vol: 0.05, when: 0.08 }); }
  match(cascade = 1) {
    if (!this._ok()) return;
    const base = Math.min(cascade - 1, 6);
    this._pluck(this.note(base + 1));
    this._pluck(this.note(base + 3), 0.1, 0.06);
  }
  cheer(cascade) {
    if (!this._ok()) return;
    for (let i = 0; i < 4; i++) this._pluck(this.note(cascade + i), 0.12, i * 0.07);
  }
  special() { if (!this._ok()) return; this._pluck(this.note(5), 0.16); this._pluck(this.note(7), 0.14, 0.08); this._tone(this.note(9), { dur: 0.5, vol: 0.06, when: 0.12 }); }
  whoosh() { if (!this._ok()) return; this._noise({ dur: 0.35, vol: 0.25, freq: 400, sweepTo: 4000, q: 0.8 }); }
  whistle() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.linearRampToValueAtTime(1900, t + 0.5);
    lfo.frequency.value = 28; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(this.master);
    o.start(t); lfo.start(t); o.stop(t + 0.65); lfo.stop(t + 0.65);
    this._noise({ dur: 0.5, vol: 0.12, type: 'highpass', freq: 3000 });
  }
  dabba() { if (!this._ok()) return; for (let i = 0; i < 7; i++) this._pluck(this.note(i + 2), 0.12, i * 0.05); }
  sizzle() { if (!this._ok()) return; this._noise({ dur: 0.8, vol: 0.18, type: 'highpass', freq: 2500 }); this._noise({ dur: 0.5, vol: 0.1, type: 'bandpass', freq: 6000, q: 2, when: 0.1 }); }
  thud() { if (!this._ok()) return; this._tone(140, { dur: 0.18, vol: 0.2, bend: 0.5 }); }
  clink() { if (!this._ok()) return; this._tone(2100, { dur: 0.25, vol: 0.07 }); this._tone(2950, { dur: 0.2, vol: 0.05 }); }
  land() {
    if (!this._ok()) return;
    const now = performance.now();
    if (now - this.lastLand < 120) return;
    this.lastLand = now;
    this._tone(260, { dur: 0.06, vol: 0.05, bend: 0.8 });
  }
  shuffle() { if (!this._ok()) return; for (let i = 0; i < 5; i++) this._noise({ dur: 0.08, vol: 0.12, freq: 2000 + i * 300, when: i * 0.06 }); }
  coin() { if (!this._ok()) return; this._tone(1320, { dur: 0.12, vol: 0.08 }); this._tone(1760, { dur: 0.2, vol: 0.08, when: 0.07 }); }
  star(i) { if (!this._ok()) return; this._pluck(this.note(4 + i * 2), 0.2); }
  win() {
    if (!this._ok()) return;
    [0, 1, 2, 3, 4, 5].forEach((n, i) => this._pluck(this.note(n), 0.16, i * 0.09));
    [5, 7, 8].forEach((n) => this._tone(this.note(n), { dur: 1.2, vol: 0.05, when: 0.6, type: 'triangle' }));
  }
  lose() { if (!this._ok()) return; [4, 3, 2, 0].forEach((n, i) => this._pluck(this.note(n) / 2, 0.14, i * 0.15)); }
  ding() { if (!this._ok()) return; this._pluck(this.note(7), 0.14); }

  // Soft tanpura-style drone: Pa – Sa – Sa – Sa (low), long decays.
  _startDrone() {
    if (this.droneTimer || !this.ctx) return;
    const pattern = [SA * 0.75 / 2, SA / 2, SA / 2, SA / 4];
    let i = 0;
    const tick = () => {
      if (!this.music || !this.ctx || this.ctx.state !== 'running') return;
      const f = pattern[i++ % pattern.length];
      this._tone(f, { dur: 2.6, type: 'triangle', vol: 0.035, attack: 0.02 });
      this._tone(f * 2, { dur: 2.2, type: 'sine', vol: 0.012, attack: 0.03 });
      this._tone(f * 5, { dur: 1.2, type: 'sine', vol: 0.004, attack: 0.1 });
    };
    tick();
    this.droneTimer = setInterval(tick, 1100);
  }
  _stopDrone() { clearInterval(this.droneTimer); this.droneTimer = null; }
}

export const sound = new SoundEngine();
