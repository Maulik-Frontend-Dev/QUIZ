import { getAchievements, saveAchievements } from "./quiz-storage.js";
import { getGlobalAnalytics } from "./app-state.js";

const BADGE_DEFINITIONS = [
  {
    id: "first_quiz",
    name: "First Quiz Completed",
    category: "novice",
    icon: "emoji_events",
    description: "Finish your first quiz session.",
    requirement: "1/1 quizzes completed",
    rarity: "Bronze",
    progressLabel: (stats) => `${Math.min(stats.totalQuizzes, 1)}/1 quizzes completed`,
    progressValue: (stats) => toPercent(stats.totalQuizzes, 1),
    unlocked: (stats) => stats.totalQuizzes >= 1,
  },
  {
    id: "perfect_score",
    name: "Perfect Score",
    category: "genius",
    icon: "workspace_premium",
    description: "Score 100% in a single quiz.",
    requirement: "1/1 perfect quiz",
    rarity: "Gold",
    progressLabel: (stats) => `${stats.perfectQuizzes > 0 ? 1 : 0}/1 perfect quiz`,
    progressValue: (stats) => toPercent(stats.perfectQuizzes, 1),
    unlocked: (stats) => stats.perfectQuizzes >= 1,
  },
  {
    id: "streak_five",
    name: "5 Correct Answers in a Row",
    category: "novice",
    icon: "local_fire_department",
    description: "Build a streak of 5 correct answers in one quiz.",
    requirement: "5/5 correct streak",
    rarity: "Bronze",
    progressLabel: (stats) => `${Math.min(stats.bestStreak, 5)}/5 correct streak`,
    progressValue: (stats) => toPercent(stats.bestStreak, 5),
    unlocked: (stats) => stats.bestStreak >= 5,
  },
  {
    id: "streak_ten",
    name: "10 Correct Answers in a Row",
    category: "expert",
    icon: "whatshot",
    description: "Answer all 10 questions correctly in a row.",
    requirement: "10/10 correct streak",
    rarity: "Silver",
    progressLabel: (stats) => `${Math.min(stats.bestStreak, 10)}/10 correct streak`,
    progressValue: (stats) => toPercent(stats.bestStreak, 10),
    unlocked: (stats) => stats.bestStreak >= 10,
  },
  {
    id: "under_time_limit",
    name: "Finish Quiz Under Time Limit",
    category: "expert",
    icon: "timer",
    description: "Finish a full quiz in under 60% of the allowed round time.",
    requirement: "1 fast quiz finish",
    rarity: "Silver",
    progressLabel: (stats) => `${stats.fastFinishes > 0 ? 1 : 0}/1 fast quiz finish`,
    progressValue: (stats) => toPercent(stats.fastFinishes, 1),
    unlocked: (stats) => stats.fastFinishes >= 1,
  },
  {
    id: "novice_master",
    name: "Novice Master",
    category: "novice",
    icon: "school",
    description: "Earn a perfect score on Novice difficulty.",
    requirement: "1/1 novice perfect",
    rarity: "Bronze",
    progressLabel: (stats) => `${stats.novicePerfects > 0 ? 1 : 0}/1 novice perfect`,
    progressValue: (stats) => toPercent(stats.novicePerfects, 1),
    unlocked: (stats) => stats.novicePerfects >= 1,
  },
  {
    id: "expert_master",
    name: "Expert Master",
    category: "expert",
    icon: "military_tech",
    description: "Earn a perfect score on Expert difficulty.",
    requirement: "1/1 expert perfect",
    rarity: "Silver",
    progressLabel: (stats) => `${stats.expertPerfects > 0 ? 1 : 0}/1 expert perfect`,
    progressValue: (stats) => toPercent(stats.expertPerfects, 1),
    unlocked: (stats) => stats.expertPerfects >= 1,
  },
  {
    id: "genius_master",
    name: "Genius Master",
    category: "genius",
    icon: "diamond",
    description: "Earn a perfect score on Genius difficulty.",
    requirement: "1/1 genius perfect",
    rarity: "Gold",
    progressLabel: (stats) => `${stats.geniusPerfects > 0 ? 1 : 0}/1 genius perfect`,
    progressValue: (stats) => toPercent(stats.geniusPerfects, 1),
    unlocked: (stats) => stats.geniusPerfects >= 1,
  },
  {
    id: "top_rank",
    name: "Top Leaderboard Rank",
    category: "genius",
    icon: "trophy",
    description: "Hold the number 1 position on the leaderboard.",
    requirement: "Reach rank #1",
    rarity: "Gold",
    progressLabel: (stats) => stats.bestRank ? `Best rank: #${stats.bestRank}` : "Best rank: --",
    progressValue: (stats) => stats.bestRank ? toPercent(1 / stats.bestRank, 1) : 0,
    unlocked: (stats) => stats.bestRank === 1,
  },
  {
    id: "top_three",
    name: "Top 3 Score",
    category: "expert",
    icon: "leaderboard",
    description: "Reach a top 3 leaderboard position.",
    requirement: "Reach rank #3 or better",
    rarity: "Silver",
    progressLabel: (stats) => stats.bestRank ? `Best rank: #${stats.bestRank}` : "Best rank: --",
    progressValue: (stats) => stats.bestRank ? toPercent(Math.max(4 - stats.bestRank, 0), 3) : 0,
    unlocked: (stats) => stats.bestRank > 0 && stats.bestRank <= 3,
  },
  {
    id: "play_five",
    name: "Play 5 Quizzes",
    category: "novice",
    icon: "sports_esports",
    description: "Complete 5 quiz sessions.",
    requirement: "5/5 quizzes completed",
    rarity: "Bronze",
    progressLabel: (stats) => `${Math.min(stats.totalQuizzes, 5)}/5 quizzes completed`,
    progressValue: (stats) => toPercent(stats.totalQuizzes, 5),
    unlocked: (stats) => stats.totalQuizzes >= 5,
  },
  {
    id: "play_twenty_five",
    name: "Play 25 Quizzes",
    category: "expert",
    icon: "stadia_controller",
    description: "Complete 25 quiz sessions.",
    requirement: "25/25 quizzes completed",
    rarity: "Silver",
    progressLabel: (stats) => `${Math.min(stats.totalQuizzes, 25)}/25 quizzes completed`,
    progressValue: (stats) => toPercent(stats.totalQuizzes, 25),
    unlocked: (stats) => stats.totalQuizzes >= 25,
  },
  {
    id: "high_accuracy",
    name: "High Accuracy Player",
    category: "genius",
    icon: "gps_fixed",
    description: "Maintain at least 80% average accuracy across 5 or more quizzes.",
    requirement: "80% average accuracy over 5 quizzes",
    rarity: "Gold",
    progressLabel: (stats) => `${stats.averageAccuracy}% avg over ${Math.min(stats.totalQuizzes, 5)}/5 quizzes`,
    progressValue: (stats) => stats.totalQuizzes < 5 ? toPercent(stats.totalQuizzes, 5) : toPercent(stats.averageAccuracy, 80),
    unlocked: (stats) => stats.totalQuizzes >= 5 && stats.averageAccuracy >= 80,
  },
  {
    id: "fast_answering",
    name: "Fast Answering Player",
    category: "expert",
    icon: "bolt",
    description: "Average 8 seconds or less per answer across 5 or more quizzes.",
    requirement: "8s average answer time over 5 quizzes",
    rarity: "Silver",
    progressLabel: (stats) => `${stats.averageAnswerSeconds}s avg over ${Math.min(stats.totalQuizzes, 5)}/5 quizzes`,
    progressValue: (stats) => stats.totalQuizzes < 5 ? toPercent(stats.totalQuizzes, 5) : toPercent(Math.max(8 - Math.min(stats.averageAnswerSeconds, 8), 0), 8),
    unlocked: (stats) => stats.totalQuizzes >= 5 && stats.averageAnswerSeconds <= 8,
  },
  {
    id: "consistent_high_scorer",
    name: "Consistent High Scorer",
    category: "genius",
    icon: "trending_up",
    description: "Finish 3 quizzes with 80% or higher accuracy.",
    requirement: "3/3 high-score quizzes",
    rarity: "Gold",
    progressLabel: (stats) => `${Math.min(stats.highScoreQuizzes, 3)}/3 high-score quizzes`,
    progressValue: (stats) => toPercent(stats.highScoreQuizzes, 3),
    unlocked: (stats) => stats.highScoreQuizzes >= 3,
  },
];

export function getBadgeDefinitions() {
  return BADGE_DEFINITIONS;
}

export function getBadgeState() {
  const storedState = getAchievements();
  return storedState.badges && typeof storedState.badges === "object"
    ? storedState
    : { badges: {}, latestUnlockId: null, updatedAt: null, resetAt: null };
}

export function buildPerformanceStats() {
  const analytics = getGlobalAnalytics();
  const state = getBadgeState();
  const playerResults = state.resetAt
    ? analytics.playerHistory.filter((result) => (result.completedAt ?? 0) >= new Date(state.resetAt).getTime())
    : analytics.playerHistory;

  return {
    results: analytics.leaderboard,
    playerName: analytics.playerName,
    playerResults,
    totalQuizzes: analytics.totalQuizzes,
    totalCorrectAnswers: analytics.totalCorrect,
    perfectQuizzes: playerResults.filter((result) => result.percentage === 100).length,
    bestStreak: analytics.bestStreak,
    averageAccuracy: analytics.accuracy,
    averageAnswerSeconds: analytics.averageAnswerSeconds,
    novicePerfects: playerResults.filter((result) => result.difficulty === "novice" && result.percentage === 100).length,
    expertPerfects: playerResults.filter((result) => result.difficulty === "expert" && result.percentage === 100).length,
    geniusPerfects: playerResults.filter((result) => result.difficulty === "genius" && result.percentage === 100).length,
    fastFinishes: playerResults.filter((result) => isFastFinish(result)).length,
    highScoreQuizzes: playerResults.filter((result) => (result.percentage ?? 0) >= 80).length,
    bestRank: state.resetAt
      ? getRankAfterReset(analytics.leaderboard, analytics.playerName, new Date(state.resetAt).getTime())
      : analytics.leaderboardRank,
  };
}

export function syncBadgeProgress() {
  const stats = buildPerformanceStats();
  const state = getBadgeState();
  const nextBadges = { ...state.badges };
  let latestUnlockId = state.latestUnlockId ?? null;

  // Evaluate each badge against aggregate quiz history and unlock it once.
  BADGE_DEFINITIONS.forEach((badge) => {
    const existing = nextBadges[badge.id] ?? {};
    const unlockedAlready = Boolean(existing.unlocked);
    const shouldUnlock = badge.unlocked(stats);

    nextBadges[badge.id] = {
      unlocked: unlockedAlready || shouldUnlock,
      unlockedAt: unlockedAlready ? existing.unlockedAt : shouldUnlock ? new Date().toISOString() : null,
      progress: badge.progressValue(stats),
      progressLabel: badge.progressLabel(stats),
    };

    if (!unlockedAlready && shouldUnlock) {
      latestUnlockId = badge.id;
    }
  });

  const nextState = {
    badges: nextBadges,
    latestUnlockId,
    updatedAt: new Date().toISOString(),
    resetAt: state.resetAt ?? null,
  };

  saveAchievements(nextState);
  return buildRenderableBadges(nextState, stats);
}

export function getRenderableBadges() {
  return buildRenderableBadges(getBadgeState(), buildPerformanceStats());
}

function buildRenderableBadges(state, stats) {
  const badges = BADGE_DEFINITIONS.map((badge) => {
    const storedBadge = state.badges?.[badge.id] ?? {};
    return {
      ...badge,
      unlocked: Boolean(storedBadge.unlocked),
      date: storedBadge.unlockedAt ? formatUnlockDate(storedBadge.unlockedAt) : "",
      progress: storedBadge.progress ?? badge.progressValue(stats),
      progressLabel: storedBadge.progressLabel ?? badge.progressLabel(stats),
      unlockedAt: storedBadge.unlockedAt ?? null,
    };
  });

  return {
    badges,
    stats,
    latestUnlock: badges.find((badge) => badge.id === state.latestUnlockId && badge.unlocked) ?? badges.find((badge) => badge.unlocked) ?? null,
  };
}

export function createResetBadgeState() {
  return {
    badges: {},
    latestUnlockId: null,
    updatedAt: new Date().toISOString(),
    resetAt: new Date().toISOString(),
  };
}

function formatUnlockDate(value) {
  return new Date(value).toLocaleString();
}

function toPercent(value, target) {
  return Math.max(0, Math.min(100, Math.round((Math.min(value, target) / target) * 100)));
}

function isFastFinish(result) {
  const durationSeconds = result.duration
    ? result.duration.split(":").map(Number).reduce((sum, part, index) => sum + part * (index === 0 ? 60 : 1), 0)
    : 0;
  const limitPerQuestion = result.difficulty === "expert" ? 30 : result.difficulty === "genius" ? 15 : 45;
  const totalRoundLimit = (result.totalQuestions ?? 10) * limitPerQuestion;
  // "Under time limit" is treated as finishing well ahead of the maximum round clock.
  return durationSeconds > 0 && durationSeconds <= totalRoundLimit * 0.6;
}

function getRankAfterReset(leaderboard, playerName, resetTimestamp) {
  const matchingRank = leaderboard.findIndex(
    (entry) => entry.name === playerName && (entry.completedAt ?? 0) >= resetTimestamp,
  );
  return matchingRank >= 0 ? matchingRank + 1 : 0;
}
