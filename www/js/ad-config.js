// ─────────────────────────────────────────────────────────────────────────────
// Ad configuration — the ONLY place ad IDs live in the web/app code.
// Fill it with `npm run ads:setup -- --help` (see docs/MONETIZATION.md) rather than by hand.
//
// While IDs are empty, the game automatically uses Google's public TEST ads
// (Android) or a clearly-labelled mock ad (web), which earn nothing.
// ─────────────────────────────────────────────────────────────────────────────

export const AD_CONFIG = {
  // Your AdMob / AdSense publisher id, e.g. "pub-1234567890123456" (used for ads.txt / app-ads.txt).
  publisherId: '',

  admob: {
    // Rewarded ad unit for Android, e.g. "ca-app-pub-1234567890123456/1234567890".
    // (The AdMob *app* id goes in android/gradle.properties → ADMOB_APP_ID.)
    rewardedAndroid: '',
    // Rewarded ad unit for iOS (for when the iOS build is added).
    rewardedIos: '',
    // Force test ads even if real ids are set (use for QA builds).
    forceTest: false,
  },

  adsense: {
    // AdSense client for the web build (H5 Games Ads / Ad Placement API), e.g. "ca-pub-1234567890123456".
    client: '',
    // Shows Google test ads on the web while true — set false once AdSense approves the site for H5 games.
    testMode: true,
  },
};

// Google's public test unit ids — safe to use during development, never earn money.
export const TEST_IDS = {
  rewardedAndroid: 'ca-app-pub-3940256099942544/5224354917',
  rewardedIos: 'ca-app-pub-3940256099942544/1712485313',
};
