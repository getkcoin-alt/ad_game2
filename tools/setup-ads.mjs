#!/usr/bin/env node
// One-command ad configuration. Writes your real ids everywhere they are needed:
//   www/js/ad-config.js         (rewarded unit ids, AdSense client)
//   android/gradle.properties   (ADMOB_APP_ID → AndroidManifest via manifest placeholder)
//   www/ads.txt, www/app-ads.txt (seller verification, served from your website root)
//
// Example:
//   npm run ads:setup -- --pub pub-1234567890123456 \
//     --admob-app ca-app-pub-1234567890123456~1111111111 \
//     --rewarded ca-app-pub-1234567890123456/2222222222 \
//     --adsense ca-pub-1234567890123456 --web-live
//
// Run with --check to only print the current configuration status.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const path = (p) => new URL(p, root);
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes(name);

if (flag('--help') || flag('-h')) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

const RX = {
  pub: /^pub-\d{16}$/,
  app: /^ca-app-pub-\d{16}~\d{10}$/,
  unit: /^ca-app-pub-\d{16}\/\d{10}$/,
  adsense: /^ca-pub-\d{16}$/,
};
const TEST_PUB = '3940256099942544';

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

let pub = arg('--pub');
const appId = arg('--admob-app');
const rewarded = arg('--rewarded');
const rewardedIos = arg('--rewarded-ios');
const adsense = arg('--adsense');

if (pub && !RX.pub.test(pub)) fail(`--pub must look like pub-1234567890123456 (got ${pub})`);
if (appId && !RX.app.test(appId)) fail(`--admob-app must look like ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY (got ${appId})`);
if (rewarded && !RX.unit.test(rewarded)) fail(`--rewarded must look like ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY (got ${rewarded})`);
if (rewardedIos && !RX.unit.test(rewardedIos)) fail(`--rewarded-ios must look like ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`);
if (adsense && !RX.adsense.test(adsense)) fail(`--adsense must look like ca-pub-1234567890123456 (got ${adsense})`);
for (const v of [appId, rewarded, rewardedIos, adsense, pub]) if (v && v.includes(TEST_PUB)) fail('Those are Google TEST ids — use the ids from your own AdMob/AdSense account.');

// derive publisher id from any provided id when not given explicitly
if (!pub) {
  const any = appId || rewarded || adsense;
  const m = any && any.match(/pub-(\d{16})/);
  if (m) pub = `pub-${m[1]}`;
}

// ---- ad-config.js
const cfgPath = path('www/js/ad-config.js');
let cfg = readFileSync(cfgPath, 'utf8');
const setField = (key, value) => {
  const re = new RegExp(`(${key}:\\s*)(?:'[^']*'|true|false)`);
  if (!re.test(cfg)) fail(`could not find ${key} in ad-config.js`);
  cfg = cfg.replace(re, `$1${typeof value === 'boolean' ? value : `'${value}'`}`);
};
if (!flag('--check')) {
  if (pub) setField('publisherId', pub);
  if (rewarded) setField('rewardedAndroid', rewarded);
  if (rewardedIos) setField('rewardedIos', rewardedIos);
  if (adsense) setField('client', adsense);
  if (flag('--web-live')) setField('testMode', false);
  if (flag('--web-test')) setField('testMode', true);
  if (flag('--force-test')) setField('forceTest', true);
  if (flag('--no-force-test')) setField('forceTest', false);
  writeFileSync(cfgPath, cfg);

  // ---- gradle.properties
  if (appId) {
    const gp = path('android/gradle.properties');
    let g = existsSync(gp) ? readFileSync(gp, 'utf8') : '';
    g = /^ADMOB_APP_ID=.*$/m.test(g) ? g.replace(/^ADMOB_APP_ID=.*$/m, `ADMOB_APP_ID=${appId}`) : g.trimEnd() + `\n\n# AdMob app id (written by tools/setup-ads.mjs)\nADMOB_APP_ID=${appId}\n`;
    writeFileSync(gp, g);
  }

  // ---- ads.txt / app-ads.txt (Google's certification authority id is f08c47fec0942fa0)
  if (pub) {
    const line = `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
    writeFileSync(path('www/ads.txt'), line);
    writeFileSync(path('www/app-ads.txt'), line);
  }
}

// ---- status report
const now = readFileSync(cfgPath, 'utf8');
const get = (key) => (now.match(new RegExp(`${key}:\\s*('([^']*)'|true|false)`)) || [])[2] ?? (now.match(new RegExp(`${key}:\\s*(true|false)`)) || [])[1];
const gpText = existsSync(path('android/gradle.properties')) ? readFileSync(path('android/gradle.properties'), 'utf8') : '';
const gradleApp = (gpText.match(/^ADMOB_APP_ID=(.*)$/m) || [])[1];
const ok = (b) => (b ? '✓' : '·');
console.log('\nMasala Yatra ad configuration');
console.log(` ${ok(get('publisherId'))} publisher id        ${get('publisherId') || '(not set)'}`);
console.log(` ${ok(gradleApp)} AdMob app id (Android) ${gradleApp || '(not set → Google TEST app id)'}`);
console.log(` ${ok(get('rewardedAndroid'))} rewarded unit Android ${get('rewardedAndroid') || '(not set → TEST ads)'}`);
console.log(` ${ok(get('rewardedIos'))} rewarded unit iOS     ${get('rewardedIos') || '(not set)'}`);
console.log(` ${ok(get('client'))} AdSense client (web)  ${get('client') || '(not set → mock ads on web)'}`);
console.log(`   web test mode         ${get('testMode')}`);
console.log(` ${ok(existsSync(path('www/app-ads.txt')))} app-ads.txt / ads.txt ${existsSync(path('www/app-ads.txt')) ? 'written to www/ (served at your site root)' : '(run with --pub)'}`);
console.log('\nNext: npx cap sync android && (cd android && ./gradlew bundleRelease)\n');
