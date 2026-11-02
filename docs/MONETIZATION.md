# Earning money with ads — setup guide

Masala Yatra earns from **rewarded ads only**. The player chooses to watch a short ad in exchange for something useful:

| Placement | Reward | Daily cap |
|---|---|---|
| Out of moves | +5 moves | 8 |
| Level won | 2× coins | 8 |
| Kitchen shelf | free booster | 3 |
| Dadi's daily gift | +1 Chamach | 1 |

There are at most 20 rewarded views per player per day. Rewarded ads pay the highest rates of any format and don't annoy players, so they suit a long-lived casual game.

The code is fully integrated. **All you need is your own account IDs**, written in with one command.

| Where the game runs | Ad platform | Status in code |
|---|---|---|
| Android app (Play Store) | **Google AdMob**, rewarded video | ✅ integrated, with Google consent (UMP), preloading and retry |
| Web (Vercel / any site) | **Google AdSense H5 Games Ads** (Ad Placement API) | ✅ integrated |
| iOS app (later) | AdMob | ✅ code ready (`rewardedIos`); needs the iOS project |

---

## 1. Create your AdMob account (Android money)

1. Go to **admob.google.com** and sign in with a Google account you'll keep long-term.
2. **Payments → Payment info:** enter your legal name and address exactly as on your bank account, your PAN/tax details when asked, and a bank account for payment.
   * Google mails a **PIN** to your address once your earnings pass the verification threshold; enter it in AdMob.
   * You're paid monthly once your balance passes the payment threshold shown in your account.
3. **Apps → Add app → Android.** Choose "not yet published" if the game isn't on Play yet, and name it *Masala Yatra*. You get an **App ID** like `ca-app-pub-1234567890123456~1234567890`.
4. **Ad units → Add ad unit → Rewarded.** Name it `rewarded_main`, with reward amount 1 and item "reward" (the game decides the actual reward). You get an **Ad unit ID** like `ca-app-pub-1234567890123456/1234567890`.
5. **Privacy & messaging → GDPR / US states:** create the consent messages. The game already shows Google's consent form wherever it's legally required.

## 2. Create your AdSense account (web money, optional)

1. Go to **adsense.google.com**, sign up, and add the site the game is hosted on (your Vercel URL or a custom domain).
2. Apply for **H5 Games Ads** (AdSense → Ads → *H5 games*, or the Ad Placement API sign-up). Approval is per site.
3. Your **client ID** is `ca-pub-` followed by your publisher number.
4. **Privacy & messaging:** enable Google's consent message for the site.

## 3. Put your IDs into the game (one command)

```bash
npm run ads:setup -- --admob-app ca-app-pub-1234567890123456~1111111111 --rewarded ca-app-pub-1234567890123456/2222222222 --adsense ca-pub-1234567890123456
```

This writes:
* `www/js/ad-config.js`: the rewarded unit and AdSense client
* `android/gradle.properties`: `ADMOB_APP_ID`, which is injected into the Android manifest
* `www/ads.txt` and `www/app-ads.txt`: seller verification files (see step 5)

It rejects mistyped IDs and Google's test IDs. To see what's configured:

```bash
npm run ads:check
```

Once AdSense approves the web game for H5 ads, switch the web build from test ads to live ads:

```bash
npm run ads:setup -- --web-live
```

## 4. Build and publish the Android app

```bash
npx cap sync android
```

```bash
cd android && ./gradlew bundleRelease
```

* **Safety net:** a release build **refuses to compile** while test IDs are still configured, so you can never ship an app that shows ads but earns nothing. For internal QA builds with test ads, add `-PallowTestAds=true`.
* Sign the bundle with your upload key and upload it to Play Console.
* Play Console → **App content → Ads:** answer "Yes, contains ads".
* **Data safety:** declare *Device or other IDs (advertising ID)* collected for *Advertising* and *Analytics*, and *App interactions* for *Analytics*. These are anonymous and nothing is sold.
* **Target audience:** 18+.
* While testing on your own phone before launch, add it as a **test device** in AdMob (Settings → Test devices). **Never tap real ads on your own phone**: AdMob treats it as invalid traffic and can suspend the account.

## 5. Publish app-ads.txt (required to get paid in full)

AdMob checks `https://<your-developer-website>/app-ads.txt`. The game's `www/` folder is your website on Vercel, so after `ads:setup`:

1. Deploy (push to `main`), then confirm `https://<your-site>/app-ads.txt` shows your `google.com, pub-…` line.
2. In Play Console → **Store settings → Store listing contact details**, set **Website** to that same site.
3. AdMob → Apps → *Masala Yatra* → **app-ads.txt** tab. Verification takes up to 24 hours.

## 6. Earn more: mediation (after launch)

Once you have steady traffic (about 1,000+ daily players), let several ad networks compete for each view through **AdMob mediation**. This typically lifts rewarded revenue by 20–40%.

1. AdMob → **Mediation → Create mediation group** (format: Rewarded, platform: Android) and attach `rewarded_main`.
2. Add **bidding** networks that pay well in India: AppLovin, Meta Audience Network, InMobi, Unity Ads, Mintegral, Liftoff.
3. For each network, create an account and add its adapter to `android/app/build.gradle` (for example `implementation 'com.google.ads.mediation:inmobi:<latest>'`). Take the current version from Google's *Mediation → Integrate partner networks* docs, then rebuild.

No game code changes are needed; mediation happens inside the AdMob SDK.

## 7. Track revenue

* **AdMob → Reports:** revenue, eCPM, fill rate and impressions per ad unit.
* **Link AdMob to Firebase** (AdMob → Settings → Linked services) to see ad revenue next to the game's own analytics. The game already logs `ad_offer`, `ad_start`, `ad_reward`, `ad_skip`, `ad_fail`, `ad_load_fail` and `ads_ready` (provider and test mode), plus each placement.
* Watch three numbers each week:
  * **Offer → watch rate.** Above 30% means the reward feels worth it.
  * **Rewarded views per daily player.** The target is 1.5–2.5.
  * **eCPM.** Expect roughly $1.5–4 for rewarded ads in India.

## 8. Rules that keep your account safe

* Never click your own ads, and never ask players to click.
* Rewards are only granted after the ad completes. The code already does this: an ad closed early gives nothing, and the player is told honestly.
* Don't add rewards for watching ads repeatedly beyond the caps; the daily caps are already in place.
* Keep the consent form enabled for EEA/UK/US visitors.
* Optional anti-fraud: enable **server-side verification (SSV)** on the rewarded ad unit. The game already passes an anonymous user ID with each ad request.

## How the code is organised

* `www/js/ad-config.js`: the only file with IDs. When it's empty, the game uses test ads automatically.
* `www/js/ads.js`:
  * `AdMobProvider`: consent → initialise → preload rewarded ad → show → preload the next one, with exponential back-off when no ad is available.
  * `H5GamesProvider`: loads `adsbygoogle.js` and uses `adBreak({type:'reward'})` for the web.
  * `MockProvider`: a clearly labelled test ad for local development.
  * The `Ads` facade handles placements, daily caps and analytics, and pauses game audio during ads.
* `android/app/build.gradle`: injects `ADMOB_APP_ID` into the manifest and holds the release guard.
* `tools/setup-ads.mjs`: the setup and validation command.
