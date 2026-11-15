// Daily Rasoi Quests: three small goals a day with fixed, known rewards.
// Healthy-engagement rules: no timers counting down at the player, no penalty for skipping a day,
// goals achievable in one short session, and rewards are plain coins/boosters (no randomness).

import { mulberry32, hashString } from '../engine/rng.js';
import { INGREDIENTS } from '../engine/content.js';

export const QUEST_TYPES = [
  { id: 'win', en: 'Win {n} levels', hi: '{n} लेवल जीतें', targets: [2, 3], reward: 50 },
  { id: 'special', en: 'Make {n} specials (Belan, Cooker or Dabba)', hi: '{n} ख़ास चीज़ें बनाएं (बेलन, कुकर या डिब्बा)', targets: [4, 6], reward: 60 },
  { id: 'collect', en: 'Collect {n} {ing}', hi: '{n} {ing} इकट्ठा करें', targets: [40, 60], reward: 50 },
  { id: 'cascade', en: 'Get a ×{n} cascade', hi: '×{n} का सिलसिला बनाएं', targets: [3, 4], reward: 60, max: true },
  { id: 'tadka', en: 'Use the Tadka pan {n} times', hi: 'तड़का {n} बार लगाएं', targets: [1, 2], reward: 40 },
  { id: 'stars3', en: 'Earn 3 ★ on {n} level', hi: '{n} लेवल में 3 ★ पाएं', targets: [1], reward: 70 },
  { id: 'daily', en: 'Cook today’s Daily Thali', hi: 'आज की थाली बनाएं', targets: [1], reward: 60 },
];
export const ALL_DONE_BONUS = { coins: 50, booster: 'spoon' };

export function questsForDate(dateKey, unlockedLevel = 1) {
  const rng = mulberry32(hashString('quests-' + dateKey));
  let pool = QUEST_TYPES.filter((q) => !(q.id === 'tadka' && unlockedLevel < 5) && !(q.id === 'special' && unlockedLevel < 4));
  pool = rng.shuffle([...pool]);
  return pool.slice(0, 3).map((q) => {
    const target = q.targets[rng.int(q.targets.length)];
    const quest = { id: q.id, target, progress: 0, claimed: false, reward: q.reward };
    if (q.id === 'collect') quest.color = rng.int(5);
    return quest;
  });
}

export function questLabel(q, lang) {
  const def = QUEST_TYPES.find((d) => d.id === q.id);
  const ing = q.color != null ? (lang === 'hi' ? INGREDIENTS[q.color].hi : INGREDIENTS[q.color].en) : '';
  return (lang === 'hi' ? def.hi : def.en).replace('{n}', q.target).replace('{ing}', ing);
}

/** Make sure `save.quests` holds today's set (regenerated each new day). */
export function ensureQuests(save, dateKey) {
  if (!save.quests || save.quests.date !== dateKey) {
    save.quests = { date: dateKey, list: questsForDate(dateKey, save.unlocked), bonusClaimed: false };
  }
  return save.quests;
}

/** Record progress. Returns the quests that just became complete. */
export function questEvent(save, type, amount = 1, extra = {}) {
  if (!save.quests) return [];
  const done = [];
  for (const q of save.quests.list) {
    if (q.id !== type || q.progress >= q.target) continue;
    if (type === 'collect' && extra.color !== q.color) continue;
    const before = q.progress;
    q.progress = QUEST_TYPES.find((d) => d.id === type).max ? Math.max(q.progress, amount) : q.progress + amount;
    q.progress = Math.min(q.progress, q.target);
    if (before < q.target && q.progress >= q.target) done.push(q);
  }
  return done;
}

export function claimable(save) {
  return save.quests ? save.quests.list.filter((q) => q.progress >= q.target && !q.claimed).length : 0;
}
