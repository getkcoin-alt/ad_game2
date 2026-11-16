// Generates Google Play store graphics from the real game (needs `npm run serve` running):
//   store/screenshots/{en,hi}/01-*.png  1080×1920 captioned phone screenshots
//   store/icon-512.png                  512×512 hi-res icon
//   store/feature-graphic.png           1024×500 feature graphic
//   node tools/store-assets.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.URL || 'http://localhost:8080/';
const OUT = path.join(__dirname, '../store');
const svg = fs.readFileSync(path.join(__dirname, '../www/assets/icon.svg'), 'utf8');
const f64 = (n) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, '../www/assets/fonts/' + n)).toString('base64');
const FONT = `@font-face{font-family:B;src:url(${f64('baloo-2-devanagari-800-normal.woff2')})}@font-face{font-family:B;src:url(${f64('baloo-2-latin-800-normal.woff2')});unicode-range:U+0000-00FF}`;

const CAPTIONS = {
  en: [
    ['Cook dishes for guests', 'Match spices, chillies & more'],
    ['Travel across India', '10 cities · 60 levels'],
    ['Unlock REAL recipes', 'Vada Pav, Dhokla, Biryani…'],
    ['Decorate Meri Rasoi', 'Your own kitchen, your style'],
    ['Big, juicy combos', 'Belan, Pressure Cooker, Masala Dabba'],
    ['No lives. No timers.', 'Play as much as you like'],
  ],
  hi: [
    ['मेहमानों के लिए खाना बनाएं', 'मसाले, मिर्च और भी बहुत कुछ मिलाएं'],
    ['पूरे भारत की यात्रा', '10 शहर · 60 लेवल'],
    ['असली रेसिपी पाएं', 'वड़ा पाव, ढोकला, बिरयानी…'],
    ['मेरी रसोई सजाएं', 'आपकी रसोई, आपका अंदाज़'],
    ['ज़बरदस्त कॉम्बो', 'बेलन, प्रेशर कुकर, मसाला डिब्बा'],
    ['कोई जान नहीं, कोई टाइमर नहीं', 'जितना मन करे उतना खेलें'],
  ],
};

async function seed(page, lang, extra = {}) {
  const stars = {}; for (let i = 1; i <= 13; i++) stars[i] = i % 4 === 0 ? 2 : 3;
  await page.addInitScript(({ lang, stars, extra }) => {
    window.__FAST_ADS = true;
    localStorage.setItem('masala-yatra:save', JSON.stringify(Object.assign({
      v: 2, privacyAccepted: true, unlocked: 14, coins: 860, settings: { lang, music: true },
      seenIntros: ['basics', 'rowpin', 'tadka', 'cooker', 'dough', 'dabba', 'combo', 'lock', 'sixth'],
      gift: { lastClaim: new Date().toISOString().slice(0, 10) }, recipes: ['mumbai', 'ahmedabad'], stars, chests: 2,
      decor: { owned: { wall: [1], floor: [1], stove: [1], shelf: [2], window: [2], lights: [1], rangoli: [1], plant: [2], toran: [1] }, using: { wall: 1, floor: 1, stove: 1, shelf: 2, window: 2, lights: 1, rangoli: 1, plant: 2, toran: 1 }, spent: 40 },
    }, extra)));
  }, { lang, stars, extra });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const lang of ['en', 'hi']) {
    const dir = path.join(OUT, 'screenshots', lang);
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await seed(p, lang);
    await p.goto(URL); await p.waitForTimeout(1200);
    const raw = [];
    const snap = async () => { raw.push(await p.screenshot()); };
    // 1 gameplay mid-combo
    await p.evaluate(() => window.__my.enterLevel(window.__my.getLevel(14))); await p.waitForTimeout(900);
    await p.evaluate(() => { const g = window.__my.game, bd = g.session.board; const cells = []; for (let r = 0; r < bd.rows; r++) for (let c = 0; c < bd.cols; c++) if (bd.tiles[r][c] && !bd.lock[r][c]) cells.push([r, c]); [['row', 9], ['cooker', 22], ['dabba', 37]].forEach(([s, i]) => { const [r, c] = cells[i]; bd.tiles[r][c].special = s; if (s === 'dabba') bd.tiles[r][c].color = -1; }); g.view.syncFromBoard(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => { const g = window.__my.game; const m = g.session.board.findHint(); g.handleSwap(m[0], m[1]); });
    await p.waitForTimeout(380); await snap();
    // 2 map
    await p.evaluate(() => window.__my.openMap(14)); await p.waitForTimeout(700); await snap();
    // 3 recipe
    await p.evaluate(() => window.__my.goHome()); await p.waitForTimeout(300);
    await p.evaluate(() => { document.querySelector('[data-a="diary"]').click(); }); await p.waitForTimeout(400);
    await p.evaluate(() => { document.querySelector('.recipe-card.have').click(); }); await p.waitForTimeout(600); await snap();
    // 4 kitchen
    await p.evaluate(() => window.__my.goHome()); await p.waitForTimeout(500); await snap();
    // 5 finale / big combo
    await p.evaluate(() => window.__my.enterLevel(window.__my.getLevel(12))); await p.waitForTimeout(900);
    await p.evaluate(async () => { const g = window.__my.game; const res = g.session.board.bonusFinale(6); g.view.playFinale(res.phases, g.level ? (document.documentElement.lang === 'hi' ? 'बोनस तड़का!' : 'Bonus Tadka!') : ''); });
    await p.waitForTimeout(700); await snap();
    await p.waitForFunction(() => !window.__my.game.view.busy, null, { timeout: 15000 });
    // 6 win
    await p.evaluate(() => window.__my.enterLevel(window.__my.getLevel(13))); await p.waitForTimeout(800);
    await p.evaluate(() => { const g = window.__my.game; g.session.movesLeft = 60; });
    for (let i = 0; i < 80; i++) {
      const st = await p.evaluate(async () => { const g = window.__my.game; if (g.session.state !== 'playing') return g.session.state; const m = g.session.board.findHint(); await g.handleSwap(m[0], m[1]); return g.session.state; });
      if (st === 'won') break;
    }
    await p.waitForSelector('.win-modal', { timeout: 25000 }); await p.waitForTimeout(2600); await snap();
    await ctx.close();
    // compose captioned 1080×1920 frames
    const comp = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    for (let i = 0; i < raw.length; i++) {
      const [title, sub] = CAPTIONS[lang][i];
      const img = 'data:image/png;base64,' + raw[i].toString('base64');
      await comp.setContent(`<html><head><style>${FONT}
        body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:B,sans-serif;background:linear-gradient(160deg,#ff9f1c,#e0115f);display:flex;flex-direction:column;align-items:center}
        h1{color:#fff;font-size:${lang === 'hi' ? 78 : 86}px;line-height:1.05;margin:70px 40px 8px;text-align:center;text-shadow:0 5px 0 rgba(0,0,0,.18)}
        p{color:#fff3d6;font-size:46px;margin:0 40px 40px;text-align:center}
        .ph{width:760px;height:1520px;border-radius:56px;overflow:hidden;border:12px solid #fff;box-shadow:0 30px 60px rgba(60,10,0,.35);background:#fff}
        .ph img{width:100%;height:100%;object-fit:cover;object-position:top}
      </style></head><body><h1>${title}</h1><p>${sub}</p><div class="ph"><img src="${img}"></div></body></html>`);
      await comp.evaluate(() => document.fonts.ready); await comp.waitForTimeout(150);
      await comp.screenshot({ path: path.join(dir, `0${i + 1}.png`) });
    }
    await comp.close();
    console.log(`screenshots/${lang}: ${raw.length}`);
  }
  // icon 512
  const ip = await b.newPage({ viewport: { width: 512, height: 512 } });
  await ip.setContent(`<html><body style="margin:0">${svg.replace('<svg ', '<svg width="512" height="512" ')}</body></html>`);
  await ip.screenshot({ path: path.join(OUT, 'icon-512.png') });
  // feature graphic 1024×500
  const fp = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await fp.goto(URL); // same origin so the game modules can draw the art
  await fp.evaluate(async ({ FONT, svg }) => {
    const { drawCityScene } = await import('./js/render/scenes.js');
    const { tileSprite } = await import('./js/render/art.js');
    const { CITIES } = await import('./js/engine/content.js');
    const st = document.createElement('style'); st.textContent = FONT; document.head.appendChild(st);
    await document.fonts.load('800 80px B'); await document.fonts.load('800 80px B', 'मसाला');
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 500; document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    drawCityScene(ctx, 1024, 500, CITIES[0]);
    const g = ctx.createLinearGradient(0, 0, 1024, 0); g.addColorStop(0, 'rgba(224,17,95,.88)'); g.addColorStop(0.6, 'rgba(255,138,0,.55)'); g.addColorStop(1, 'rgba(255,138,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 500);
    const icon = new Image(); icon.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); await icon.decode();
    ctx.drawImage(icon, 56, 150, 200, 200);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 10;
    ctx.font = '800 96px B'; ctx.fillText('चटपटा', 290, 250);
    ctx.font = '800 50px B'; ctx.fillText('Chatpata', 294, 318);
    ctx.font = '800 30px B'; ctx.fillStyle = '#fff3d6'; ctx.fillText('Cook · Match · Travel India', 296, 370);
    ctx.shadowBlur = 0;
    [[0, 785, 85], [2, 785, 335], [5, 905, 80], [1, 905, 210], [3, 905, 340]].forEach(([c, x, y]) => ctx.drawImage(tileSprite(c, null, 192), x, y, 110, 110));
    ctx.drawImage(tileSprite(0, 'dabba', 192), 780, 205, 120, 120);
  }, { FONT, svg });
  await fp.screenshot({ path: path.join(OUT, 'feature-graphic.png') });
  await b.close();
  console.log('icon-512.png + feature-graphic.png written');
})();
