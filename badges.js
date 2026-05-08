import { getRenderableBadges, syncBadgeProgress } from "./badge-system.js";

const badgeState = {
  activeTab: "all",
  search: "",
  badgeData: [],
  stats: null,
  latestUnlock: null,
};

const summaryNode = document.getElementById("badge-summary");
const tabsNode = document.getElementById("badge-tabs");
const badgesNode = document.getElementById("badges-grid");
const searchNode = document.getElementById("badge-search");
const filterNode = document.getElementById("badge-filter");
const celebrateButton = document.getElementById("celebrate-button");
const latestUnlockTitle = document.querySelector("[data-latest-unlock-title]");
const latestUnlockCopy = document.querySelector("[data-latest-unlock-copy]");
const completionValue = document.querySelector("[data-badge-completion-value]");
const completionBar = document.querySelector("[data-badge-completion-bar]");

function initializeBadgesPage() {
  loadBadges();

  searchNode.addEventListener("input", (event) => {
    badgeState.search = event.target.value;
    renderBadges();
  });

  filterNode.addEventListener("change", (event) => {
    badgeState.activeTab = event.target.value;
    renderTabs();
    renderBadges();
  });

  celebrateButton.addEventListener("click", celebrate);
  window.addEventListener("storage", loadBadges);
}

function loadBadges() {
  const { badges, stats, latestUnlock } = syncBadgeProgress();
  badgeState.badgeData = badges;
  badgeState.stats = stats;
  badgeState.latestUnlock = latestUnlock;

  renderSummary();
  renderTabs();
  renderLatestUnlock();
  renderBadges();
}

function categoryStyles(category, unlocked) {
  if (category === "novice") {
    return unlocked
      ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white"
      : "bg-surface-container-high dark:bg-[#2b3138] text-primary dark:text-white";
  }
  if (category === "expert") {
    return unlocked
      ? "bg-gradient-to-br from-slate-300 to-sky-500 text-white"
      : "bg-surface-container-high dark:bg-[#2b3138] text-primary dark:text-white";
  }
  return unlocked
    ? "bg-gradient-to-br from-yellow-300 via-amber-400 to-purple-500 text-white"
    : "bg-surface-container-high dark:bg-[#2b3138] text-primary dark:text-white";
}

function renderSummary() {
  const unlocked = badgeState.badgeData.filter((badge) => badge.unlocked).length;
  const locked = badgeState.badgeData.length - unlocked;
  const completionPercent = badgeState.badgeData.length
    ? Math.round((unlocked / badgeState.badgeData.length) * 100)
    : 0;

  const stats = [
    { label: "Earned", value: unlocked },
    { label: "Locked", value: locked },
    { label: "Completion", value: `${completionPercent}%` },
    { label: "Total", value: badgeState.badgeData.length },
  ];

  summaryNode.innerHTML = stats
    .map(
      (item) => `
        <div class="bg-surface-container-low dark:bg-[#242930] p-4 rounded-lg">
            <p class="text-2xl font-black tracking-tight text-primary dark:text-white">${item.value}</p>
            <p class="text-[10px] uppercase tracking-widest font-bold text-outline mt-2">${item.label}</p>
        </div>
      `,
    )
    .join("");

  completionValue.textContent = `${completionPercent}%`;
  completionBar.style.width = `${completionPercent}%`;
}

function renderTabs() {
  const tabs = [
    { key: "all", label: "All Badges", helper: "Complete vault" },
    { key: "novice", label: "Novice", helper: "Bronze / starter wins" },
    { key: "expert", label: "Expert", helper: "Silver / skill based" },
    { key: "genius", label: "Genius", helper: "Gold / rare mastery" },
  ];

  tabsNode.innerHTML = tabs
    .map(
      (tab) => `
        <button
            class="w-full text-left p-4 rounded-lg transition-all duration-200 ${badgeState.activeTab === tab.key ? "bg-primary text-white" : "bg-surface-container-low dark:bg-[#242930] text-primary dark:text-white hover:bg-surface-container-high dark:hover:bg-[#2b3138]"}"
            data-tab="${tab.key}">
            <p class="font-bold tracking-tight">${tab.label}</p>
            <p class="text-[11px] uppercase tracking-widest mt-2 ${badgeState.activeTab === tab.key ? "text-white/70" : "text-outline"}">${tab.helper}</p>
        </button>
      `,
    )
    .join("");

  tabsNode.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      badgeState.activeTab = button.dataset.tab;
      filterNode.value = button.dataset.tab;
      renderTabs();
      renderBadges();
    });
  });
}

function renderLatestUnlock() {
  if (!badgeState.latestUnlock) {
    latestUnlockTitle.textContent = "No badges unlocked yet";
    latestUnlockCopy.textContent = "Complete quiz challenges and leaderboard goals to unlock your first achievement.";
    return;
  }

  latestUnlockTitle.textContent = badgeState.latestUnlock.name;
  latestUnlockCopy.textContent = `Earned on ${badgeState.latestUnlock.date} after completing: ${badgeState.latestUnlock.description}`;
}

function renderBadges() {
  const query = badgeState.search.toLowerCase().trim();
  const category = badgeState.activeTab;

  const filtered = badgeState.badgeData.filter((badge) => {
    const matchesCategory = category === "all" || badge.category === category;
    const matchesSearch =
      !query ||
      badge.name.toLowerCase().includes(query) ||
      badge.description.toLowerCase().includes(query) ||
      badge.requirement.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  badgesNode.innerHTML = filtered
    .map(
      (badge) => `
        <article class="p-6 rounded-lg transition-all duration-300 hover:-translate-y-1 ${badge.unlocked ? "bg-surface-container-low dark:bg-[#16191d] hover:shadow-[0px_24px_48px_rgba(25,28,30,0.06)]" : "bg-surface-container-highest dark:bg-[#22262c] grayscale opacity-80"}">
            <div class="flex items-start justify-between gap-4 mb-6">
                <div class="w-14 h-14 rounded-full flex items-center justify-center ${categoryStyles(badge.category, badge.unlocked)}">
                    <span class="material-symbols-outlined">${badge.icon}</span>
                </div>
                <div class="text-right">
                    <p class="text-[10px] uppercase tracking-widest font-bold text-outline">${badge.rarity}</p>
                    <p class="text-[10px] uppercase tracking-widest font-bold ${badge.unlocked ? "text-primary dark:text-white" : "text-outline"} mt-2">${badge.category}</p>
                </div>
            </div>
            <h3 class="text-2xl font-black tracking-tight text-primary dark:text-white mb-3">${escapeHtml(badge.name)}</h3>
            <p class="text-on-surface-variant dark:text-gray-400 leading-relaxed mb-5">${escapeHtml(badge.description)}</p>
            <p class="text-[11px] uppercase tracking-widest font-bold text-outline mb-2">Requirement</p>
            <p class="font-medium text-primary dark:text-white mb-5">${escapeHtml(badge.requirement)}</p>
            <div class="h-2 w-full bg-surface-container-high dark:bg-[#2b3138] rounded-full overflow-hidden mb-4">
                <div class="h-full ${badge.unlocked ? "bg-primary dark:bg-white" : "bg-primary-fixed"} transition-all duration-700" style="width: ${badge.progress}%"></div>
            </div>
            <div class="flex items-center justify-between gap-4 flex-wrap">
                <p class="text-sm text-on-surface-variant dark:text-gray-400">${badge.unlocked ? "Unlocked" : escapeHtml(badge.progressLabel)}</p>
                <p class="text-[11px] uppercase tracking-widest font-bold ${badge.unlocked ? "text-primary dark:text-white" : "text-outline"}">${badge.unlocked ? escapeHtml(badge.date) : "Locked"}</p>
            </div>
        </article>
      `,
    )
    .join("");

  if (!filtered.length) {
    badgesNode.innerHTML = `
      <div class="md:col-span-2 bg-surface-container-low dark:bg-[#16191d] p-8 rounded-lg text-center">
          <p class="text-2xl font-black tracking-tight text-primary dark:text-white mb-3">No badge found</p>
          <p class="text-on-surface-variant dark:text-gray-400">Try another search or switch the category filter.</p>
      </div>
    `;
  }
}

function celebrate() {
  const layer = document.getElementById("confetti-layer");
  layer.innerHTML = "";
  const colors = ["bg-white", "bg-yellow-300", "bg-pink-300", "bg-cyan-300"];

  for (let index = 0; index < 18; index += 1) {
    const piece = document.createElement("span");
    piece.className = `absolute w-2 h-2 rounded-full opacity-70 ${colors[index % colors.length]}`;
    piece.style.left = `${5 + Math.random() * 90}%`;
    piece.style.top = `${5 + Math.random() * 35}%`;
    piece.animate(
      [
        { transform: "translateY(0px) scale(1)", opacity: 0.8 },
        {
          transform: `translateY(${80 + Math.random() * 70}px) translateX(${-30 + Math.random() * 60}px) scale(0.6)`,
          opacity: 0,
        },
      ],
      { duration: 1000, easing: "ease-out" },
    );
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 1050);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

initializeBadgesPage();
