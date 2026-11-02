// Procedural illustrations: a living backdrop for every city (landmark silhouettes, sky, kites,
// water) and "Meri Rasoi" — the player's kitchen, which they decorate with stars.

const TAU = Math.PI * 2;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

// ---------------------------------------------------------------- city scenes

function arch(ctx, x, y, w, h) { // cut-out arch (draws with current fill)
  ctx.beginPath();
  ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h);
  ctx.closePath(); ctx.fill();
}
function dome(ctx, cx, y, r) {
  ctx.beginPath(); ctx.moveTo(cx - r, y); ctx.quadraticCurveTo(cx - r, y - r * 1.3, cx, y - r * 1.6); ctx.quadraticCurveTo(cx + r, y - r * 1.3, cx + r, y); ctx.closePath(); ctx.fill();
  ctx.fillRect(cx - 0.6, y - r * 2.1, 1.2, r * 0.6);
}
function palm(ctx, x, base, h, lean = 0.15, color) {
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, h * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + h * lean, base - h * 0.6, x + h * lean * 1.6, base - h); ctx.stroke();
  const tx = x + h * lean * 1.6, ty = base - h;
  ctx.fillStyle = color;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.48;
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(h * 0.25, -h * 0.08, h * 0.42, h * 0.08); ctx.quadraticCurveTo(h * 0.22, h * 0.02, 0, 0); ctx.fill();
    ctx.restore();
  }
}
function waves(ctx, w, y, color, amp = 4) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, y);
  for (let x = 0; x <= w; x += 16) ctx.quadraticCurveTo(x + 8, y - amp, x + 16, y);
  ctx.lineTo(w, y + 400); ctx.lineTo(0, y + 400); ctx.closePath(); ctx.fill();
}
function kite(ctx, x, y, s, color, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.75, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.75, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s * 0.75, 0); ctx.lineTo(s * 0.75, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(80,40,20,.35)';
  ctx.beginPath(); ctx.moveTo(0, s); ctx.bezierCurveTo(s * 0.6, s * 2, -s * 0.6, s * 2.6, s * 0.3, s * 3.6); ctx.stroke();
  ctx.restore();
}

const LANDMARKS = {
  sea(ctx, w, base, H, col) { // Gateway of India
    const cx = w * 0.5, bw = H * 1.1, bh = H * 0.75;
    ctx.fillStyle = col;
    ctx.fillRect(cx - bw / 2, base - bh, bw, bh);
    for (const dx of [-0.5, -0.17, 0.17, 0.5]) dome(ctx, cx + bw * dx * 0.86, base - bh, H * 0.07);
    ctx.fillRect(cx - bw * 0.62, base - bh * 0.72, bw * 1.24, bh * 0.72);
    ctx.globalCompositeOperation = 'destination-out';
    arch(ctx, cx - bw * 0.14, base - bh * 0.72, bw * 0.28, bh * 0.72);
    for (const dx of [-0.42, 0.28]) arch(ctx, cx + bw * dx, base - bh * 0.42, bw * 0.14, bh * 0.42);
    ctx.globalCompositeOperation = 'source-over';
  },
  kite(ctx, w, base, H, col) { // Ahmedabad rooftops
    ctx.fillStyle = col;
    let x = 0;
    let i = 0;
    while (x < w) {
      const bw = 34 + ((i * 37) % 30), bh = H * (0.35 + ((i * 53) % 40) / 100);
      ctx.fillRect(x, base - bh, bw - 3, bh);
      if (i % 2 === 0) ctx.fillRect(x + 6, base - bh - 10, 14, 10);
      x += bw; i++;
    }
  },
  fort(ctx, w, base, H, col) { // Hawa Mahal
    const cx = w * 0.5;
    ctx.fillStyle = col;
    const levels = 5;
    for (let l = 0; l < levels; l++) {
      const lw = H * (1.5 - l * 0.24), lh = H * 0.16;
      const y = base - (l + 1) * lh;
      ctx.fillRect(cx - lw / 2, y, lw, lh + 1);
      const n = Math.max(2, Math.round(lw / 14));
      for (let k = 0; k < n; k++) dome(ctx, cx - lw / 2 + (k + 0.5) * (lw / n), y, 3.4);
    }
    ctx.globalCompositeOperation = 'destination-out';
    for (let l = 0; l < levels; l++) {
      const lw = H * (1.5 - l * 0.24), lh = H * 0.16, y = base - (l + 1) * lh;
      const n = Math.max(2, Math.round(lw / 14));
      for (let k = 0; k < n; k++) arch(ctx, cx - lw / 2 + (k + 0.5) * (lw / n) - 2.5, y + lh * 0.3, 5, lh * 0.55);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  gate(ctx, w, base, H, col) { // India Gate
    const cx = w * 0.5, gw = H * 0.75, gh = H * 0.95;
    ctx.fillStyle = col;
    ctx.fillRect(cx - gw / 2, base - gh, gw, gh);
    ctx.fillRect(cx - gw * 0.58, base - gh - 8, gw * 1.16, 10);
    ctx.fillRect(cx - gw * 0.3, base - gh - 18, gw * 0.6, 10);
    dome(ctx, cx, base - gh - 18, 10);
    ctx.globalCompositeOperation = 'destination-out';
    arch(ctx, cx - gw * 0.22, base - gh * 0.7, gw * 0.44, gh * 0.7);
    ctx.globalCompositeOperation = 'source-over';
  },
  temple(ctx, w, base, H, col) { // Golden Temple on the sarovar
    const cx = w * 0.5, tw = H * 0.9, th = H * 0.45;
    const gold = ctx.createLinearGradient(0, base - H, 0, base);
    gold.addColorStop(0, '#ffe08a'); gold.addColorStop(1, '#d99a1f');
    ctx.fillStyle = gold;
    ctx.fillRect(cx - tw / 2, base - th, tw, th);
    dome(ctx, cx, base - th, H * 0.22);
    for (const dx of [-0.42, 0.42]) dome(ctx, cx + tw * dx, base - th, H * 0.08);
    ctx.fillStyle = 'rgba(255,240,200,.35)';
    ctx.fillRect(cx - tw / 2, base, tw, th * 0.6);
    ctx.fillStyle = col;
    ctx.fillRect(0, base - 6, w * 0.3, 6); ctx.fillRect(w * 0.7, base - 6, w * 0.3, 6);
  },
  bridge(ctx, w, base, H, col) { // Howrah Bridge
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    const t1 = w * 0.22, t2 = w * 0.78, top = base - H * 0.95, deck = base - H * 0.3;
    for (const t of [t1, t2]) { ctx.fillRect(t - 6, top, 12, base - top); }
    ctx.fillRect(0, deck, w, 6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, deck - H * 0.15); ctx.lineTo(t1, top); ctx.quadraticCurveTo(w / 2, deck - H * 0.05, t2, top); ctx.lineTo(w, deck - H * 0.15);
    ctx.stroke();
    for (let x = 10; x < w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, deck);
      const yTop = x < t1 ? deck - H * 0.15 - (top - deck + H * 0.15) * (x / t1) * -1 : x > t2 ? top + (deck - H * 0.15 - top) * ((x - t2) / (w - t2)) : deck - H * 0.05 - Math.sin(((x - t1) / (t2 - t1)) * Math.PI) * (deck - H * 0.05 - top) * 0.9;
      ctx.lineTo(x + 8, Math.min(deck, yTop)); ctx.stroke();
    }
  },
  minar(ctx, w, base, H, col) { // Charminar
    const cx = w * 0.5, bw = H * 0.8, bh = H * 0.55;
    ctx.fillStyle = col;
    ctx.fillRect(cx - bw / 2, base - bh, bw, bh);
    for (const dx of [-0.5, 0.5]) {
      const x = cx + bw * dx;
      ctx.fillRect(x - 6, base - H, 12, H);
      dome(ctx, x, base - H, 8);
      for (let k = 1; k <= 3; k++) ctx.fillRect(x - 9, base - bh - k * (H - bh) / 4, 18, 3);
    }
    ctx.globalCompositeOperation = 'destination-out';
    arch(ctx, cx - bw * 0.24, base - bh * 0.8, bw * 0.48, bh * 0.8);
    ctx.globalCompositeOperation = 'source-over';
  },
  beach(ctx, w, base, H, col) { // Chennai lighthouse + Marina
    const x = w * 0.75;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - 12, base); ctx.lineTo(x - 7, base - H); ctx.lineTo(x + 7, base - H); ctx.lineTo(x + 12, base); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 11, base - H - 14, 22, 14);
    ctx.fillStyle = 'rgba(255,240,170,.9)'; ctx.fillRect(x - 7, base - H - 11, 14, 8);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let k = 1; k < 4; k++) ctx.fillRect(x - 12, base - (H * k) / 4, 24, 5);
    palm(ctx, w * 0.18, base, H * 0.8, 0.12, col);
  },
  palm(ctx, w, base, H, col) { // Goa church + palms
    const cx = w * 0.55;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillRect(cx - H * 0.35, base - H * 0.6, H * 0.7, H * 0.6);
    ctx.beginPath(); ctx.moveTo(cx - H * 0.35, base - H * 0.6); ctx.lineTo(cx, base - H * 0.85); ctx.lineTo(cx + H * 0.35, base - H * 0.6); ctx.fill();
    ctx.fillStyle = col; ctx.fillRect(cx - 1.5, base - H, 3, H * 0.18); ctx.fillRect(cx - 6, base - H * 0.95, 12, 3);
    arch(ctx, cx - 8, base - H * 0.3, 16, H * 0.3);
    palm(ctx, w * 0.15, base, H * 0.95, 0.18, col);
    palm(ctx, w * 0.88, base, H * 0.8, -0.2, col);
  },
  boat(ctx, w, base, H, col) { // Kerala houseboat on the backwaters
    const cx = w * 0.5, bw = H * 1.4;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(cx - bw / 2, base - H * 0.3); ctx.quadraticCurveTo(cx, base + 6, cx + bw / 2, base - H * 0.3); ctx.lineTo(cx + bw * 0.4, base - H * 0.1); ctx.lineTo(cx - bw * 0.4, base - H * 0.1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - bw * 0.36, base - H * 0.2); ctx.quadraticCurveTo(cx, base - H * 0.7, cx + bw * 0.36, base - H * 0.2); ctx.closePath(); ctx.fill();
    palm(ctx, w * 0.1, base, H * 0.9, 0.2, col);
    palm(ctx, w * 0.92, base, H, -0.18, col);
  },
};

/** Paints a full-screen city backdrop. */
export function drawCityScene(ctx, w, h, city) {
  const [t1, t2] = city.tint;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mix(t1, '#ffffff', 0.55));
  sky.addColorStop(0.5, mix(t2, '#fff3e0', 0.72));
  sky.addColorStop(1, mix(t2, '#ffe0c0', 0.5));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  // sun with halo
  const sx = w * 0.8, sy = h * 0.11, sr = Math.min(w, h) * 0.07;
  const halo = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3.2);
  halo.addColorStop(0, 'rgba(255,240,190,.9)'); halo.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sx, sy, sr * 3.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (const [x, y, s] of [[0.15, 0.08, 1], [0.5, 0.16, 0.7], [0.3, 0.22, 0.55]]) {
    const cx = w * x, cy = h * y, r = 16 * s;
    for (const [dx, dy, k] of [[0, 0, 1], [r, -r * 0.4, 1.2], [r * 2.1, 0, 0.9]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r * k, 0, TAU); ctx.fill(); }
  }
  // birds / kites in the sky
  if (city.motif === 'kite') {
    const cols = ['#e0115f', '#ff8a00', '#00897b', '#7b2cbf', '#ffd23f'];
    [[0.12, 0.2], [0.35, 0.1], [0.62, 0.24], [0.9, 0.3], [0.48, 0.32]].forEach(([x, y], i) => kite(ctx, w * x, h * y, 9 + (i % 3) * 3, cols[i], -0.3 + i * 0.2));
  } else {
    ctx.strokeStyle = rgba('#5a2a10', 0.35); ctx.lineWidth = 1.5;
    for (const [x, y] of [[0.2, 0.15], [0.26, 0.17], [0.6, 0.08]]) {
      ctx.beginPath(); ctx.moveTo(w * x - 6, h * y); ctx.quadraticCurveTo(w * x - 3, h * y - 4, w * x, h * y); ctx.quadraticCurveTo(w * x + 3, h * y - 4, w * x + 6, h * y); ctx.stroke();
    }
  }
  // far hills, then the landmark, then foreground
  const base = h * 0.985;
  const H = Math.min(h * 0.2, w * 0.42);
  ctx.fillStyle = rgba(t2, 0.18);
  ctx.beginPath(); ctx.moveTo(0, base);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, base - H * 0.35 - Math.sin(x * 0.02) * H * 0.12);
  ctx.lineTo(w, base); ctx.closePath(); ctx.fill();
  const col = mix(t2, '#3b1f0e', 0.45);
  ctx.save();
  ctx.globalAlpha = 0.5;
  const draw = LANDMARKS[city.motif] || LANDMARKS.kite;
  draw(ctx, w, base, H, col);
  ctx.restore();
  if (['sea', 'beach', 'boat', 'temple'].includes(city.motif)) waves(ctx, w, base - 4, rgba(t1, 0.35), 3);
  // top-of-screen rangoli toran (festive bunting)
  const flags = ['#ff8a00', '#e0115f', '#ffd23f', '#00897b', '#7b2cbf'];
  ctx.strokeStyle = 'rgba(120,60,20,.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(w / 2, 26, w, 2); ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const t = (i + 0.5) / 14, x = w * t, y = 2 + 24 * 4 * t * (1 - t) * 0.5 + 1;
    ctx.fillStyle = flags[i % flags.length];
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 14); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const sceneCache = new Map();
/** Small landscape banner (data URL) for map headers. */
export function cityBannerURL(city, w = 520, h = 150) {
  const key = city.id + w + 'x' + h;
  if (sceneCache.has(key)) return sceneCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  // render a tall scene and crop to its lower part where the landmark lives
  const tall = document.createElement('canvas');
  tall.width = w; tall.height = Math.round(w * 1.25);
  drawCityScene(tall.getContext('2d'), tall.width, tall.height, city);
  ctx.drawImage(tall, 0, tall.height - h * 1.35, w, h * 1.35, 0, 0, w, h);
  const url = cv.toDataURL('image/jpeg', 0.82);
  sceneCache.set(key, url);
  return url;
}

// ---------------------------------------------------------------- Meri Rasoi (kitchen)

export const DECOR = [
  { id: 'wall', en: 'Walls', hi: 'दीवारें', cost: 2, v: [['Terracotta', 'टेराकोटा', '🧱'], ['Jaipur blue tiles', 'जयपुरी नीली टाइल', '🔷'], ['Mint mandala', 'पुदीना मंडला', '🌿']] },
  { id: 'floor', en: 'Floor', hi: 'फ़र्श', cost: 3, v: [['Red oxide', 'लाल फ़र्श', '🟥'], ['Athangudi tiles', 'अथंगुडी टाइल', '🏁'], ['Teak wood', 'सागौन लकड़ी', '🪵']] },
  { id: 'stove', en: 'Stove', hi: 'चूल्हा', cost: 3, v: [['Mitti chulha', 'मिट्टी का चूल्हा', '🔥'], ['Gas stove & cooker', 'गैस और कुकर', '♨️'], ['Glass hob & kadhai', 'ग्लास हॉब और कड़ाही', '🍳']] },
  { id: 'shelf', en: 'Shelf', hi: 'अलमारी', cost: 4, v: [['Steel dabbas', 'स्टील के डिब्बे', '🥫'], ['Brass & copper', 'पीतल और तांबा', '🏺'], ['Achaar jars', 'अचार की बरनियां', '🫙']] },
  { id: 'window', en: 'Window', hi: 'खिड़की', cost: 4, v: [['Wooden window', 'लकड़ी की खिड़की', '🪟'], ['Jharokha', 'झरोखा', '🕌'], ['Floral curtains', 'फूलों के पर्दे', '🌸']] },
  { id: 'toran', en: 'Toran', hi: 'तोरण', cost: 5, v: [['Mango leaves', 'आम के पत्ते', '🍃'], ['Marigold garland', 'गेंदे की माला', '🌼'], ['Beaded toran', 'मोतियों का तोरण', '📿']] },
  { id: 'plant', en: 'Plant', hi: 'पौधा', cost: 5, v: [['Tulsi pot', 'तुलसी का गमला', '🌱'], ['Money plant', 'मनी प्लांट', '🪴'], ['Hibiscus', 'गुड़हल', '🌺']] },
  { id: 'lights', en: 'Lights', hi: 'रोशनी', cost: 6, v: [['Warm bulb', 'पीला बल्ब', '💡'], ['Diya string', 'दीयों की लड़ी', '🪔'], ['Brass lantern', 'पीतल की लालटेन', '🏮']] },
  { id: 'rangoli', en: 'Rangoli', hi: 'रंगोली', cost: 6, v: [['Dot rangoli', 'बिंदु रंगोली', '⚪'], ['Flower rangoli', 'फूलों की रंगोली', '🌸'], ['Peacock rangoli', 'मोर रंगोली', '🦚']] },
];

/** Draws the kitchen. decor = { slotId: variantIndex | undefined }. Units are CSS px. */
export function drawKitchen(ctx, w, h, decor = {}, t = 0) {
  const d = (id) => decor[id];
  const floorY = h * 0.72;
  // ---- wall
  const wall = d('wall');
  const wallCols = [['#e9a77a', '#c97b4f'], ['#cfe3f5', '#9cc3e6'], ['#cdeedd', '#9bd3b5']];
  const wc = wall == null ? ['#e7ddd0', '#cfc2b2'] : wallCols[wall];
  const wg = ctx.createLinearGradient(0, 0, 0, floorY);
  wg.addColorStop(0, wc[0]); wg.addColorStop(1, wc[1]);
  ctx.fillStyle = wg; ctx.fillRect(0, 0, w, floorY);
  if (wall === 1) { // blue pottery tiles
    for (let y = 0; y < floorY * 0.62; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < w; x += 22) {
      ctx.fillStyle = 'rgba(30,80,160,.25)'; ctx.beginPath(); ctx.arc(x, y + 11, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x, y + 11, 2.2, 0, TAU); ctx.fill();
    }
  } else if (wall === 2) { // mandala stencil
    ctx.strokeStyle = 'rgba(20,110,70,.22)'; ctx.lineWidth = 1.5;
    for (const [x, y] of [[w * 0.18, h * 0.2], [w * 0.82, h * 0.48]]) for (let k = 1; k <= 4; k++) {
      ctx.beginPath(); ctx.arc(x, y, k * 7, 0, TAU); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 26, y + Math.sin(a) * 26, 5, 0, TAU); ctx.stroke(); }
    }
  } else if (wall === 0) {
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 53) % w, (i * 37) % floorY, 3, 3);
  } else {
    ctx.strokeStyle = 'rgba(120,100,80,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * 0.7, 10); ctx.lineTo(w * 0.73, 40); ctx.lineTo(w * 0.71, 60); ctx.stroke();
  }
  // ---- floor
  const fl = d('floor');
  if (fl === 1) {
    const s = 20;
    for (let y = floorY; y < h; y += s) for (let x = 0; x < w; x += s) {
      ctx.fillStyle = ((x + y) / s) % 2 < 1 ? '#f4ead8' : '#2f2a2a';
      ctx.fillRect(x, y, s, s);
    }
  } else {
    const fc = fl === 0 ? ['#b8402c', '#8c2a1c'] : fl === 2 ? ['#b07a46', '#7c522c'] : ['#bdb3a7', '#9a9086'];
    const fg = ctx.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, fc[0]); fg.addColorStop(1, fc[1]);
    ctx.fillStyle = fg; ctx.fillRect(0, floorY, w, h - floorY);
    if (fl === 2) { ctx.strokeStyle = 'rgba(60,30,10,.3)'; for (let x = 0; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x - 20, h); ctx.stroke(); } }
    if (fl === 0) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, floorY, w, 3); }
  }
  // ---- window (left)
  const win = d('window');
  const wx = w * 0.06, wy = h * 0.1, ww = w * 0.28, wh = h * 0.34;
  if (win == null) {
    ctx.fillStyle = 'rgba(120,100,80,.18)'; ctx.fillRect(wx, wy, ww, wh);
  } else {
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#9fd8ff'); sky.addColorStop(1, '#fff1c9');
    ctx.fillStyle = sky;
    if (win === 1) { ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); ctx.fill(); }
    else ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(wx + ww * 0.7, wy + wh * 0.35, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = win === 1 ? '#8a5a2b' : '#7a4a22'; ctx.lineWidth = 4;
    if (win === 1) { ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); ctx.stroke(); }
    else ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy + (win === 1 ? ww * 0.1 : 0)); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
    if (win === 2) {
      ctx.fillStyle = '#f48fb1';
      for (const side of [0, 1]) {
        const x0 = side ? wx + ww * 0.72 : wx - 4;
        ctx.beginPath(); ctx.moveTo(x0, wy - 6); ctx.lineTo(x0 + ww * 0.32, wy - 6); ctx.quadraticCurveTo(x0 + ww * (side ? 0.05 : 0.27), wy + wh * 0.6, x0 + ww * (side ? 0.2 : 0.12), wy + wh + 4); ctx.lineTo(x0, wy + wh + 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#fff'; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(wx + (i % 2 ? ww * 0.85 : ww * 0.05) + (i % 3) * 3, wy + i * wh * 0.1, 2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#c2185b'; ctx.fillRect(wx - 6, wy - 9, ww + 12, 4);
    }
  }
  // ---- shelf (right)
  const sh = d('shelf');
  const sx = w * 0.6, sy = h * 0.2, sw = w * 0.34;
  ctx.fillStyle = sh == null ? 'rgba(120,90,60,.35)' : '#8a5a2b';
  ctx.fillRect(sx, sy + 34, sw, 6);
  ctx.fillRect(sx, sy + 76, sw, 6);
  if (sh != null) {
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
      const x = sx + 8 + i * (sw - 16) / 4, y = sy + 34 + row * 42;
      if (sh === 0) { const g = ctx.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, '#8d99a6'); g.addColorStop(0.4, '#f4f7fa'); g.addColorStop(1, '#6c7782'); ctx.fillStyle = g; ctx.fillRect(x, y - 22, 16, 22); ctx.fillStyle = '#9aa6b1'; ctx.fillRect(x - 1, y - 25, 18, 4); }
      else if (sh === 1) { ctx.fillStyle = i % 2 ? '#d4882a' : '#c98b2b'; ctx.beginPath(); ctx.ellipse(x + 8, y - 10, 9, 10, 0, 0, TAU); ctx.fill(); ctx.fillRect(x + 4, y - 24, 8, 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 3, y - 14, 2, 6); }
      else { const cols = ['#e2262f', '#f6c21c', '#2fae4f', '#ff7f11']; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x, y - 24, 16, 24); ctx.fillStyle = cols[(i + row) % 4]; ctx.fillRect(x + 1, y - 16, 14, 15); ctx.fillStyle = '#c62828'; ctx.fillRect(x - 1, y - 27, 18, 4); }
    }
  }
  // ---- toran (top centre)
  const tor = d('toran');
  if (tor != null) {
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w * 0.36, h * 0.05); ctx.lineTo(w * 0.58, h * 0.05); ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const x = w * 0.37 + i * (w * 0.2) / 8, y = h * 0.05;
      if (tor === 0) { ctx.fillStyle = i % 2 ? '#2e7d32' : '#43a047'; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.quadraticCurveTo(x - 4, y + 10, x, y + 17); ctx.quadraticCurveTo(x + 4, y + 10, x + 3, y); ctx.fill(); }
      else if (tor === 1) { for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#ffb300' : '#ff8f00'; ctx.beginPath(); ctx.arc(x, y + 4 + k * 6, 3.4, 0, TAU); ctx.fill(); } }
      else { const cols = ['#e0115f', '#00897b', '#ffd23f']; for (let k = 0; k < 4; k++) { ctx.fillStyle = cols[(i + k) % 3]; ctx.beginPath(); ctx.arc(x, y + 3 + k * 5, 2.2, 0, TAU); ctx.fill(); } ctx.beginPath(); ctx.moveTo(x - 3, y + 22); ctx.lineTo(x + 3, y + 22); ctx.lineTo(x, y + 28); ctx.fill(); }
    }
  }
  // ---- counter + stove (centre)
  const cy = h * 0.52, cx0 = w * 0.3, cw = w * 0.48;
  ctx.fillStyle = '#6d4c33'; ctx.fillRect(cx0, cy + 10, cw, floorY - cy - 10);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 1; i < 3; i++) ctx.fillRect(cx0 + (cw * i) / 3, cy + 14, 2, floorY - cy - 18);
  ctx.fillStyle = '#4a4a4a'; ctx.fillRect(cx0 - 4, cy + 4, cw + 8, 8);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(cx0 - 4, cy + 4, cw + 8, 2);
  const st = d('stove'), scx = cx0 + cw / 2;
  if (st === 0) {
    ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.ellipse(scx, cy, 26, 10, 0, Math.PI, 0); ctx.lineTo(scx + 26, cy + 4); ctx.lineTo(scx - 26, cy + 4); ctx.fill();
    const fl2 = 0.8 + Math.sin(t / 120) * 0.2;
    ctx.fillStyle = '#ff7b00'; ctx.beginPath(); ctx.moveTo(scx - 10, cy - 4); ctx.quadraticCurveTo(scx, cy - 22 * fl2, scx + 10, cy - 4); ctx.fill();
    ctx.fillStyle = '#ffd000'; ctx.beginPath(); ctx.moveTo(scx - 5, cy - 4); ctx.quadraticCurveTo(scx, cy - 13 * fl2, scx + 5, cy - 4); ctx.fill();
    ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.ellipse(scx, cy - 12, 18, 5, 0, 0, TAU); ctx.fill();
  } else if (st === 1) {
    ctx.fillStyle = '#263238'; ctx.fillRect(scx - 34, cy - 4, 68, 9);
    for (const dx of [-17, 17]) { ctx.fillStyle = '#1565c0'; ctx.beginPath(); ctx.ellipse(scx + dx, cy - 4, 8, 2.5, 0, 0, TAU); ctx.fill(); }
    const g = ctx.createLinearGradient(scx - 30, 0, scx - 4, 0); g.addColorStop(0, '#8d99a6'); g.addColorStop(0.4, '#f4f7fa'); g.addColorStop(1, '#6c7782');
    ctx.fillStyle = g; ctx.fillRect(scx - 29, cy - 26, 24, 22); ctx.fillStyle = '#222'; ctx.fillRect(scx - 19, cy - 32, 4, 6); ctx.fillRect(scx - 6, cy - 28, 12, 3);
    ctx.fillStyle = '#b87333'; ctx.beginPath(); ctx.ellipse(scx + 17, cy - 9, 13, 6, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; const pf = Math.sin(t / 300) * 2; for (const [x, y, r] of [[-17, -38, 4], [-13, -44, 5], [-19, -50, 3.5]]) { ctx.beginPath(); ctx.arc(scx + x, cy + y + pf, r, 0, TAU); ctx.fill(); }
  } else if (st === 2) {
    ctx.fillStyle = '#111'; ctx.fillRect(scx - 36, cy - 2, 72, 6);
    for (const dx of [-18, 18]) { ctx.strokeStyle = 'rgba(255,60,30,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(scx + dx, cy, 9, 2.4, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(scx - 18, cy - 5, 16, 7, 0, 0, Math.PI); ctx.fill(); ctx.fillRect(scx - 38, cy - 7, 8, 3); ctx.fillRect(scx + 2 - 6, cy - 7, 8, 3);
    ctx.fillStyle = '#e65100'; ctx.beginPath(); ctx.ellipse(scx - 18, cy - 6, 12, 3, 0, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(80,60,40,.25)'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', scx, cy - 4);
  }
  // ---- plant (left floor)
  const pl = d('plant');
  if (pl != null) {
    const px = w * 0.13, py = floorY + 2;
    if (pl === 1) { // hanging money plant from the window
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * 0.08, h * 0.46); ctx.bezierCurveTo(w * 0.04, h * 0.56, w * 0.1, h * 0.62, w * 0.06, h * 0.68); ctx.stroke();
      ctx.fillStyle = '#43a047'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(w * 0.07 + (i % 2 ? 4 : -4), h * 0.47 + i * h * 0.03, 5, 3.4, i % 2 ? 0.6 : -0.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#b5651d'; ctx.fillRect(w * 0.06, h * 0.44, 18, 10);
    } else {
      ctx.fillStyle = pl === 0 ? '#c75b2a' : '#e07a3a';
      ctx.beginPath(); ctx.moveTo(px - 14, py - 24); ctx.lineTo(px + 14, py - 24); ctx.lineTo(px + 10, py); ctx.lineTo(px - 10, py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pl === 0 ? '#388e3c' : '#2e7d32';
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.3; ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * 16, py - 30 + Math.sin(a) * 14, 5, 3, a, 0, TAU); ctx.fill(); }
      if (pl === 2) { ctx.fillStyle = '#e53935'; for (const [dx, dy] of [[-8, -40], [9, -36], [0, -48]]) { for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5; ctx.beginPath(); ctx.ellipse(px + dx + Math.cos(a) * 3.5, py + dy + Math.sin(a) * 3.5, 3.2, 2, a, 0, TAU); ctx.fill(); } ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(px + dx, py + dy, 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#e53935'; } }
      if (pl === 0) { ctx.fillStyle = '#fff'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ॐ', px, py - 10); }
    }
  }
  // ---- rangoli (floor centre)
  const rg = d('rangoli');
  if (rg != null) {
    const rx = w * 0.54, ry = floorY + (h - floorY) * 0.55;
    ctx.save(); ctx.translate(rx, ry); ctx.scale(1, 0.38);
    if (rg === 0) { ctx.fillStyle = '#fff'; for (let k = 1; k <= 3; k++) for (let i = 0; i < k * 6; i++) { const a = (i * TAU) / (k * 6); ctx.beginPath(); ctx.arc(Math.cos(a) * k * 9, Math.sin(a) * k * 9, 2.2, 0, TAU); ctx.fill(); } }
    else {
      const cols = rg === 1 ? ['#ff8a00', '#e0115f', '#ffd23f', '#2fae4f'] : ['#1565c0', '#00897b', '#7b2cbf', '#ffd23f'];
      for (let k = 4; k >= 1; k--) { ctx.fillStyle = cols[k % cols.length]; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16, r = k * 10 + (i % 2 ? 0 : 5); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
      if (rg === 2) { ctx.fillStyle = '#0d47a1'; ctx.beginPath(); ctx.ellipse(0, -8, 5, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#00bfa5'; for (let i = 0; i < 7; i++) { const a = Math.PI + (i * Math.PI) / 6; ctx.beginPath(); ctx.arc(Math.cos(a) * 30, Math.sin(a) * 30, 5, 0, TAU); ctx.fill(); } }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // ---- lights (top)
  const li = d('lights');
  if (li === 0) {
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w * 0.47, 0); ctx.lineTo(w * 0.47, h * 0.16); ctx.stroke();
    const gl = ctx.createRadialGradient(w * 0.47, h * 0.18, 2, w * 0.47, h * 0.18, 60); gl.addColorStop(0, 'rgba(255,230,140,.6)'); gl.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(w * 0.47, h * 0.18, 60, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(w * 0.47, h * 0.18, 6, 0, TAU); ctx.fill();
  } else if (li === 1) {
    ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h * 0.03); ctx.quadraticCurveTo(w / 2, h * 0.14, w, h * 0.03); ctx.stroke();
    for (let i = 1; i < 12; i++) {
      const tt = i / 12, x = w * tt, y = h * 0.03 + h * 0.11 * 4 * tt * (1 - tt) * 0.5 + 4;
      const flick = 0.75 + Math.sin(t / 150 + i) * 0.25;
      const gl = ctx.createRadialGradient(x, y, 1, x, y, 12); gl.addColorStop(0, `rgba(255,200,80,${0.6 * flick})`); gl.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b5651d'; ctx.beginPath(); ctx.ellipse(x, y + 3, 4, 2, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.ellipse(x, y, 1.5, 3 * flick, 0, 0, TAU); ctx.fill();
    }
  } else if (li === 2) {
    const lx = w * 0.47, ly = h * 0.15;
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, ly - 10); ctx.stroke();
    const gl = ctx.createRadialGradient(lx, ly, 2, lx, ly, 55); gl.addColorStop(0, 'rgba(255,190,90,.55)'); gl.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(lx, ly, 55, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c98b2b'; ctx.beginPath(); ctx.moveTo(lx - 9, ly - 10); ctx.lineTo(lx + 9, ly - 10); ctx.lineTo(lx + 11, ly + 10); ctx.lineTo(lx - 11, ly + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe082'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(lx + i * 5, ly, 1.8, 0, TAU); ctx.fill(); }
  }
  // dust/shimmer when the kitchen is still bare
  const owned = Object.values(decor).filter((v) => v != null).length;
  if (owned === 0) {
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(0, 0, w, h);
  }
}
