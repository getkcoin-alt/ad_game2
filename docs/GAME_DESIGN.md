# Masala Yatra — Game Design & Product Document

> A cosy cooking match-3 journey across India. Cook real dishes for people you care about,
> travel city to city, and collect **real family recipes** you can actually cook tonight.

## 1. Who it's for

**Primary audience:** Indian women 18+, homemakers and working women, mostly on budget-to-mid
Android phones (2–4 GB RAM, Android 9–14, patchy 4G). Play happens in short gaps: after the
kids leave for school, the commute, a lunch break, the half hour after dinner.

**What they told us they value** (from genre research and comparable-title reviews; validate in user research):

| Need | What it means for design |
|---|---|
| Relaxing, not stressful | No timers, no lives, retry is always free |
| Respect for my time | Levels last 2–4 minutes, with a natural stopping point after each |
| Familiar and warm | Indian kitchens, dishes, names, Hindi as a first-class language |
| "Am I getting something real?" | Real recipes unlocked, so time spent pays back in real life |
| Not cheated by ads | Ads only when *I* choose, for something worth it |

## 2. What's new about it (beyond a match-3 clone)

1. **Orders instead of abstract goals.** Every level is a meal. Guests ("For Meena aunty — Pav Bhaji") order dishes, and the ingredients you match fly into their plates. Goals carry meaning, so finishing them feels warm.
2. **The Tadka pan, a reward for skill.** Cascades and specials heat a kadhai. When it sizzles, tap it to clear the ingredients your guests still need. It turns good play into agency and is never sold.
3. **Indian-kitchen specials with distinct silhouettes.** Belan (rolling pin, clears a line), Pressure Cooker (L/T shape, *seeti!* blast), and Masala Dabba (5 in a row, clears one ingredient everywhere). Swapping two specials together makes a combo.
4. **Real-world payoff.** Each city ends in a *signature dish* level that unlocks a tested recipe card with Dadi's tip, which can be shared to WhatsApp. That's a reason to return, and it markets the game organically.
5. **No lives, no energy, no timers.** Retrying is free and unlimited, and we say so. This was the most deliberate decision in the design.
6. **A wellbeing feature, not a retention trick.** After 30 minutes of active play, a gentle *Chai break?* card appears between levels (never mid-level). The player can turn it off.
7. **Readable for everyone.** The six ingredients have distinct silhouettes (chilli, lemon, leaf, onion bulb, garlic bulb, kulhad cup), so the board works for colour-blind players. There's a reduce-motion option, and the game is fully bilingual (English and हिंदी).

## 3. Core loop

```
 ┌──────────── Session (5–20 min) ────────────┐
 │ Home → Play next level → Pre-level (orders)  │
 │   → Match / cascade / specials / tadka       │
 │   → Win: stars + coins (+ optional 2× ad)    │
 │   → Next level  ─┐                           │
 │   → Fail: free retry │ optional +5 moves     │
 └──────────────────┘                          │
 Meta: stars → city progress → signature dish → RECIPE unlocked → new city (new palette, dishes)
 Daily: Dadi's gift (coins) · Daily Thali puzzle (streak with a forgiving miss)
```

**Moment to moment:** swipe and see instant feedback (tile pop, spice particles, a santoor pluck rising up the Bhupali scale as cascades grow). The ingredient flies to the order card and the counter bumps. Callouts like *Wah! → Shabaash! → Kamaal! → Zabardast!* mark bigger cascades.

**Mechanic drip (curiosity):** something new every few levels: L1 basics · L3 Belan · L4 Tadka · L5 Pressure Cooker · L7 Atta (dough) · L10 Masala Dabba · L11 special+special combos · L13 Steel jaali (locks) · L17 sixth ingredient (Kulhad Chai). Board shapes (thali, temple, heart, kite, rangoli) vary from L6.

## 4. Progression & difficulty

* **10 cities × 6 levels = 60 levels:** Mumbai → Ahmedabad → Jaipur → Delhi → Amritsar → Kolkata → Hyderabad → Chennai → Goa → Kerala.
* **Sawtooth difficulty:** each city ramps toward its signature-dish level (hardest). Level 4 of every city is a deliberate *breather*.
* **Data-driven balancing:** `tools/balance.mjs` runs a greedy bot 60× per level with unlimited moves and records how many moves it needed. The move budget is set to the quantile matching a target win rate: ~99% early, falling to ~65–75% on late signature levels, plus a cushion for human imprecision early on. Star thresholds (2★ / 3★ moves left) come from the same distribution. Re-run it after any generator change.
* **Fairness:** new tiles spawn uniformly at random, the same for every player. There is no hidden difficulty adjustment and no "near-miss" manipulation tied to monetisation.

## 5. Psychology: engagement vs. compulsion

Conceptual references: Jamie Madigan's *Getting Gamers: The Psychology of Video Games and Why People Play Them*, and Neils Clark & Shavaun Scott's *Game Addiction: The Experience and the Effects*. We use the first for *why play feels good* (self-determination theory, flow, goal gradients, curiosity) and the second as a guard-rail for *where engagement turns into harm* (time displacement, escapism loops, variable-ratio reward exploitation, sunk-cost pressure).

### Principles we lean into (healthy engagement)

| Principle | Implementation |
|---|---|
| **Competence** (SDT) | Clear, concrete goals; juicy feedback; specials and combos to master; transparent star rule ("finish with 6+ moves left") |
| **Autonomy** (SDT) | Free unlimited retries; ads are always optional; language choice; every reminder can be switched off |
| **Relatedness** (SDT) | Dadi as a warm guide; named guests; recipes meant to be cooked and shared with family |
| **Flow** | Short levels; tuned win rates; breather levels after spikes; idle hints after 7 s (2.5 s while learning) |
| **Curiosity** | Mechanic drip; locked cities show a teaser ("Next stop: Kolkata · Signature dish: Mishti Doi"); new palette per city |
| **Goal gradient** | Order counters, "85% cooked — so close!", city star totals |
| **Meaningful rewards** | Recipes have real value outside the game; coins buy boosters at transparent prices |

### Patterns we deliberately do **not** use

| Dark pattern | Our stance |
|---|---|
| Energy / lives / wait timers | **None.** Play as much or as little as you like |
| Interstitial or banner ads | **None.** Rewarded video only, chosen by the player |
| Loot boxes, spin wheels, gacha | **None.** Randomness lives only in gameplay (cascades), never in rewards you pay or watch ads for |
| Loss-framed streaks and FOMO | The Daily Thali streak forgives one missed day per week; no limited-time pressure events |
| Pay-to-win walls | Every level is beatable without boosters; the bot balances levels with no boosters at all |
| Fake close buttons, confirmshaming | The mock and real ad flows always offer an honest "close without reward"; no guilt copy |
| Rigged near-misses to sell continues | Spawns are uniform; a continue is offered once per attempt, plus at most 2 coin continues |
| Notification spam | No push notifications in the MVP |
| Endless sessions | Natural stop after every level, plus the optional chai-break reminder after 30 min |

## 6. Monetisation (ad-supported, ethical)

**Model:** free-to-play, funded by **opt-in rewarded video** (AdMob). No interstitials, no banners.

| Placement | Reward | Rules |
|---|---|---|
| Out of moves | +5 moves | 1 per attempt · from level 4 · 8/day |
| Level won | 2× coins | from level 3 · 8/day |
| Kitchen shelf | 1 free booster | from level 5 · 3/day |
| Dadi's daily gift | +1 Chamach | from level 5 · 1/day |

Global cap: 20 rewarded views per day. Every ad button is labelled ("▶ Watch ad · +5 moves") and the reward is granted only when the ad completes. If no ad is available, the player sees an honest message, and a free retry is always on screen. Coins earned in play are an equal alternative for continues and boosters.

### Unit economics (planning assumptions — validate with a soft launch)

| Input | Conservative | Base | Upside |
|---|---|---|---|
| Rewarded eCPM (India, USD) | $1.5 | $2.5 | $4.0 |
| Rewarded views / DAU | 1.0 | 1.6 | 2.4 |
| **ARPDAU** | $0.0015 | $0.0040 | $0.0096 |
| D1 / D7 / D30 retention | 35/12/4% | 42/16/7% | 50/22/10% |
| Active days per install (180 d) | ~8 | ~14 | ~24 |
| **LTV₁₈₀ per install** | $0.012 | $0.056 | $0.23 |

**What this means:** with rewarded ads alone, paid UA in India only works at very low CPIs (≤ $0.05). The sustainable path is:
1. **Organic and viral first.** WhatsApp recipe sharing, festival content, ASO in Hindi and English.
2. **Raise retention**, the biggest lever: more cities, weekly content, events with no FOMO pressure.
3. **Add an optional IAP later:** a one-time "Ad-free + coin pack" via Play Billing / UPI (₹49–₹99), plus cosmetic kitchen themes. This complements ads without breaking the ethics above.
4. **Mediation** (AdMob plus 2–3 networks) to lift rewarded eCPM by 20–40%.

## 7. Analytics

Events are implemented in `www/js/analytics.js`. They go to a local queue, and to Firebase/GA4 when `@capacitor-firebase/analytics` is installed. Consent is collected on first run and can be toggled in Settings.

| Funnel / KPI | Events |
|---|---|
| Activation | `app_open`, `privacy_accepted`, `tutorial_step`, first `level_win` |
| Level funnel & difficulty | `level_start`, `level_win` (moves_left, stars, attempt, continues, duration), `level_fail` (progress), `level_quit` |
| Monetisation | `ad_offer`, `ad_start`, `ad_reward`, `ad_skip`, `ad_fail`, `continue_offer`, `continue_accept` (method) |
| Economy | `booster_use`, `booster_get` (source), `gift_claim`, `daily_win` (streak) |
| Delight & virality | `tadka_use`, `recipe_unlock`, `recipe_share` |
| Wellbeing | `break_prompt`, `break_taken`, `setting_change` |
| Retention | `app_open.day_index`, `session_end.duration_s` |

**Health dashboard:** win rate and churn per level (spot difficulty spikes) · ad-offer acceptance rate (a value-for-reward signal) · ad views/DAU · ARPDAU · D1/D7/D30 · % of sessions that hit the chai break (watch for over-play).

## 8. Technology & architecture

* **Stack:** vanilla ES modules + Canvas 2D, wrapped with **Capacitor 6** for Android. There's no framework and no build step. The app is ~200 KB of unminified JS/CSS plus 260 KB of bundled fonts, with no image assets: all art and audio are generated procedurally.
* **Performance on budget devices:** sprites are pre-rendered once per size into offscreen canvases, DPR is capped at 2, and the render loop runs only while something animates (idle = 0 % CPU). Audio is synthesised with WebAudio. A `roundRect` polyfill and CSS fallbacks support older System WebViews.

```
www/
  js/engine/     board.js (pure match-3 engine) · levels.js (seeded generator) · tuning.js (bot-calibrated) · content.js (cities, dishes, recipes) · rng.js
  js/game/       session.js (one play-through: orders, moves, tadka, stars) · controller.js (in-level UI)
  js/render/     art.js (procedural ingredient art) · view.js (animations, particles, input)
  js/            main.js (meta screens) · ui.js · audio.js · ads.js · analytics.js · storage.js · i18n.js
tools/           balance.mjs (difficulty bot) · serve.mjs · make-icons.cjs
tests/           engine.test.mjs (unit + fuzz) · e2e/smoke.mjs (Playwright, phone viewport)
android/         Capacitor Android project (AdMob, Haptics, App/back-button, Splash)
```

* **The engine is pure and deterministic.** `Board` returns animation "phases" (swap, clear, fall, shuffle), and the renderer replays them. This makes the engine unit-testable, fuzzable across every level, and usable by the balancing bot.

## 9. Roadmap

1. **Soft launch** (India, Play internal → open testing): validate D1 and level-funnel spikes; tune the `targetWinRate` curve.
2. **Content:** festival kitchens (Diwali sweets, Onam sadya, Eid sevaiyan) as relaxed events with no timers; 10 more cities.
3. **Meta:** a "Meri Rasoi" decoratable kitchen, bought with stars (not money).
4. **Cloud save** (Play Games Services), more regional languages (Marathi, Tamil, Bengali, Telugu).
5. **Optional IAP** (ad-free + coin pack), plus ad mediation.
