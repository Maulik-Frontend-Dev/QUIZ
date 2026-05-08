import {
  formatDateTime,
  formatDifficultyLabel,
  formatSecondsToClock,
  getAppSettings,
  getGlobalAnalytics,
  renamePlayerProfile,
  updateAppSettings,
} from "./app-state.js";
import { getRenderableBadges } from "./badge-system.js";

const elements = {
  profileInitials: document.querySelector("[data-profile-initials]"),
  profileName: document.querySelector("[data-profile-name]"),
  profileMeta: document.querySelector("[data-profile-meta]"),
  editProfile: document.querySelector("[data-edit-profile]"),
  statsGrid: document.getElementById("stats-grid"),
  progressGrid: document.getElementById("progress-grid"),
  settingsList: document.getElementById("settings-list"),
  badgeSummaryTitle: document.querySelector("[data-badge-summary-title]"),
  badgeSummaryCopy: document.querySelector("[data-badge-summary-copy]"),
  profileModal: document.querySelector("[data-profile-modal]"),
  profileForm: document.querySelector("[data-profile-form]"),
  profileInput: document.querySelector("[data-profile-input]"),
  closeProfileModal: document.querySelector("[data-close-profile-modal]"),
  cancelProfileModal: document.querySelector("[data-cancel-profile-modal]"),
};

function initializeSettingsPage() {
  if (!elements.statsGrid) {
    return;
  }

  renderSettingsDashboard();
  bindProfileEditor();
  window.addEventListener("storage", renderSettingsDashboard);
}

function renderSettingsDashboard() {
  const analytics = getGlobalAnalytics();
  const badgeView = getRenderableBadges();
  const unlockedBadges = badgeView.badges.filter((badge) => badge.unlocked).length;
  const nextBadge = badgeView.badges.find((badge) => !badge.unlocked);

  renderProfile(analytics);
  renderStats(analytics, unlockedBadges);
  renderProgress(analytics, nextBadge);
  renderSettingsControls(analytics.settings);
  renderBadgeSnapshot(unlockedBadges, nextBadge);
}

function renderProfile(analytics) {
  elements.profileInitials.textContent = getInitials(analytics.playerName);
  elements.profileName.textContent = analytics.playerName;
  elements.profileMeta.textContent = `Last played: ${formatDateTime(analytics.lastPlayedAt)} • Difficulty: ${formatDifficultyLabel(analytics.settings.difficulty)}`;
}

function renderStats(analytics, unlockedBadges) {
  const cards = [
    { icon: "quiz", label: "Total Quizzes", value: analytics.totalQuizzes, card: "bg-surface-container-lowest dark:bg-[#17191c]" },
    { icon: "emoji_events", label: "Highest Score", value: `${analytics.highestScore}/10`, card: "bg-surface-container-low dark:bg-[#16191d]" },
    { icon: "gps_fixed", label: "Accuracy", value: `${analytics.accuracy}%`, card: "bg-primary text-white" },
    { icon: "workspace_premium", label: "Badges Earned", value: unlockedBadges, card: "bg-surface-container-high dark:bg-[#242930]" },
  ];

  elements.statsGrid.innerHTML = cards
    .map(
      (stat) => `
        <article class="${stat.card} p-6 rounded-lg min-h-[196px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_rgba(25,28,30,0.06)] flex flex-col justify-between">
          <span class="material-symbols-outlined text-3xl ${stat.card.includes("text-white") ? "text-white" : "text-primary dark:text-white"}">${stat.icon}</span>
          <div>
            <p class="mt-8 text-4xl font-black tracking-tight ${stat.card.includes("text-white") ? "text-white" : "text-primary dark:text-white"}">${stat.value}</p>
            <p class="mt-3 text-[11px] uppercase tracking-widest font-bold ${stat.card.includes("text-white") ? "text-white/70" : "text-outline"}">${stat.label}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderProgress(analytics, nextBadge) {
  const nextBadgeProgress = nextBadge ? `${nextBadge.progressLabel}` : "All badges unlocked";
  const nextBadgePercent = nextBadge ? nextBadge.progress : 100;
  const leaderboardValue = analytics.leaderboardRank ? `#${analytics.leaderboardRank}` : "Unranked";
  const bestDifficulty = `${formatDifficultyLabel(analytics.bestDifficultyPerformance.difficulty)} • ${analytics.bestDifficultyPerformance.accuracy}%`;
  const historySummary = analytics.totalQuizzes
    ? `${analytics.totalCorrect} correct / ${analytics.totalWrong} wrong • avg ${analytics.averageScore}/10`
    : "No quiz history yet";

  const progressItems = [
    {
      label: "Leaderboard Rank",
      value: leaderboardValue,
      detail: `Most used difficulty: ${formatDifficultyLabel(analytics.mostUsedDifficulty)}`,
      percent: analytics.leaderboardRank ? Math.max(15, 100 - (analytics.leaderboardRank - 1) * 10) : 0,
    },
    {
      label: "Best Difficulty",
      value: bestDifficulty,
      detail: `Selected difficulty: ${formatDifficultyLabel(analytics.settings.difficulty)}`,
      percent: analytics.bestDifficultyPerformance.accuracy,
    },
    {
      label: "Speed Analytics",
      value: `Fastest answer ${analytics.fastestAnswerSeconds || 0}s`,
      detail: `Average completion: ${formatSecondsToClock(analytics.averageCompletionSeconds)}`,
      percent: analytics.fastestAnswerSeconds ? Math.max(10, Math.round(((12 - Math.min(analytics.fastestAnswerSeconds, 12)) / 12) * 100)) : 0,
    },
    {
      label: "Current Streak",
      value: `${analytics.bestStreak} best streak`,
      detail: `Average answer time: ${analytics.averageAnswerSeconds || 0}s`,
      percent: Math.min(100, analytics.bestStreak * 10),
    },
    {
      label: "Quiz History",
      value: historySummary,
      detail: `Last played: ${formatDateTime(analytics.lastPlayedAt)}`,
      percent: analytics.totalQuizzes ? Math.min(100, analytics.totalQuizzes * 4) : 0,
    },
    {
      label: "Next Badge Unlock",
      value: nextBadge ? nextBadge.name : "Vault Completed",
      detail: nextBadgeProgress,
      percent: nextBadgePercent,
    },
  ];

  elements.progressGrid.innerHTML = progressItems
    .map(
      (item) => `
        <div>
          <div class="flex items-end justify-between gap-4 mb-3">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-outline mb-1">${item.label}</p>
              <p class="text-xl font-bold tracking-tight text-primary dark:text-white">${item.value}</p>
            </div>
            <p class="text-sm text-on-surface-variant dark:text-gray-400 max-w-[240px] text-right">${item.detail}</p>
          </div>
          <div class="h-2 w-full bg-surface-container-high dark:bg-[#2b3138] rounded-full overflow-hidden">
            <div class="h-full bg-primary dark:bg-white transition-all duration-700" style="width: ${item.percent}%"></div>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderSettingsControls(settings) {
  const controlItems = [
    { type: "toggle", icon: "graphic_eq", label: "Sound Effects", value: settings.soundEnabled, handler: () => toggleSetting("soundEnabled") },
    { type: "toggle", icon: "music_note", label: "Music", value: settings.musicEnabled, handler: () => toggleSetting("musicEnabled") },
    {
      type: "segmented",
      icon: "tune",
      label: "Difficulty Preference",
      value: settings.difficulty,
      options: [
        { value: "novice", label: "Novice" },
        { value: "expert", label: "Expert" },
        { value: "genius", label: "Genius" },
      ],
      handler: (value) => updateSettingAndRefresh({ difficulty: value }),
    },
    {
      type: "segmented",
      icon: "dark_mode",
      label: "Theme",
      value: settings.theme,
      options: [
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ],
      handler: (value) => {
        updateSettingAndRefresh({ theme: value });
        applyTheme(value);
      },
    },
  ];

  elements.settingsList.innerHTML = controlItems
    .map((item, index) => {
      const divider = index !== 0 ? "border-t border-outline-variant/20 pt-5" : "";

      if (item.type === "toggle") {
        return `
          <div class="${divider}">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <span class="material-symbols-outlined text-primary dark:text-white">${item.icon}</span>
                <div>
                  <p class="font-bold tracking-tight text-primary dark:text-white">${item.label}</p>
                </div>
              </div>
              <button class="toggle-btn relative w-12 h-7 rounded-full transition-colors duration-300 ${item.value ? "bg-primary dark:bg-white" : "bg-surface-container-high dark:bg-[#2b3138]"}" data-action="${item.label}">
                <span class="absolute top-1 w-5 h-5 rounded-full bg-white dark:bg-black transition-all duration-300 ${item.value ? "left-6 dark:bg-black" : "left-1"}"></span>
              </button>
            </div>
          </div>
        `;
      }

      if (item.type === "segmented") {
        return `
          <div class="${divider}">
            <div class="flex flex-col gap-4">
              <div class="flex items-center gap-4">
                <span class="material-symbols-outlined text-primary dark:text-white">${item.icon}</span>
                <p class="font-bold tracking-tight text-primary dark:text-white">${item.label}</p>
              </div>
              <div class="grid ${item.options.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-2">
                ${item.options
                  .map((option) => `
                    <button
                      class="settings-segment px-4 py-3 rounded-md font-bold text-sm transition-all duration-200 ${
                        option.value === item.value
                          ? "bg-primary text-white"
                          : "bg-surface-container-low dark:bg-[#242930] text-primary dark:text-white hover:bg-surface-container-high dark:hover:bg-[#2b3138]"
                      }"
                      data-action="${item.label}"
                      data-value="${option.value}"
                      type="button">
                      ${option.label}
                    </button>
                  `)
                  .join("")}
              </div>
            </div>
          </div>
        `;
      }
    })
    .join("");

  elements.settingsList.querySelectorAll(".toggle-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const action = controlItems.find((item) => item.label === button.dataset.action);
      action?.handler();
    });
  });

  elements.settingsList.querySelectorAll(".settings-segment").forEach((button) => {
    button.addEventListener("click", (event) => {
      const action = controlItems.find((item) => item.label === event.currentTarget.dataset.action);
      action?.handler(event.currentTarget.dataset.value);
    });
  });
}

function renderBadgeSnapshot(unlockedBadges, nextBadge) {
  elements.badgeSummaryTitle.textContent = `${unlockedBadges} badges earned`;
  elements.badgeSummaryCopy.textContent = nextBadge
    ? `You are ${nextBadge.progress}% of the way to unlocking ${nextBadge.name}. ${nextBadge.progressLabel}.`
    : "You unlocked the full badge vault. Every current achievement is complete.";
}

function bindProfileEditor() {
  elements.editProfile.addEventListener("click", () => {
    const settings = getAppSettings();
    elements.profileInput.value = settings.playerName || "Player";
    openProfileModal();
  });

  elements.closeProfileModal.addEventListener("click", closeProfileModal);
  elements.cancelProfileModal.addEventListener("click", closeProfileModal);
  elements.profileModal.addEventListener("click", (event) => {
    if (event.target === elements.profileModal) {
      closeProfileModal();
    }
  });
  elements.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextName = elements.profileInput.value.trim();

    if (!nextName) {
      elements.profileInput.focus();
      return;
    }

    renamePlayerProfile(nextName);
    closeProfileModal();
    renderSettingsDashboard();
  });
}

function toggleSetting(key) {
  const settings = getAppSettings();
  updateSettingAndRefresh({ [key]: !settings[key] });
}

function updateSettingAndRefresh(partialSettings) {
  updateAppSettings(partialSettings);
  window.quizAudio?.refreshSettings?.();
  renderSettingsDashboard();
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme !== "dark");
  window.quizAudio?.refreshSettings?.();
}

function openProfileModal() {
  elements.profileModal.classList.remove("hidden");
  elements.profileModal.classList.add("flex");
  window.setTimeout(() => {
    elements.profileInput.focus();
    elements.profileInput.select();
  }, 0);
}

function closeProfileModal() {
  elements.profileModal.classList.add("hidden");
  elements.profileModal.classList.remove("flex");
}

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "P";
  }
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

initializeSettingsPage();
