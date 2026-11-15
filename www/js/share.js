// "Brag card": a shareable 1080×1350 image of a win (city backdrop, stars, dishes and the player's
// own decorated kitchen) sent through the native share sheet — WhatsApp is the main channel for
// this audience. Uses @capacitor/share + @capacitor/filesystem on Android, Web Share on the web.

import { drawCityScene, drawKitchen } from './render/scenes.js';
import { tileSprite } from './render/art.js';
import { analytics } from './analytics.js';
import { t, L, getLang } from './i18n.js';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=in.masalayatra.game';

function shareUrl() {
  if (window.Capacitor?.isNativePlatform?.()) return PLAY_URL;
  const { protocol, hostname, origin } = location;
  return protocol.startsWith('http') && !/^(localhost|127\.)/.test(hostname) ? origin : PLAY_URL;
}

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export async function makeWinCard({ level, city, stars, dishes, decor }) {
  try { await document.fonts.load('800 60px "Baloo 2"'); await document.fonts.load('800 60px "Baloo 2"', 'मसाला'); } catch { /* fall back to system font */ }
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  drawCityScene(ctx, W, H, city);
  const font = (w, s) => `${w} ${s}px "Baloo 2", system-ui, sans-serif`;
  // card
  ctx.shadowColor = 'rgba(60,20,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fffaf1';
  roundRect(ctx, 80, 170, W - 160, 930, 56); ctx.fill();
  ctx.shadowColor = 'transparent';
  // ribbon
  const rg = ctx.createLinearGradient(220, 0, W - 220, 0);
  rg.addColorStop(0, '#ff8a00'); rg.addColorStop(1, '#e0115f');
  ctx.fillStyle = rg; roundRect(ctx, 200, 120, W - 400, 120, 30); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = font(800, 72); ctx.fillText(t('win1'), W / 2, 184);
  // stars
  for (let i = 0; i < 3; i++) {
    const on = i < stars;
    ctx.font = font(800, i === 1 ? 170 : 140);
    ctx.fillStyle = on ? '#ffb300' : '#e5d6c2';
    if (on) { ctx.shadowColor = 'rgba(255,170,0,.6)'; ctx.shadowBlur = 30; }
    ctx.fillText('★', W / 2 + (i - 1) * 190, i === 1 ? 360 : 380);
    ctx.shadowColor = 'transparent';
  }
  // level + city
  ctx.fillStyle = '#7a3b12'; ctx.font = font(800, 56);
  ctx.fillText(level.daily ? t('daily') : `${t('levelN', { n: level.n })} · ${L(city)}`, W / 2, 500);
  // dishes with ingredient icons
  ctx.font = font(700, 44); ctx.fillStyle = '#3b1f0e';
  dishes.slice(0, 3).forEach((d, i) => {
    const y = 580 + i * 70;
    ctx.fillText(`✓ ${L(d)}`, W / 2 + 30, y);
    const ing = d.items.find((it) => it.kind === 'ing');
    if (ing) ctx.drawImage(tileSprite(ing.color, null, 96), W / 2 - 40 - ctx.measureText(`✓ ${L(d)}`).width / 2 - 30, y - 30, 60, 60);
  });
  // the player's kitchen — the personal touch that makes a card worth sending
  const kx = 210, ky = 790, kw = W - 420, kh = Math.round(kw * 0.44);
  ctx.save();
  roundRect(ctx, kx, ky, kw, kh, 28); ctx.clip();
  ctx.translate(kx, ky); ctx.scale(kw / 320, kh / 141);
  drawKitchen(ctx, 320, 141, decor || {}, 0);
  ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; roundRect(ctx, kx, ky, kw, kh, 28); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.92)'; roundRect(ctx, kx + 20, ky + 18, 270, 54, 27); ctx.fill();
  ctx.fillStyle = '#7a3b12'; ctx.font = font(800, 32); ctx.textAlign = 'left'; ctx.fillText(`🏠 ${t('rasoi')}`, kx + 40, ky + 46);
  // footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = font(800, 88);
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 12;
  ctx.fillText('मसाला यात्रा', W / 2, 1185);
  ctx.font = font(700, 40); ctx.fillText('Masala Yatra · ' + (getLang() === 'hi' ? 'मुफ़्त खेलें' : 'Play free'), W / 2, 1265);
  ctx.shadowColor = 'transparent';
  return cv;
}

/** Shares a win card. Returns 'shared' | 'cancelled' | 'unsupported'. */
export async function shareWin(info) {
  const cv = await makeWinCard(info);
  const mainDish = info.dishes[0] ? L(info.dishes[0]) : '';
  const text = `${t('shareText', { dish: mainDish, s: info.stars })}\n${shareUrl()}`;
  analytics.track('share_win', { level: info.level.n, stars: info.stars });
  const cap = window.Capacitor;
  const Share = cap?.Plugins?.Share, Filesystem = cap?.Plugins?.Filesystem;
  try {
    if (cap?.isNativePlatform?.() && Share && Filesystem) {
      const base64 = cv.toDataURL('image/png').split(',')[1];
      const file = await Filesystem.writeFile({ path: `masala-yatra-${Date.now()}.png`, data: base64, directory: 'CACHE' });
      await Share.share({ title: 'Masala Yatra', text, files: [file.uri], dialogTitle: t('shareWin') });
      return 'shared';
    }
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const file = new File([blob], 'masala-yatra.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'Masala Yatra' }); return 'shared'; }
    if (navigator.share) { await navigator.share({ text, title: 'Masala Yatra' }); return 'shared'; }
    // desktop fallback: download the image
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'masala-yatra.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return 'shared';
  } catch {
    return 'cancelled';
  }
}
