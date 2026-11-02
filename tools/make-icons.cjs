// Renders launcher icons + splash screens for Android from www/assets/icon.svg using Playwright.
//   node tools/make-icons.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const res = path.join(__dirname, '../android/app/src/main/res');
const svg = fs.readFileSync(path.join(__dirname, '../www/assets/icon.svg'), 'utf8');
const fg = svg.replace(/<rect width="512" height="512" rx="112" fill="url\(#bg\)"\/>/, '');
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const f64 = (n) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, '../www/assets/fonts/' + n)).toString('base64');
const fontCss = `@font-face{font-family:B;src:url(${f64('baloo-2-devanagari-800-normal.woff2')})}@font-face{font-family:B;src:url(${f64('baloo-2-latin-800-normal.woff2')});unicode-range:U+0000-00FF}`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const render = async (html, w, h, file, transparent = false) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><head><style>${fontCss}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}</style></head><body>${html}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(100);
    await p.screenshot({ path: file, omitBackground: transparent });
  };
  for (const [d, k] of Object.entries(dens)) {
    const s = Math.round(48 * k), f = Math.round(108 * k);
    await render(`<div style="width:${s}px;height:${s}px">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`, s, s, `${res}/mipmap-${d}/ic_launcher.png`, true);
    await render(`<div style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</div>`, s, s, `${res}/mipmap-${d}/ic_launcher_round.png`, true);
    const inner = Math.round(f * 0.62), off = Math.round((f - inner) / 2);
    await render(`<div style="padding:${off}px">${fg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>`, f, f, `${res}/mipmap-${d}/ic_launcher_foreground.png`, true);
  }
  const splash = (w, h) => `<div style="width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#ff8a00,#e0115f);font-family:B;color:#fff;text-align:center">
    ${svg.replace('<svg ', `<svg width="${Math.round(Math.min(w, h) * 0.32)}" height="${Math.round(Math.min(w, h) * 0.32)}" `)}
    <div style="font-size:${Math.round(Math.min(w, h) * 0.11)}px;line-height:1.1;margin-top:${Math.round(h * 0.02)}px">मसाला यात्रा</div>
    <div style="font-size:${Math.round(Math.min(w, h) * 0.05)}px;letter-spacing:.2em;opacity:.9">MASALA YATRA</div></div>`;
  const ports = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
  for (const [d, [w, h]] of Object.entries(ports)) {
    await render(splash(w, h), w, h, `${res}/drawable-port-${d}/splash.png`);
    await render(splash(h, w), h, w, `${res}/drawable-land-${d}/splash.png`);
  }
  await render(splash(480, 800), 480, 800, `${res}/drawable/splash.png`);
  await b.close();
  console.log('icons + splash written');
})();
