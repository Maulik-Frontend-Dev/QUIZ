const LEADERBOARD_KEY = "quizEdLeaderboard";
const LAST_RESULT_KEY = "quizEdLastResult";
const QUIZ_SETTINGS_KEY = "quizEdSettings";
const ACHIEVEMENTS_KEY = "quizEdAchievements";
const QUIZ_HISTORY_KEY = "quizEdHistory";

function safeRead(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    console.warn(`Unable to read localStorage key: ${key}`, error);
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to write localStorage key: ${key}`, error);
  }
}

export function readStorage(key, fallback) {
  return safeRead(key, fallback);
}

export function writeStorage(key, value) {
  safeWrite(key, value);
}

export function getLeaderboard() {
  const entries = safeRead(LEADERBOARD_KEY, []);
  return Array.isArray(entries) ? entries : [];
}

export function getQuizHistory() {
  const entries = safeRead(QUIZ_HISTORY_KEY, []);
  return Array.isArray(entries) ? entries : [];
}

export function sortLeaderboard(entries) {
  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return (right.completedAt ?? 0) - (left.completedAt ?? 0);
  });
}

export function saveLeaderboardEntry(entry) {
  const sortedEntries = sortLeaderboard([...getLeaderboard(), entry]);
  const historyEntries = [...getQuizHistory(), entry].sort(
    (left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0),
  );
  safeWrite(LEADERBOARD_KEY, sortedEntries);
  safeWrite(QUIZ_HISTORY_KEY, historyEntries);
  safeWrite(LAST_RESULT_KEY, entry);
  return { leaderboard: sortedEntries, history: historyEntries };
}

export function getLastResult() {
  return safeRead(LAST_RESULT_KEY, null);
}

export function getQuizSettings() {
  return safeRead(QUIZ_SETTINGS_KEY, {});
}

export function saveQuizSettings(settings) {
  const existingSettings = getQuizSettings();
  safeWrite(QUIZ_SETTINGS_KEY, { ...existingSettings, ...settings });
}

export function getAchievements() {
  const achievements = safeRead(ACHIEVEMENTS_KEY, {});
  return achievements && typeof achievements === "object" ? achievements : {};
}

export function saveAchievements(achievements) {
  safeWrite(ACHIEVEMENTS_KEY, achievements);
}

export function clearLeaderboard() {
  safeWrite(LEADERBOARD_KEY, []);
}

export function clearQuizHistory() {
  safeWrite(QUIZ_HISTORY_KEY, []);
  safeWrite(LAST_RESULT_KEY, null);
}

export function clearAchievements() {
  safeWrite(ACHIEVEMENTS_KEY, {});
}

export function resetAllQuizData() {
  clearLeaderboard();
  clearQuizHistory();
  clearAchievements();
}
