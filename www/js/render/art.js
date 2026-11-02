// Procedural ingredient art. Every sprite is drawn with canvas paths once per size and cached,
// so the game ships with zero image assets and stays crisp on any screen density.
// Silhouettes are deliberately distinct (chilli / lemon / leaf / bulb / clove-bulb / cup) so
// the board stays readable for colour-blind players.

const cache = new Map();

// roundRect polyfill for older Android System WebViews (< Chrome 99).
for (const C of [globalThis.CanvasRenderingContext2D, globalThis.OffscreenCanvasRenderingContext2D]) {
  if (C && !C.prototype.roundRect) {
    C.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
    };
  }
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function rad(ctx, x, y, r0, r1, stops, ox = 0, oy = 0) {
  const g = ctx.createRadialGradient(x + ox, y + oy, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function shadow(ctx, on = true) {
  if (on) { ctx.shadowColor = 'rgba(70,25,0,0.35)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3; }
  else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
}

// All draw functions work in a 100×100 unit box centred at (0,0).
const DRAW = [
  function chilli(ctx) {
    ctx.save();
    ctx.rotate(-0.55);
    shadow(ctx);
    ctx.beginPath();
    ctx.moveTo(-11, -27);
    ctx.bezierCurveTo(-17, 2, -9, 26, 7, 42);
    ctx.bezierCurveTo(5, 20, 17, 0, 13, -27);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, -15, 0, 15, 0, [[0, '#ff6a55'], [0.45, '#e2262f'], [1, '#9d0d17']]);
    ctx.fill();
    shadow(ctx, false);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -18); ctx.bezierCurveTo(-11, 2, -6, 18, 2, 30); ctx.stroke();
    // calyx + stalk
    ctx.fillStyle = lin(ctx, -14, -34, 14, -24, [[0, '#7ad35b'], [1, '#2e8b2e']]);
    ctx.beginPath(); ctx.ellipse(1, -28, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(1, -32); ctx.quadraticCurveTo(4, -44, 14, -46); ctx.stroke();
    ctx.restore();
  },
  function lemon(ctx) {
    shadow(ctx);
    ctx.beginPath();
    ctx.moveTo(-42, 2);
    ctx.bezierCurveTo(-36, -30, 36, -30, 42, -2);
    ctx.bezierCurveTo(36, 30, -36, 30, -42, 2);
    ctx.closePath();
    ctx.fillStyle = rad(ctx, 0, 0, 4, 44, [[0, '#fff59a'], [0.55, '#f8cf22'], [1, '#d99a00']], -12, -10);
    ctx.fill();
    shadow(ctx, false);
    ctx.fillStyle = 'rgba(190,130,0,0.25)';
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 10 + (i * 7) % 22; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.6, 1.3, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(-12, -11, 14, 6, -0.25, 0, Math.PI * 2); ctx.fill();
    // leaf
    ctx.save(); ctx.translate(14, -22); ctx.rotate(-0.5);
    ctx.fillStyle = lin(ctx, -10, 0, 10, 0, [[0, '#6fcf5a'], [1, '#2b8a3e']]);
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, -11, 13, 0); ctx.quadraticCurveTo(0, 11, -12, 0); ctx.fill();
    ctx.restore();
  },
  function mint(ctx) {
    const leaf = (x, y, rot, s, dark) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.beginPath();
      ctx.moveTo(0, -42);
      ctx.bezierCurveTo(30, -28, 30, 20, 0, 42);
      ctx.bezierCurveTo(-30, 20, -30, -28, 0, -42);
      ctx.fillStyle = dark ? lin(ctx, -20, -30, 20, 30, [[0, '#3fae55'], [1, '#14632a']]) : lin(ctx, -20, -30, 20, 30, [[0, '#7be38a'], [0.5, '#2fae4f'], [1, '#17773a']]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,255,220,0.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, 38); ctx.stroke();
      ctx.lineWidth = 1.8;
      for (let i = -2; i <= 2; i++) {
        const yy = i * 13;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(10, yy - 6, 17, yy - 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.quadraticCurveTo(-10, yy - 6, -17, yy - 12); ctx.stroke();
      }
      ctx.restore();
    };
    shadow(ctx);
    leaf(-14, 4, -0.7, 0.62, true);
    leaf(6, 0, 0.35, 0.95, false);
    shadow(ctx, false);
  },
  function onion(ctx) {
    shadow(ctx);
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.bezierCurveTo(8, -26, 38, -18, 38, 8);
    ctx.bezierCurveTo(38, 32, 18, 38, 0, 38);
    ctx.bezierCurveTo(-18, 38, -38, 32, -38, 8);
    ctx.bezierCurveTo(-38, -18, -8, -26, 0, -40);
    ctx.fillStyle = rad(ctx, 0, 6, 4, 44, [[0, '#e7a6f5'], [0.5, '#a845c4'], [1, '#5d1474']], -10, -12);
    ctx.fill();
    shadow(ctx, false);
    ctx.strokeStyle = 'rgba(255,220,255,0.45)'; ctx.lineWidth = 2;
    for (const x of [-20, -8, 8, 20]) {
      ctx.beginPath(); ctx.moveTo(x * 0.25, -32); ctx.quadraticCurveTo(x * 1.25, 4, x * 0.6, 36); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-15, -2, 6, 12, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a26b'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const x of [-6, -2, 2, 6]) { ctx.beginPath(); ctx.moveTo(x * 0.6, 38); ctx.lineTo(x, 45); ctx.stroke(); }
    ctx.strokeStyle = '#8fbf5a'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(0, -38); ctx.quadraticCurveTo(-2, -46, 4, -50); ctx.stroke();
  },
  function garlic(ctx) {
    shadow(ctx);
    ctx.beginPath();
    ctx.moveTo(-4, -42);
    ctx.bezierCurveTo(-4, -26, -40, -18, -40, 10);
    ctx.bezierCurveTo(-40, 34, -16, 38, 0, 38);
    ctx.bezierCurveTo(16, 38, 40, 34, 40, 10);
    ctx.bezierCurveTo(40, -18, 4, -26, 4, -42);
    ctx.closePath();
    ctx.fillStyle = rad(ctx, 0, 8, 4, 46, [[0, '#ffffff'], [0.6, '#f1e8d6'], [1, '#c8b48f']], -10, -12);
    ctx.fill();
    shadow(ctx, false);
    ctx.strokeStyle = '#a8916a'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,110,160,0.55)'; ctx.lineWidth = 2;
    for (const x of [-22, -8, 8, 22]) { ctx.beginPath(); ctx.moveTo(x * 0.15, -26); ctx.quadraticCurveTo(x * 1.2, 6, x * 0.7, 36); ctx.stroke(); }
    ctx.strokeStyle = '#a8916a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const x of [-8, -4, 0, 4, 8]) { ctx.beginPath(); ctx.moveTo(x * 0.8, 38); ctx.lineTo(x * 1.2, 45); ctx.stroke(); }
  },
  function kulhad(ctx) {
    shadow(ctx);
    ctx.beginPath();
    ctx.moveTo(-31, -20);
    ctx.lineTo(31, -20);
    ctx.lineTo(22, 34);
    ctx.quadraticCurveTo(0, 40, -22, 34);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, -30, 0, 30, 0, [[0, '#7d3a10'], [0.35, '#d4793a'], [0.6, '#c06425'], [1, '#6e300b']]);
    ctx.fill();
    shadow(ctx, false);
    ctx.fillStyle = 'rgba(255,220,180,0.35)';
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 7, 9, 1.8, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,220,180,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-27, 2); ctx.lineTo(27, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-25, 16); ctx.lineTo(25, 16); ctx.stroke();
    // rim + chai
    ctx.fillStyle = '#e39a62';
    ctx.beginPath(); ctx.ellipse(0, -20, 32, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rad(ctx, 0, -20, 2, 28, [[0, '#f4dcb8'], [0.6, '#d6a46e'], [1, '#a66a35']]);
    ctx.beginPath(); ctx.ellipse(0, -20, 26, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    // steam
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const x of [-9, 6]) {
      ctx.beginPath(); ctx.moveTo(x, -30); ctx.bezierCurveTo(x - 7, -36, x + 7, -40, x, -48); ctx.stroke();
    }
  },
];

function drawRollingPin(ctx, vertical) {
  ctx.save();
  if (vertical) ctx.rotate(Math.PI / 2);
  shadow(ctx);
  ctx.fillStyle = lin(ctx, 0, -9, 0, 9, [[0, '#f6d7a7'], [0.5, '#d9a35f'], [1, '#9c6630']]);
  ctx.beginPath(); ctx.roundRect(-34, -9, 68, 18, 8); ctx.fill();
  shadow(ctx, false);
  ctx.fillStyle = lin(ctx, 0, -5, 0, 5, [[0, '#b9773a'], [1, '#6e4219']]);
  ctx.beginPath(); ctx.roundRect(-48, -5, 16, 10, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(32, -5, 16, 10, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-28, -4); ctx.lineTo(28, -4); ctx.stroke();
  // motion arrows
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 50, 0); ctx.lineTo(s * 42, -6); ctx.lineTo(s * 42, 6); ctx.fill();
  }
  ctx.restore();
}

function drawCooker(ctx, colorIdx) {
  const tint = ['#e2262f', '#f6c21c', '#2fae4f', '#9b3fb5', '#d8cbb0', '#b5651d'][colorIdx] || '#888';
  shadow(ctx);
  ctx.fillStyle = lin(ctx, -34, 0, 34, 0, [[0, '#8d99a6'], [0.3, '#f4f7fa'], [0.55, '#c3ccd5'], [1, '#6c7782']]);
  ctx.beginPath(); ctx.roundRect(-33, -14, 66, 50, 12); ctx.fill();
  shadow(ctx, false);
  ctx.fillStyle = tint;
  ctx.beginPath(); ctx.roundRect(-33, 4, 66, 12, 2); ctx.fill();
  ctx.fillStyle = lin(ctx, -36, 0, 36, 0, [[0, '#6c7782'], [0.4, '#e9eef2'], [1, '#5c6670']]);
  ctx.beginPath(); ctx.ellipse(0, -16, 36, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.roundRect(30, -20, 22, 8, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-5, -34, 10, 16, 3); ctx.fill();
  ctx.fillStyle = '#444';
  ctx.beginPath(); ctx.arc(0, -36, 6, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-18, 18, 4, 12, 0, 0, Math.PI * 2); ctx.fill();
  // steam puffs
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y, r] of [[-10, -44, 6], [2, -48, 7], [12, -43, 5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
}

function drawDabba(ctx) {
  shadow(ctx);
  ctx.fillStyle = rad(ctx, 0, 0, 5, 46, [[0, '#ffffff'], [0.6, '#cfd8df'], [1, '#7d8a96']], -14, -14);
  ctx.beginPath(); ctx.arc(0, 0, 45, 0, Math.PI * 2); ctx.fill();
  shadow(ctx, false);
  ctx.strokeStyle = '#8f9ba6'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, 0, 41, 0, Math.PI * 2); ctx.stroke();
  const spices = ['#e2262f', '#f6b21c', '#2fae4f', '#7a3b12', '#ff7f11', '#f5ecd9', '#3b2a20'];
  const wells = [[0, 0]];
  for (let i = 0; i < 6; i++) wells.push([Math.cos(i * Math.PI / 3 - Math.PI / 2) * 25, Math.sin(i * Math.PI / 3 - Math.PI / 2) * 25]);
  wells.forEach(([x, y], i) => {
    ctx.fillStyle = '#9aa6b1';
    ctx.beginPath(); ctx.arc(x, y, 12.5, 0, 7); ctx.fill();
    ctx.fillStyle = rad(ctx, x, y, 1, 11, [[0, '#ffffff'], [0.25, spices[i]], [1, spices[i]]], -3, -3);
    ctx.beginPath(); ctx.arc(x, y, 10.5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let g = 0; g < 5; g++) { ctx.beginPath(); ctx.arc(x + Math.cos(g * 2.1) * 5, y + Math.sin(g * 2.1) * 5, 1, 0, 7); ctx.fill(); }
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 38, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
}

/** Returns a cached sprite canvas `size`×`size` device pixels. */
export function tileSprite(color, special, size) {
  const key = `${color}|${special || ''}|${size}`;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = makeCanvas(size, size);
  const ctx = cv.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.scale(size / 100, size / 100);
  if (special === 'dabba') drawDabba(ctx);
  else if (special === 'cooker') {
    drawCooker(ctx, color);
    ctx.save(); ctx.translate(0, 12); ctx.scale(0.36, 0.36); DRAW[color](ctx); ctx.restore();
  } else {
    if (special === 'row' || special === 'col') {
      ctx.save(); ctx.scale(0.86, 0.86); DRAW[color](ctx); ctx.restore();
      drawRollingPin(ctx, special === 'col');
    } else {
      ctx.scale(0.86, 0.86);
      DRAW[color](ctx);
    }
  }
  cache.set(key, cv);
  return cv;
}

export function doughSprite(layers, size) {
  const key = `dough|${layers}|${size}`;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = makeCanvas(size, size);
  const ctx = cv.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.scale(size / 100, size / 100);
  shadow(ctx);
  ctx.fillStyle = layers > 1
    ? rad(ctx, 0, 0, 4, 52, [[0, '#f3d9a8'], [0.65, '#d9b06c'], [1, '#a87b3e']], -12, -14)
    : rad(ctx, 0, 0, 4, 52, [[0, '#fff3dc'], [0.65, '#ecd2a2'], [1, '#c9a064']], -12, -14);
  ctx.beginPath(); ctx.roundRect(-45, -45, 90, 90, 30); ctx.fill();
  shadow(ctx, false);
  ctx.strokeStyle = layers > 1 ? 'rgba(120,75,25,0.7)' : 'rgba(150,105,45,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-45, -45, 90, 90, 30); ctx.stroke();
  // thumb-press dimples, like kneaded atta
  ctx.fillStyle = 'rgba(150,100,40,0.22)';
  for (const [x, y, rx] of [[-14, -6, 9], [12, 8, 8], [-2, 20, 7]]) { ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.65, 0.4, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(-28 + (i * 17) % 56, -28 + (i * 23) % 52, 1.4 + (i % 3) * 0.8, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-18, -24, 14, 6, -0.3, 0, 7); ctx.fill();
  if (layers > 1) {
    ctx.strokeStyle = 'rgba(110,70,25,0.55)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-28, -2); ctx.quadraticCurveTo(0, 10, 28, -2); ctx.stroke();
    ctx.fillStyle = '#7a3b12'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×2', 22, 28);
  }
  cache.set(key, cv);
  return cv;
}

export function lockSprite(size) {
  const key = `lock|${size}`;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = makeCanvas(size, size);
  const ctx = cv.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = 'rgba(60,70,80,0.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.roundRect(-44, -44, 88, 88, 14); ctx.stroke();
  ctx.strokeStyle = 'rgba(205,215,225,0.95)'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.roundRect(-44, -44, 88, 88, 14); ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.strokeStyle = 'rgba(60,70,80,0.75)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(i * 22 - 22, -44); ctx.lineTo(i * 22 + 22, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 22 + 22, -44); ctx.lineTo(i * 22 - 22, 44); ctx.stroke();
    ctx.strokeStyle = 'rgba(225,232,240,0.95)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(i * 22 - 22, -44); ctx.lineTo(i * 22 + 22, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 22 + 22, -44); ctx.lineTo(i * 22 - 22, 44); ctx.stroke();
  }
  ctx.fillStyle = '#d4af37';
  for (const [x, y] of [[-40, -40], [40, -40], [-40, 40], [40, 40]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
  cache.set(key, cv);
  return cv;
}

/** Small icon canvases for the DOM (order cards, tutorials). Returns a data URL. */
const iconUrls = new Map();
export function iconURL(kind, size = 96) {
  if (iconUrls.has(kind + size)) return iconUrls.get(kind + size);
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  let src;
  if (kind === 'dough') src = doughSprite(1, size);
  else if (kind === 'lock') { ctx.drawImage(tileSprite(1, null, size), 0, 0); src = lockSprite(size); }
  else if (typeof kind === 'string' && kind.includes(':')) { const [c, sp] = kind.split(':'); src = tileSprite(Number(c), sp, size); }
  else src = tileSprite(Number(kind), null, size);
  ctx.drawImage(src, 0, 0);
  const url = cv.toDataURL();
  iconUrls.set(kind + size, url);
  return url;
}

export function clearArtCache() { cache.clear(); }
