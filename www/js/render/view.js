// Board renderer + input. Replays engine "phases" as animations on a single full-screen canvas
// (so collected ingredients can fly up into the order cards). The render loop only runs while
// something is moving, to save battery on budget phones.

import { tileSprite, doughSprite, lockSprite } from './art.js';
import { INGREDIENTS } from '../engine/content.js';

const EASE = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  fall: (t) => { // accelerate, then a soft landing bounce
    if (t < 0.82) { const u = t / 0.82; return u * u; }
    const u = (t - 0.82) / 0.18; return 1 - Math.sin(u * Math.PI) * 0.06;
  },
};

const CASCADE_WORDS = [null, null, ['Wah!', 'वाह!'], ['Shabaash!', 'शाबाश!'], ['Kamaal!', 'कमाल!'], ['Zabardast!', 'ज़बरदस्त!'], ['Ekdum Jhakaas!', 'एकदम झकास!']];

export class BoardView {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts; // { audio, haptics, lang(), reduceMotion(), getTarget(color|kind) , onSwap, onTap }
    this.sprites = new Map();
    this.tweens = [];
    this.particles = [];
    this.texts = [];
    this.beams = [];
    this.flyers = [];
    this.busy = false;
    this.mode = 'swap';
    this.selected = null;
    this.hint = null;
    this.drag = null;
    this.running = false;
    this.shake = 0;
    this._bindInput();
    this._frame = this._frame.bind(this);
  }

  // ---------- setup ----------
  attach(session) {
    this.session = session;
    this.board = session.board;
    this.relayout();
    this.syncFromBoard();
  }

  relayout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const rect = this.canvas.getBoundingClientRect();
    this.W = rect.width; this.H = rect.height;
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    const area = this.opts.boardArea(); // {top, bottom} in CSS px within canvas
    if (!this.board) return;
    const pad = 10;
    const availW = this.W - pad * 2;
    const availH = area.bottom - area.top - pad * 2;
    const cs = Math.floor(Math.min(availW / this.board.cols, availH / this.board.rows, 72));
    this.cs = cs;
    this.bx = Math.round((this.W - cs * this.board.cols) / 2);
    this.by = Math.round(area.top + pad + (availH - cs * this.board.rows) / 2);
    this.spritePx = Math.round(cs * dpr);
    this._renderBackground();
    this.requestFrame();
  }

  syncFromBoard() {
    const b = this.board;
    this.sprites.clear();
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      const t = b.tiles[r][c];
      if (t) this.sprites.set(t.id, this._mkSprite(t, r, c));
    }
    this.vDough = b.dough.map((row) => [...row]);
    this.vLock = b.lock.map((row) => [...row]);
    this.requestFrame();
  }

  _mkSprite(t, r, c) {
    return { id: t.id, color: t.color, special: t.special, r, c, x: c, y: r, scale: 1, alpha: 1, rot: 0, flash: 0 };
  }

  _renderBackground() {
    const b = this.board, cs = this.cs, dpr = this.dpr;
    const w = b.cols * cs, h = b.rows * cs;
    const cv = document.createElement('canvas');
    cv.width = Math.round((w + 24) * dpr); cv.height = Math.round((h + 24) * dpr);
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(12, 12);
    // brass thali rim around playable cells
    g.save();
    g.shadowColor = 'rgba(80,30,0,0.35)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
    g.fillStyle = '#c98b2b';
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) if (b.playable[r][c]) {
      g.fillRect(c * cs - 7, r * cs - 7, cs + 14, cs + 14);
    }
    g.restore();
    const brass = g.createLinearGradient(0, 0, w, h);
    brass.addColorStop(0, '#f7d488'); brass.addColorStop(0.5, '#d9a441'); brass.addColorStop(1, '#a8701e');
    g.fillStyle = brass;
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) if (b.playable[r][c]) {
      g.fillRect(c * cs - 5, r * cs - 5, cs + 10, cs + 10);
    }
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      if (!b.playable[r][c]) continue;
      const light = (r + c) % 2 === 0;
      g.fillStyle = light ? '#fff6e6' : '#fbe7c6';
      g.fillRect(c * cs, r * cs, cs, cs);
      // tiny rangoli dot motif
      g.fillStyle = light ? 'rgba(232,120,60,0.10)' : 'rgba(200,60,120,0.09)';
      const m = cs / 2;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        g.beginPath(); g.arc(c * cs + m + Math.cos(a) * cs * 0.36, r * cs + m + Math.sin(a) * cs * 0.36, cs * 0.04, 0, 7); g.fill();
      }
    }
    this.bg = cv;
  }

  // ---------- coordinates ----------
  cellCenter(r, c) { return { x: this.bx + (c + 0.5) * this.cs, y: this.by + (r + 0.5) * this.cs }; }
  cellAt(px, py) {
    const c = Math.floor((px - this.bx) / this.cs), r = Math.floor((py - this.by) / this.cs);
    return this.board && this.board.isPlayable(r, c) ? [r, c] : null;
  }

  // ---------- tweens ----------
  tween(obj, to, dur, ease = 'outQuad', delay = 0) {
    if (this.opts.reduceMotion()) dur = Math.min(dur, 90);
    return new Promise((resolve) => {
      const from = {};
      for (const key in to) from[key] = obj[key];
      this.tweens.push({ obj, from, to, dur, ease: EASE[ease] || EASE.outQuad, t0: performance.now() + delay, resolve });
      this.requestFrame();
    });
  }
  wait(ms) { if (this.opts.reduceMotion()) ms = Math.min(ms, 60); return new Promise((r) => setTimeout(r, ms)); }

  requestFrame() {
    if (!this.running) { this.running = true; requestAnimationFrame(this._frame); }
  }

  _frame(now) {
    // tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (now < tw.t0) continue;
      const t = Math.min(1, (now - tw.t0) / tw.dur);
      const e = tw.ease(t);
      for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      if (t >= 1) { this.tweens.splice(i, 1); tw.resolve(); }
    }
    this._stepEffects(now);
    this._draw(now);
    const active = this.tweens.length || this.particles.length || this.texts.length || this.beams.length || this.flyers.length || this.hint || this.shake > 0.01 || this.selected;
    if (active) requestAnimationFrame(this._frame);
    else this.running = false;
  }

  // ---------- effects ----------
  burst(x, y, color, n = 8, speed = 1) {
    if (this.opts.reduceMotion()) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (1.5 + Math.random() * 3.5) * speed;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, decay: 0.022 + Math.random() * 0.02, size: 2 + Math.random() * 3.5, color, kind: Math.random() < 0.3 ? 'spark' : 'dot' });
    }
  }
  floatText(text, x, y, { size = 26, color = '#fff', stroke = '#b3123b', life = 1 } = {}) {
    this.texts.push({ text, x, y, size, color, stroke, life, t: 0 });
  }
  _stepEffects() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.kind === 'smoke' ? -0.05 : 0.18; p.vx *= 0.98;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += 0.016; t.y -= 0.6;
      if (t.t > t.life) this.texts.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= 0.045;
      if (b.life <= 0) this.beams.splice(i, 1);
    }
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += 0.028;
      if (f.t >= 1) { this.flyers.splice(i, 1); if (f.onArrive) f.onArrive(); }
    }
    this.shake *= 0.86;
  }

  // ---------- drawing ----------
  _draw(now) {
    const ctx = this.ctx, dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    if (!this.board) return;
    const sx = this.shake > 0.01 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0.01 ? (Math.random() - 0.5) * this.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(this.bg, this.bx - 12, this.by - 12, this.bg.width / dpr, this.bg.height / dpr);
    const cs = this.cs, b = this.board;
    // dough
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      const d = this.vDough[r][c];
      if (d) ctx.drawImage(doughSprite(d, this.spritePx), this.bx + c * cs, this.by + r * cs, cs, cs);
    }
    // selection glow
    if (this.selected) {
      const [r, c] = this.selected;
      const pulse = 0.55 + Math.sin(now / 160) * 0.25;
      ctx.fillStyle = `rgba(255,200,40,${pulse * 0.6})`;
      ctx.beginPath(); ctx.roundRect(this.bx + c * cs + 2, this.by + r * cs + 2, cs - 4, cs - 4, cs * 0.22); ctx.fill();
    }
    // tiles (clipped to the board so new tiles appear from the top edge)
    ctx.save();
    ctx.beginPath(); ctx.rect(this.bx - 6, this.by - 2, b.cols * cs + 12, b.rows * cs + 8); ctx.clip();
    const hintIds = this.hint ? this.hint.ids : null;
    for (const s of this.sprites.values()) {
      if (s.alpha <= 0.01 || s.scale <= 0.01) continue;
      let x = this.bx + (s.x + 0.5) * cs, y = this.by + (s.y + 0.5) * cs;
      let scale = s.scale, rot = s.rot;
      if (hintIds && hintIds.includes(s.id)) {
        const ph = (now - this.hint.t0) / 1000;
        const k = Math.max(0, Math.sin(ph * 5)) * 0.08;
        scale *= 1 + k;
        rot += Math.sin(ph * 14) * 0.06 * (k > 0 ? 1 : 0);
        const dir = this.hint.dir[hintIds.indexOf(s.id)];
        x += dir[1] * k * cs * 0.6; y += dir[0] * k * cs * 0.6;
      }
      const size = cs * scale;
      ctx.globalAlpha = s.alpha;
      if (rot) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.drawImage(tileSprite(s.color, s.special, this.spritePx), -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(tileSprite(s.color, s.special, this.spritePx), x - size / 2, y - size / 2, size, size);
      }
      if (s.flash > 0.01) {
        ctx.globalAlpha = s.flash * s.alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, size * 0.45, 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // locks on top
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++)
      if (this.vLock[r][c]) ctx.drawImage(lockSprite(this.spritePx), this.bx + c * cs, this.by + r * cs, cs, cs);
    // beams
    for (const bm of this.beams) this._drawBeam(bm);
    ctx.restore();
    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.kind === 'spark') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.x * 0.1);
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? 2.6 - p.life : 1), 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // flyers (collected ingredients heading to the order cards)
    for (const f of this.flyers) {
      if (f.t < 0) continue;
      const t = EASE.inQuad(f.t);
      const x = f.x0 + (f.x1 - f.x0) * t;
      const y = f.y0 + (f.y1 - f.y0) * t - Math.sin(f.t * Math.PI) * 60;
      const size = cs * (0.8 - 0.35 * f.t);
      ctx.drawImage(tileSprite(f.color, null, this.spritePx), x - size / 2, y - size / 2, size, size);
    }
    // floating texts
    for (const t of this.texts) {
      const a = t.t < 0.15 ? t.t / 0.15 : Math.max(0, 1 - (t.t - t.life * 0.6) / (t.life * 0.4));
      const sc = t.t < 0.15 ? EASE.outBack(t.t / 0.15) : 1;
      ctx.globalAlpha = Math.min(1, a);
      ctx.font = `800 ${Math.round(t.size * sc)}px "Baloo 2", system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, t.size / 6); ctx.lineJoin = 'round';
      ctx.strokeStyle = t.stroke; ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  _drawBeam(bm) {
    const ctx = this.ctx, cs = this.cs, b = this.board;
    ctx.save();
    ctx.globalAlpha = Math.max(0, bm.life);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, w, h) => {
      const g = w > h ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, 'rgba(255,170,40,0)'); g.addColorStop(0.5, 'rgba(255,240,180,0.95)'); g.addColorStop(1, 'rgba(255,170,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    };
    if (bm.type === 'row') glow(this.bx - 10, this.by + bm.r * cs + cs * 0.15, b.cols * cs + 20, cs * 0.7);
    else if (bm.type === 'col') glow(this.bx + bm.c * cs + cs * 0.15, this.by - 10, cs * 0.7, b.rows * cs + 20);
    else if (bm.type === 'ring') {
      const { x, y } = this.cellCenter(bm.r, bm.c);
      const rad = cs * (0.5 + (1 - bm.life) * bm.radius);
      ctx.strokeStyle = 'rgba(255,230,160,0.95)'; ctx.lineWidth = cs * 0.25 * bm.life;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
    } else if (bm.type === 'lines') {
      const { x, y } = this.cellCenter(bm.r, bm.c);
      ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 3;
      for (const [r, c] of bm.targets) {
        const p = this.cellCenter(r, c);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    } else if (bm.type === 'flash') {
      ctx.fillStyle = 'rgba(255,240,200,0.6)';
      ctx.fillRect(this.bx, this.by, b.cols * cs, b.rows * cs);
    }
    ctx.restore();
  }

  // ---------- phase replay ----------
  async play(phases) {
    this.busy = true;
    this.clearHint();
    try {
      for (const p of phases) {
        if (p.kind === 'swap') await this._animSwap(p);
        else if (p.kind === 'clear') await this._animClear(p);
        else if (p.kind === 'fall') await this._animFall(p);
        else if (p.kind === 'shuffle') await this._animShuffle(p);
        if (this.opts.onPhase) this.opts.onPhase(p);
      }
    } finally {
      this.syncFromBoard();
      this.busy = false;
    }
  }

  async _animSwap(p) {
    const sa = this.sprites.get(p.idA), sb = this.sprites.get(p.idB);
    this.opts.audio.swap();
    await Promise.all([
      this.tween(sa, { x: p.b[1], y: p.b[0] }, 150),
      this.tween(sb, { x: p.a[1], y: p.a[0] }, 150),
    ]);
  }

  async animateInvalid(a, b) {
    const ta = this.board.tiles[a[0]][a[1]], tb = this.board.tiles[b[0]][b[1]];
    if (!ta || !tb) return;
    const sa = this.sprites.get(ta.id), sb = this.sprites.get(tb.id);
    if (!sa || !sb) return;
    this.busy = true;
    this.opts.audio.invalid();
    this.opts.haptics(15);
    await Promise.all([this.tween(sa, { x: b[1], y: b[0] }, 120), this.tween(sb, { x: a[1], y: a[0] }, 120)]);
    await Promise.all([this.tween(sa, { x: a[1], y: a[0] }, 160, 'outBack'), this.tween(sb, { x: b[1], y: b[0] }, 160, 'outBack')]);
    this.busy = false;
  }

  async _animClear(p) {
    const audio = this.opts.audio, cs = this.cs;
    const lang = this.opts.lang();
    // special effects first
    let big = 0;
    for (const a of p.activated) {
      if (a.special === 'row' || a.special === 'col') {
        this.beams.push({ type: a.special, r: a.r, c: a.c, life: 1 });
        audio.whoosh(); big = Math.max(big, 1);
      } else if (a.special === 'cooker') {
        this.beams.push({ type: 'ring', r: a.r, c: a.c, radius: 2.5, life: 1 });
        const { x, y } = this.cellCenter(a.r, a.c);
        for (let i = 0; i < 10; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, life: 1, decay: 0.02, size: 5, color: 'rgba(255,255,255,0.8)', kind: 'smoke' });
        audio.whistle(); big = Math.max(big, 2);
      } else if (a.special === 'dabba') {
        this.beams.push({ type: 'lines', r: a.r, c: a.c, targets: a.targets || [], life: 1.2 });
        audio.dabba(); big = Math.max(big, 3);
      } else if (a.type === 'cross') {
        for (let d = -Math.floor(a.width / 2); d <= Math.floor(a.width / 2); d++) {
          this.beams.push({ type: 'row', r: a.r + d, c: a.c, life: 1.2 });
          this.beams.push({ type: 'col', r: a.r, c: a.c + d, life: 1.2 });
        }
        audio.whoosh(); audio.whistle(); big = 3;
      } else if (a.type === 'diamond') {
        this.beams.push({ type: 'ring', r: a.r, c: a.c, radius: a.radius, life: 1.3 });
        audio.whistle(); big = 3;
      } else if (a.type === 'all') {
        this.beams.push({ type: 'flash', life: 1.3 }); audio.dabba(); big = 4;
      } else if (a.type === 'convert') {
        this.beams.push({ type: 'lines', r: a.r, c: a.c, targets: a.targets || [], life: 1.3 }); audio.dabba(); big = 4;
      } else if (a.type === 'tadka') {
        for (const [r, c] of a.cells) {
          const { x, y } = this.cellCenter(r, c);
          for (let i = 0; i < 6; i++) this.particles.push({ x, y: y + cs * 0.3, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3, life: 1, decay: 0.03, size: 3 + Math.random() * 3, color: Math.random() < 0.5 ? '#ffb703' : '#fb5607', kind: 'dot' });
        }
        audio.sizzle(); big = 2;
      }
    }
    if (big >= 2) { this.shake = 4 + big * 2; this.opts.haptics(big >= 3 ? 40 : 25); }
    // converted tiles flash into specials
    for (const cv of p.converted) {
      const s = this.sprites.get(cv.id);
      if (s) { s.special = cv.special; s.flash = 1; this.tween(s, { flash: 0 }, 300); }
    }
    if (p.converted.length) await this.wait(220);

    audio.match(p.cascade);
    if (!big) this.opts.haptics(10);
    const needed = this.opts.neededColors();
    let flown = 0;
    const pops = [];
    for (const cl of p.cleared) {
      const s = this.sprites.get(cl.id);
      const { x, y } = this.cellCenter(cl.r, cl.c);
      this.burst(x, y, cl.color >= 0 ? INGREDIENTS[cl.color].hex : '#fff6d0', big ? 6 : 8);
      if (cl.color >= 0 && needed.includes(cl.color) && flown < 14) {
        const target = this.opts.getTarget(cl.color);
        if (target) { flown++; this.flyers.push({ color: cl.color, x0: x, y0: y, x1: target.x, y1: target.y, t: -flown * 0.035 }); }
      }
      if (s) pops.push(this.tween(s, { scale: 1.25 }, 70).then(() => this.tween(s, { scale: 0, alpha: 0 }, 140, 'inQuad')).then(() => this.sprites.delete(cl.id)));
    }
    for (const d of p.dough) {
      this.vDough[d.r][d.c] = d.left;
      const { x, y } = this.cellCenter(d.r, d.c);
      this.burst(x, y, '#f3dfb7', 10, 0.8);
      audio.thud();
    }
    for (const u of p.unlocked) {
      this.vLock[u.r][u.c] = 0;
      const { x, y } = this.cellCenter(u.r, u.c);
      this.burst(x, y, '#cfd8df', 10, 1.2);
      audio.clink();
    }
    // score popup
    if (p.cleared.length) {
      const mid = p.cleared[Math.floor(p.cleared.length / 2)];
      const { x, y } = this.cellCenter(mid.r, mid.c);
      this.floatText(`+${p.score}`, x, y, { size: 18, color: '#fff8e1', stroke: '#7a3b12', life: 0.7 });
    }
    const word = CASCADE_WORDS[Math.min(p.cascade, CASCADE_WORDS.length - 1)];
    if (word) {
      this.floatText(lang === 'hi' ? word[1] : word[0], this.W / 2, this.by + this.board.rows * cs * 0.4, { size: 40, color: '#fff3c4', stroke: '#c2185b', life: 1.1 });
      audio.cheer(p.cascade);
    }
    await Promise.all(pops);
    if (p.created.length) {
      for (const cr of p.created) {
        const s = this._mkSprite(cr, cr.r, cr.c);
        s.scale = 0; s.flash = 1;
        this.sprites.set(cr.id, s);
        this.tween(s, { scale: 1 }, 260, 'outBack');
        this.tween(s, { flash: 0 }, 320);
      }
      audio.special();
      this.opts.haptics(20);
      await this.wait(200);
    }
  }

  async _animFall(p) {
    const proms = [];
    let maxDist = 0;
    for (const m of p.moves) {
      let s = this.sprites.get(m.id);
      if (!s) {
        s = { id: m.id, color: m.color, special: m.special, x: m.fromC, y: m.fromR, scale: 1, alpha: 1, rot: 0, flash: 0 };
        this.sprites.set(m.id, s);
      }
      const dist = Math.hypot(m.toR - s.y, m.toC - s.x);
      maxDist = Math.max(maxDist, dist);
      proms.push(this.tween(s, { x: m.toC, y: m.toR }, 120 + Math.sqrt(dist) * 110, 'fall'));
    }
    if (maxDist > 0) this.opts.audio.land();
    await Promise.all(proms);
  }

  async _animShuffle(p) {
    this.floatText(this.opts.lang() === 'hi' ? 'फेंटो!' : 'Shuffle!', this.W / 2, this.by + this.board.rows * this.cs / 2, { size: 34, color: '#fff', stroke: '#6a1b9a', life: 1 });
    this.opts.audio.shuffle();
    await Promise.all(p.moves.map((m) => {
      const s = this.sprites.get(m.id);
      if (!s) return null;
      s.color = m.color;
      return this.tween(s, { x: m.toC, y: m.toR }, 420, 'outBack');
    }));
  }

  // ---------- hints ----------
  showHint(move) {
    if (!move || this.busy) return;
    const [a, b] = move;
    const ta = this.board.tiles[a[0]][a[1]], tb = this.board.tiles[b[0]][b[1]];
    if (!ta || !tb) return;
    this.hint = { ids: [ta.id, tb.id], dir: [[b[0] - a[0], b[1] - a[1]], [a[0] - b[0], a[1] - b[1]]], t0: performance.now(), move };
    this.requestFrame();
  }
  clearHint() { this.hint = null; }

  // ---------- input ----------
  _bindInput() {
    const cv = this.canvas;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => {
      if (this.busy || !this.board) return;
      const [x, y] = pos(e);
      const cell = this.cellAt(x, y);
      if (!cell) { this.selected = null; return; }
      this.drag = { cell, x, y, moved: false };
      try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this.opts.onInteract && this.opts.onInteract();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.drag || this.drag.moved || this.busy || this.mode === 'spoon') return;
      const [x, y] = pos(e);
      const dx = x - this.drag.x, dy = y - this.drag.y;
      if (Math.hypot(dx, dy) < this.cs * 0.32) return;
      this.drag.moved = true;
      const [r, c] = this.drag.cell;
      const target = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
      this.selected = null;
      if (this.board.isPlayable(target[0], target[1])) this.opts.onSwap(this.drag.cell, target);
    });
    const up = () => {
      if (!this.drag) return;
      const d = this.drag;
      this.drag = null;
      if (d.moved || this.busy) return;
      if (this.mode === 'spoon') { this.opts.onTap(d.cell); return; }
      if (this.selected) {
        const [r, c] = this.selected;
        const [r2, c2] = d.cell;
        if (Math.abs(r - r2) + Math.abs(c - c2) === 1) {
          this.selected = null;
          this.opts.onSwap([r, c], d.cell);
          return;
        }
        if (r === r2 && c === c2) { this.selected = null; this.requestFrame(); return; }
      }
      if (this.board.isSwappable(d.cell[0], d.cell[1])) { this.selected = d.cell; this.opts.audio.tap(); }
      this.requestFrame();
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { this.drag = null; });
  }
}
