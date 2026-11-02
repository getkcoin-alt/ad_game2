// End-to-end smoke test in a phone-sized Chromium: onboarding → play level 1 to a win →
// map, diary, shelf, settings, Hindi, a lose + rewarded-ad continue. Fails on any page error.
//   npm run serve   (in another terminal)   then   npm run e2e
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const URL = process.env.URL || 'http://localhost:8080/';
const OUT = process.env.SHOTS || null;
const errors = [];
const step = (m) => console.log('•', m);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (name) => { if (OUT) await p.screenshot({ path: `${OUT}/${name}.png` }); };
const wait = (ms) => p.waitForTimeout(ms);

await p.addInitScript(() => { window.__FAST_ADS = true; });
await p.goto(URL);
await wait(800);
step('onboarding');
await p.click('[data-lang="en"]');
await p.click('[data-a="go"]');
await wait(400);
await p.click('.prelevel [data-a="go"]');
await wait(700);
await p.click('.intro button');
await wait(500);

step('play level 1 with real swipes until it is won');
async function swipeMove() {
  return p.evaluate(() => {
    const g = window.__my.game;
    if (g.busy || g.view.busy) return 'busy';
    if (g.session.state !== 'playing') return g.session.state;
    const mv = g.session.board.findHint();
    return mv;
  });
}
for (let i = 0; i < 40; i++) {
  const mv = await swipeMove();
  if (mv === 'won' || mv === 'lost') break;
  if (mv === 'busy' || !mv) { await wait(250); continue; }
  const box = await p.evaluate(([a, bb]) => {
    const v = window.__my.game.view;
    const r = v.canvas.getBoundingClientRect();
    const pa = v.cellCenter(a[0], a[1]), pb = v.cellCenter(bb[0], bb[1]);
    return { ax: r.left + pa.x, ay: r.top + pa.y, bx: r.left + pb.x, by: r.top + pb.y };
  }, mv);
  await p.mouse.move(box.ax, box.ay);
  await p.mouse.down();
  await p.mouse.move((box.ax + box.bx) / 2, (box.ay + box.by) / 2, { steps: 3 });
  await p.mouse.move(box.bx, box.by, { steps: 3 });
  await p.mouse.up();
  if (i === 1) { await wait(180); await shot('10-midturn'); }
  await wait(900);
}
await wait(1600);
await shot('11-win');
const won = await p.$('.win-modal');
if (!won) throw new Error('level 1 was not won with hint moves');
const starsOn = await p.$$eval('.star.on', (s) => s.length);
step(`won level 1 with ${starsOn} stars`);
await p.click('[data-a="next"]');
await wait(500);
await shot('12-prelevel2');
await p.keyboard.press('Escape');
await wait(300);

step('map');
await p.evaluate(() => window.__my.openMap());
await wait(500);
await shot('13-map');
step('diary + shelf + settings');
await p.evaluate(() => window.__my.goHome());
await wait(300);
await p.click('[data-a="diary"]');
await wait(300);
await shot('14-diary');
await p.evaluate(() => window.__my.goHome());
await p.click('[data-a="shelf"]');
await wait(300);
await shot('15-shelf');
await p.keyboard.press('Escape');
await wait(300);
await p.click('[data-a="settings"]');
await wait(300);
await p.click('[data-lang="hi"]');
await wait(400);
await shot('16-settings-hi');
await p.keyboard.press('Escape');
await wait(300);
await shot('17-home-hi');

step('lose flow + rewarded continue (level 5, Hindi)');
await p.evaluate(() => { window.__my.save.unlocked = 6; window.__my.enterLevel(window.__my.getLevel(5)); });
await wait(800);
const intro = await p.$('.intro button');
if (intro) { await intro.click(); await wait(300); }
await p.evaluate(() => { const g = window.__my.game; g.session.movesLeft = 1; g._updateMoves(); });
await shot('18-game-hi');
for (let i = 0; i < 5; i++) {
  const mv = await swipeMove();
  if (Array.isArray(mv)) await p.evaluate((m) => window.__my.game.handleSwap(m[0], m[1]), mv);
  await wait(1500);
  if (await p.$('.lose')) break;
}
await shot('19-lose');
if (!(await p.$('.lose'))) throw new Error('lose modal missing');
await p.click('[data-a="ad"]');
await wait(400);
await shot('20-mock-ad');
await p.waitForSelector('.mock-ad-close:not([disabled])', { timeout: 5000 });
await p.click('.mock-ad-close');
await wait(500);
const moves = await p.evaluate(() => window.__my.game.session.movesLeft);
if (moves !== 5) throw new Error('continue did not add 5 moves, got ' + moves);
step('continue granted +5 moves');

step('tadka');
await p.evaluate(() => { const g = window.__my.game; g.session.tadka = 30; g._updateTadka(); });
await wait(200);
await p.click('.tadka-btn');
await wait(250);
await shot('21-tadka');
await wait(2000);

const evs = await p.evaluate(() => (window.__myEvents || []).map((e) => e.name));
for (const need of ['app_open', 'privacy_accepted', 'level_start', 'level_win', 'level_fail', 'ad_reward', 'continue_accept', 'tadka_use']) {
  if (!evs.includes(need)) throw new Error('missing analytics event ' + need);
}
step(`analytics ok (${evs.length} events)`);
await b.close();
if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('E2E PASSED');
