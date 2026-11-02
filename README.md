# Masala Yatra · मसाला यात्रा

A cosy, Android-first cooking match-3 for Indian players. You cook dishes for guests on a food trip across 10 Indian cities, and each city you finish unlocks a **real recipe** you can cook at home.

* **No lives, no timers, no interstitials.** Rewarded ads only, always the player's choice.
* **English + हिंदी** throughout. All art and sound are generated in code (no image or audio files).
* **60 levels**, each balanced by a bot that plays it 60 times, plus a Daily Thali puzzle.
* **Meri Rasoi:** decorate your own kitchen with the stars you earn. A **Bonus Tadka** finale plays at the end of each win, and every city has its own landmark skyline behind the board.

The full product thinking (audience, psychology, ethics, monetisation, unit economics, analytics) is in **[docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)**.

## Play it locally

```bash
npm run serve
```

Open http://localhost:8080 and use your browser's mobile emulation (e.g. 360×780). Ads in the browser are a clearly marked **test ad** overlay.

## Tests

```bash
npm test
```

Runs the engine unit and fuzz tests: matches, specials, combos, dough, locks, gravity, shuffles, and random play across all 60 levels.

```bash
npm run e2e
```

Runs the Playwright smoke test on a phone viewport: onboarding → win level 1 → map/diary/shop/settings → Hindi → lose → rewarded continue → tadka → analytics checks. Start `npm run serve` first.

```bash
npm run balance
```

Re-runs the difficulty bot and rewrites `www/js/engine/tuning.js`. Do this after changing level generation.

## Build the Android app

Requirements: Node 18+, JDK 17+, Android SDK (platform 34, build-tools 34).

```bash
npm install
```

```bash
npx cap sync android
```

```bash
cd android && ./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Or open the `android/` folder in Android Studio and press Run.

The Gradle wrapper is set to 8.14 and the Android Gradle Plugin to 8.7.3, so the project builds on JDK 17–21.

### Before releasing to Play

1. **Ads and earning money:** follow **[docs/MONETIZATION.md](docs/MONETIZATION.md)**. In short:
   1. Create AdMob (and optionally AdSense) accounts.
   2. Write your IDs into the game with one command:
      ```bash
      npm run ads:setup -- --admob-app … --rewarded … --adsense …
      ```
   3. Publish `app-ads.txt`.

   Release builds refuse to compile while test ad IDs are still configured.
2. **Analytics (optional):** `npm i @capacitor-firebase/analytics firebase`, add `google-services.json` to `android/app/`, then `npx cap sync`. `analytics.js` detects the plugin automatically.
3. **Signing:** create an upload keystore and run `./gradlew bundleRelease` to get an AAB.
4. **Store listing:** publish a privacy policy URL, fill in the Play *Data safety* form (anonymous gameplay analytics and advertising ID, used by AdMob), and set the content rating and target audience to 18+.

## Project layout

```
www/                  the game (served as-is; Capacitor webDir)
  js/engine/          pure, deterministic match-3 engine + level generator + content
  js/game/            play-session rules + in-level controller
  js/render/          procedural art + canvas renderer/animations/input
  js/*.js             meta screens, audio synth, ads, analytics, storage, i18n
tools/                balancing bot, dev server, icon/splash generator
tests/                unit/fuzz tests + Playwright e2e
android/              Capacitor Android project
docs/GAME_DESIGN.md   design, psychology, monetisation, analytics
```

## Known limitations

* Levels are procedurally generated and tuned by a bot. They have not been playtested with real users yet, so tune `targetWinRate` in `tools/balance.mjs` from soft-launch data.
* Saves are local only (no cloud save or account).
* Recipe *steps* are in English; recipe titles, tips, and all UI are bilingual.
* Music is a minimal synthesised tanpura drone, off by default.
* No iOS project yet (Capacitor supports adding one with `npx cap add ios`).
* Ad revenue can't be verified outside a live AdMob account. The Android build uses Google's public test ids.
