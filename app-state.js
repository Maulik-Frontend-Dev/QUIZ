import {
  clearAchievements,
  clearLeaderboard,
  clearQuizHistory,
  getAchievements,
  getLeaderboard,
  getLastResult,
  getQuizHistory,
  getQuizSettings,
  readStorage,
  resetAllQuizData,
  saveAchievements,
  saveQuizSettings,
  sortLeaderboard,
  writeStorage,
} from "./quiz-storage.js";

const APP_EXPORT_VERSION = 1;
const DEFAULT_SETTINGS = {
  playerName: "Player",
  difficulty: "novice",
  soundEnabled: true,
  musicEnabled: true,
  theme: "light",
};

export function getAppSettings() {
  return { ...DEFAULT_SETTINGS, ...getQuizSettings() };
}

export function updateAppSettings(partialSettings) {
  const nextSettings = { ...getAppSettings(), ...partialSettings };
  saveQuizSettings(nextSettings);
  return nextSettings;
}

export function renamePlayerProfile(nextName) {
  const trimmedName = nextName.trim() || "Player";
  const currentName = getGlobalAnalytics().playerName;
  const leaderboard = getLeaderboard().map((entry) =>
    entry.name === currentName ? { ...entry, name: trimmedName } : entry,
  );
  const history = getQuizHistory().map((entry) =>
    entry.name === currentName ? { ...entry, name: trimmedName } : entry,
  );
  const lastResult = getLastResult();

  writeStorage("quizEdLeaderboard", leaderboard);
  writeStorage("quizEdHistory", history);
  writeStorage(
    "quizEdLastResult",
    lastResult?.name === currentName ? { ...lastResult, name: trimmedName } : lastResult,
  );
  updateAppSettings({ playerName: trimmedName });
}

export function getGlobalAnalytics() {
  const settings = getAppSettings();
  const history = getQuizHistory();
  const leaderboard = sortLeaderboard(getLeaderboard());
  const achievements = getAchievements();
  const lastResult = getLastResult();
  const playerName = settings.playerName || lastResult?.name || "Player";
  const playerHistory = history.filter((entry) => entry.name === playerName);
  const playerLeaderboardEntries = leaderboard.filter((entry) => entry.name === playerName);
  const totalQuizzes = playerHistory.length;
  const totalQuestions = playerHistory.reduce((sum, entry) => sum + (entry.totalQuestions ?? 0), 0);
  const totalCorrect = playerHistory.reduce((sum, entry) => sum + (entry.correctAnswers ?? 0), 0);
  const totalWrong = playerHistory.reduce((sum, entry) => sum + (entry.wrongAnswers ?? 0), 0);
  const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const highestScore = playerHistory.reduce((best, entry) => Math.max(best, entry.score ?? 0), 0);
  const averageScore = totalQuizzes
    ? Number((playerHistory.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / totalQuizzes).toFixed(1))
    : 0;
  const bestStreak = playerHistory.reduce((best, entry) => Math.max(best, entry.bestStreak ?? 0), 0);
  const totalDurationSeconds = playerHistory.reduce((sum, entry) => sum + toDurationSeconds(entry.duration), 0);
  const averageCompletionSeconds = totalQuizzes ? Math.round(totalDurationSeconds / totalQuizzes) : 0;
  const fastestAnswerSeconds = getFastestAnswerTime(playerHistory);
  const averageAnswerSeconds = totalQuestions ? Number((totalDurationSeconds / totalQuestions).toFixed(1)) : 0;
  const difficultyCounts = countBy(playerHistory, (entry) => entry.difficulty || "novice");
  const mostUsedDifficulty = getTopKey(difficultyCounts, settings.difficulty);
  const bestDifficultyPerformance = getBestDifficultyPerformance(playerHistory);
  const leaderboardRank = getCurrentLeaderboardRank(leaderboard, playerName);
  const lastPlayedAt = playerHistory[0]?.completedAt ?? null;
  const unlockedBadges = Object.values(achievements.badges ?? {}).filter((badge) => badge?.unlocked).length;

  return {
    settings,
    playerName,
    history,
    playerHistory,
    leaderboard,
    playerLeaderboardEntries,
    totalQuizzes,
    totalQuestions,
    totalCorrect,
    totalWrong,
    accuracy,
    highestScore,
    averageScore,
    bestStreak,
    totalDurationSeconds,
    averageCompletionSeconds,
    fastestAnswerSeconds,
    averageAnswerSeconds,
    difficultyCounts,
    mostUsedDifficulty,
    bestDifficultyPerformance,
    leaderboardRank,
    lastPlayedAt,
    lastResult,
    unlockedBadges,
  };
}

export function exportAppData() {
  return {
    version: APP_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: getQuizSettings(),
    leaderboard: getLeaderboard(),
    history: getQuizHistory(),
    achievements: getAchievements(),
    lastResult: getLastResult(),
  };
}

export function importAppData(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid import data.");
  }

  writeStorage("quizEdSettings", payload.settings ?? DEFAULT_SETTINGS);
  writeStorage("quizEdLeaderboard", Array.isArray(payload.leaderboard) ? payload.leaderboard : []);
  writeStorage("quizEdHistory", Array.isArray(payload.history) ? payload.history : []);
  writeStorage("quizEdAchievements", payload.achievements ?? {});
  writeStorage("quizEdLastResult", payload.lastResult ?? null);
}

export function resetQuizProgress() {
  resetAllQuizData();
}

export function resetOnlyLeaderboard() {
  clearLeaderboard();
}

export function resetOnlyBadges() {
  clearAchievements();
  saveAchievements({
    badges: {},
    latestUnlockId: null,
    updatedAt: new Date().toISOString(),
    resetAt: new Date().toISOString(),
  });
}

export function clearOnlyHistory() {
  clearQuizHistory();
}

export function formatDateTime(value) {
  if (!value) {
    return "Never played";
  }

  return new Date(value).toLocaleString();
}

export function formatSecondsToClock(totalSeconds) {
  const safeSeconds = Math.max(totalSeconds || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDifficultyLabel(difficulty) {
  if (difficulty === "expert") return "Expert";
  if (difficulty === "genius") return "Genius";
  return "Novice";
}

function toDurationSeconds(duration) {
  if (!duration || typeof duration !== "string" || !duration.includes(":")) {
    return 0;
  }

  const [minutes, seconds] = duration.split(":").map(Number);
  return (minutes || 0) * 60 + (seconds || 0);
}

function getFastestAnswerTime(history) {
  const answerTimes = history
    .map((entry) => {
      const totalQuestions = Math.max(entry.totalQuestions ?? 0, 1);
      const durationSeconds = toDurationSeconds(entry.duration);
      return durationSeconds > 0 ? durationSeconds / totalQuestions : null;
    })
    .filter((value) => value !== null);

  return answerTimes.length ? Number(Math.min(...answerTimes).toFixed(1)) : 0;
}

function countBy(items, keyGetter) {
  return items.reduce((accumulator, item) => {
    const key = keyGetter(item);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function getTopKey(counts, fallback) {
  const entries = Object.entries(counts);
  if (!entries.length) {
    return fallback;
  }

  return entries.sort((left, right) => right[1] - left[1])[0][0];
}

function getBestDifficultyPerformance(history) {
  if (!history.length) {
    return { difficulty: "novice", accuracy: 0 };
  }

  const grouped = ["novice", "expert", "genius"]
    .map((difficulty) => {
      const matches = history.filter((entry) => entry.difficulty === difficulty);
      const total = matches.reduce((sum, entry) => sum + (entry.totalQuestions ?? 0), 0);
      const correct = matches.reduce((sum, entry) => sum + (entry.correctAnswers ?? 0), 0);
      const accuracy = total ? Math.round((correct / total) * 100) : 0;
      return { difficulty, accuracy, plays: matches.length };
    })
    .filter((item) => item.plays > 0);

  return grouped.sort((left, right) => right.accuracy - left.accuracy)[0] ?? { difficulty: "novice", accuracy: 0 };
}

function getCurrentLeaderboardRank(leaderboard, playerName) {
  const rank = leaderboard.findIndex((entry) => entry.name === playerName);
  return rank >= 0 ? rank + 1 : 0;
}
