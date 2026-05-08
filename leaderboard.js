import { getLastResult, getLeaderboard, sortLeaderboard } from "./quiz-storage.js";

const SCORE_RING_LENGTH = 553;

const elements = {
  resultMessage: document.querySelector("[data-result-message]"),
  resultPercentage: document.querySelector("[data-result-percentage]"),
  resultScore: document.querySelector("[data-result-score]"),
  resultDuration: document.querySelector("[data-result-duration]"),
  resultDifficulty: document.querySelector("[data-result-difficulty]"),
  resultHeadline: document.querySelector("[data-result-headline]"),
  resultCorrect: document.querySelector("[data-result-correct]"),
  resultWrong: document.querySelector("[data-result-wrong]"),
  resultName: document.querySelector("[data-result-name]"),
  scoreRing: document.querySelector("[data-score-ring]"),
  leaderboardCount: document.querySelector("[data-leaderboard-count]"),
  leaderboardList: document.querySelector("[data-leaderboard-list]"),
};

function initializeLeaderboardPage() {
  renderLatestResult();
  renderLeaderboard();
  window.addEventListener("storage", () => {
    renderLatestResult();
    renderLeaderboard();
  });
}

function renderLatestResult() {
  const result = getLastResult();

  if (!result) {
    elements.resultMessage.textContent = "No finished quiz yet. Start a round to see your result summary here.";
    elements.resultHeadline.textContent = "Play a round";
    return;
  }

  elements.resultMessage.textContent = result.message;
  elements.resultPercentage.textContent = `${result.percentage}%`;
  elements.resultScore.textContent = `You scored ${result.score}/${result.totalQuestions}`;
  elements.resultDuration.textContent = result.duration;
  elements.resultDifficulty.textContent = result.difficultyLabel;
  elements.resultHeadline.textContent = result.message;
  elements.resultCorrect.textContent = String(result.correctAnswers);
  elements.resultWrong.textContent = String(result.wrongAnswers);
  elements.resultName.textContent = result.name;

  const scoreOffset = SCORE_RING_LENGTH - (SCORE_RING_LENGTH * result.percentage) / 100;
  elements.scoreRing.style.strokeDashoffset = `${scoreOffset}`;
}

function renderLeaderboard() {
  // Highest score first, then newest result first when scores are tied.
  const entries = sortLeaderboard(getLeaderboard());
  elements.leaderboardCount.textContent = `${entries.length} saved results`;

  if (!entries.length) {
    elements.leaderboardList.innerHTML = `
      <div class="flex items-center justify-between p-4 bg-white dark:bg-[#17191c] rounded-lg editorial-shadow premium-card-hover">
        <div class="flex items-center gap-4">
          <span class="text-lg font-black text-outline-variant w-6 text-center">-</span>
          <span class="font-bold">No leaderboard entries yet</span>
        </div>
        <span class="font-black text-primary dark:text-white">Start playing</span>
      </div>
    `;
    return;
  }

  elements.leaderboardList.innerHTML = entries
    .map((entry, index) => {
      const highlighted = index === 0
        ? "bg-primary text-white rounded-lg transform scale-[1.03] editorial-shadow"
        : "bg-white dark:bg-[#17191c] rounded-lg editorial-shadow premium-card-hover";
      const rankColor = index === 0 ? "text-white/40" : "text-outline-variant";
      const scoreColor = index === 0 ? "text-white" : "text-primary dark:text-white";
      const subtitleColor = index === 0 ? "text-white/70" : "text-on-surface-variant dark:text-gray-400";

      return `
        <div class="flex items-center justify-between p-4 ${highlighted}">
          <div class="flex items-center gap-4">
            <span class="text-lg font-black ${rankColor} w-6 text-center">${index + 1}</span>
            <div class="w-10 h-10 rounded-full bg-surface-container-high ${index === 0 ? "bg-white/20" : ""} overflow-hidden flex items-center justify-center">
              <span class="font-black ${scoreColor}">${escapeHtml(entry.name).slice(0, 1).toUpperCase()}</span>
            </div>
            <div>
              <span class="font-bold">${escapeHtml(entry.name)}</span>
              <p class="text-xs ${subtitleColor}">${entry.difficultyLabel} • ${entry.percentage}% • ${entry.correctAnswers}/${entry.totalQuestions}</p>
            </div>
          </div>
          <span class="font-black ${scoreColor}">${entry.score} pts</span>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

initializeLeaderboardPage();
