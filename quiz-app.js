import quizData from "./Quizdata.js";
import { getQuizSettings, saveLeaderboardEntry } from "./quiz-storage.js";
import { syncBadgeProgress } from "./badge-system.js";

const QUESTIONS_PER_GAME = 10;
const ANSWER_DELAY_MS = 1200;
const TIMER_BY_DIFFICULTY = {
  novice: 45,
  expert: 30,
  genius: 15,
};
const DIFFICULTY_LABELS = {
  novice: "Novice",
  expert: "Expert",
  genius: "Genius",
};

const state = {
  difficulty: "novice",
  playerName: "Player",
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  timerValue: 45,
  timerId: null,
  selectedAnswer: null,
  hasAnsweredCurrent: false,
  bestStreak: 0,
  streak: 0,
  startedAt: 0,
};

const elements = {
  app: document.querySelector("[data-quiz-app]"),
  startScreen: document.querySelector("[data-start-screen]"),
  quizScreen: document.querySelector("[data-quiz-screen]"),
  progressCount: document.querySelector("[data-progress-count]"),
  progressTotal: document.querySelector("[data-progress-total]"),
  progressBar: document.querySelector("[data-progress-bar]"),
  sessionLabel: document.querySelector("[data-session-label]"),
  playerName: document.querySelectorAll("[data-player-name]"),
  difficultyLabel: document.querySelectorAll("[data-difficulty-label]"),
  timerValue: document.querySelectorAll("[data-timer-value]"),
  timerBar: document.querySelector("[data-timer-bar]"),
  questionLabel: document.querySelector("[data-question-label]"),
  questionText: document.querySelector("[data-question-text]"),
  answerGrid: document.querySelector("[data-answer-grid]"),
  answerStatus: document.querySelector("[data-answer-status]"),
  scoreValue: document.querySelector("[data-score-value]"),
  correctValue: document.querySelector("[data-correct-value]"),
  wrongValue: document.querySelector("[data-wrong-value]"),
  questionPanel: document.querySelector("[data-question-panel]"),
  startQuizButton: document.querySelector("[data-start-quiz]"),
};

function initializeQuizPage() {
  if (!elements.app) {
    return;
  }

  const settings = getQuizSettings();
  state.difficulty = TIMER_BY_DIFFICULTY[settings.difficulty] ? settings.difficulty : "novice";
  state.playerName = settings.playerName?.trim() || "Player";
  state.timerValue = TIMER_BY_DIFFICULTY[state.difficulty];

  // Reuse the selected difficulty from the home page so the UX stays connected.
  syncStaticLabels();
  resetHeader();

  elements.startQuizButton?.addEventListener("click", startQuiz);
}

function syncStaticLabels() {
  const difficultyText = DIFFICULTY_LABELS[state.difficulty];
  elements.sessionLabel.textContent = `Session: ${difficultyText} Challenge`;
  elements.playerName.forEach((node) => {
    node.textContent = state.playerName;
  });
  elements.difficultyLabel.forEach((node) => {
    node.textContent = difficultyText;
  });
  elements.timerValue.forEach((node) => {
    node.textContent = `${TIMER_BY_DIFFICULTY[state.difficulty]}s`;
  });
}

function resetHeader() {
  elements.progressTotal.textContent = String(QUESTIONS_PER_GAME).padStart(2, "0");
  elements.progressCount.textContent = "00";
  elements.progressBar.style.width = "0%";
  elements.scoreValue.textContent = "0";
  elements.correctValue.textContent = "0";
  elements.wrongValue.textContent = "0";
}

function startQuiz() {
  const pool = Array.isArray(quizData[state.difficulty]) ? quizData[state.difficulty] : [];
  state.questions = shuffle(pool).slice(0, QUESTIONS_PER_GAME);
  state.currentQuestionIndex = 0;
  state.score = 0;
  state.correctAnswers = 0;
  state.wrongAnswers = 0;
  state.selectedAnswer = null;
  state.hasAnsweredCurrent = false;
  state.bestStreak = 0;
  state.streak = 0;
  state.startedAt = Date.now();

  elements.startScreen.classList.add("hidden");
  elements.quizScreen.classList.remove("hidden");

  renderQuestion();
}

function renderQuestion() {
  const question = state.questions[state.currentQuestionIndex];

  if (!question) {
    finishQuiz();
    return;
  }

  state.selectedAnswer = null;
  state.hasAnsweredCurrent = false;
  state.timerValue = TIMER_BY_DIFFICULTY[state.difficulty];

  const questionNumber = state.currentQuestionIndex + 1;
  elements.progressCount.textContent = String(questionNumber).padStart(2, "0");
  elements.progressBar.style.width = `${((questionNumber - 1) / QUESTIONS_PER_GAME) * 100}%`;
  elements.questionLabel.textContent = `Question ${String(questionNumber).padStart(2, "0")}`;
  elements.questionText.textContent = question.question;
  elements.answerStatus.textContent = "Select one answer before time runs out.";

  elements.questionPanel.classList.remove("quiz-panel-enter");
  void elements.questionPanel.offsetWidth;
  elements.questionPanel.classList.add("quiz-panel-enter");

  renderAnswers(question);
  updateStats();
  startTimer();
}

function renderAnswers(question) {
  elements.answerGrid.innerHTML = "";

  question.options.forEach((option, index) => {
    const optionLetter = String.fromCharCode(65 + index);
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "group bg-surface-container-lowest dark:bg-[#17191c] border border-outline-variant hover:border-primary p-6 text-left transition-all duration-300 flex justify-between items-center premium-card-hover";
    button.dataset.answer = option;
    button.innerHTML = `
      <div class="flex gap-4 items-center">
        <span class="text-xl font-black text-secondary group-hover:text-primary font-headline">${optionLetter}.</span>
        <span class="text-lg font-medium text-primary dark:text-white">${escapeHtml(option)}</span>
      </div>
      <span class="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">circle</span>
    `;

    button.addEventListener("click", () => handleAnswerSelection(option));
    elements.answerGrid.appendChild(button);
  });
}

function handleAnswerSelection(answer) {
  if (state.hasAnsweredCurrent) {
    return;
  }

  state.selectedAnswer = answer;
  revealAnswer(false);
}

function revealAnswer(timedOut) {
  state.hasAnsweredCurrent = true;
  clearTimer();

  const question = state.questions[state.currentQuestionIndex];
  const answerButtons = [...elements.answerGrid.querySelectorAll("button")];
  const isCorrect = state.selectedAnswer === question.answer;

  answerButtons.forEach((button) => {
    const labelNode = button.querySelector(".material-symbols-outlined");
    const letterNode = button.querySelector(".font-headline");
    const buttonAnswer = button.dataset.answer;
    button.disabled = true;

    if (buttonAnswer === question.answer) {
      button.className =
        "group bg-surface-container-lowest dark:bg-[#17191c] border-2 border-primary p-6 text-left transition-all duration-300 flex justify-between items-center premium-card-hover";
      letterNode.className = "text-xl font-black text-primary dark:text-white font-headline";
      labelNode.textContent = "check_circle";
      labelNode.className = "material-symbols-outlined text-primary dark:text-white";
      return;
    }

    if (state.selectedAnswer && buttonAnswer === state.selectedAnswer) {
      button.className =
        "group bg-error-container dark:bg-[#3a1717] border-2 border-error p-6 text-left transition-all duration-300 flex justify-between items-center premium-card-hover";
      letterNode.className = "text-xl font-black text-error font-headline";
      labelNode.textContent = "cancel";
      labelNode.className = "material-symbols-outlined text-error";
    }
  });

  if (isCorrect) {
    state.score += 1;
    state.correctAnswers += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    window.quizAudio?.play("correct");
    elements.answerStatus.textContent = "Correct answer. Moving to the next question.";
  } else {
    state.wrongAnswers += 1;
    state.streak = 0;
    window.quizAudio?.play("wrong");
    elements.answerStatus.textContent = timedOut
      ? `Time is up. Correct answer: ${question.answer}`
      : `Wrong answer. Correct answer: ${question.answer}`;
  }

  elements.progressBar.style.width = `${((state.currentQuestionIndex + 1) / QUESTIONS_PER_GAME) * 100}%`;
  updateStats();

  window.setTimeout(() => {
    state.currentQuestionIndex += 1;
    renderQuestion();
  }, ANSWER_DELAY_MS);
}

function startTimer() {
  updateTimerUI();

  state.timerId = window.setInterval(() => {
    state.timerValue -= 1;
    updateTimerUI();

    if (state.timerValue <= 0) {
      revealAnswer(true);
    }
  }, 1000);
}

function clearTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerUI() {
  const maxTime = TIMER_BY_DIFFICULTY[state.difficulty];
  const safeTime = Math.max(state.timerValue, 0);
  const width = (safeTime / maxTime) * 100;

  elements.timerValue.forEach((node) => {
    node.textContent = `${safeTime}s`;
  });

  if (elements.timerBar) {
    elements.timerBar.style.width = `${width}%`;
    elements.timerBar.classList.toggle("bg-error", width <= 35);
    elements.timerBar.classList.toggle("dark:bg-red-400", width <= 35);
  }
}

function updateStats() {
  elements.scoreValue.textContent = String(state.score);
  elements.correctValue.textContent = String(state.correctAnswers);
  elements.wrongValue.textContent = String(state.wrongAnswers);
}

function finishQuiz() {
  clearTimer();

  const totalQuestions = state.questions.length || QUESTIONS_PER_GAME;
  const percentage = Math.round((state.correctAnswers / totalQuestions) * 100);
  const duration = formatDuration(Date.now() - state.startedAt);
  const completedAt = Date.now();

  const result = {
    id: `quiz-${completedAt}`,
    name: state.playerName,
    score: state.score,
    totalQuestions,
    correctAnswers: state.correctAnswers,
    wrongAnswers: state.wrongAnswers,
    percentage,
    difficulty: state.difficulty,
    difficultyLabel: DIFFICULTY_LABELS[state.difficulty],
    duration,
    completedAt,
    bestStreak: state.bestStreak,
    message: getMotivationalMessage(percentage),
  };

  saveLeaderboardEntry(result);
  syncBadgeProgress();
  window.quizAudio?.play("complete");
  window.location.href = "Leaderboard.html";
}

function getMotivationalMessage(percentage) {
  if (percentage >= 90) {
    return "Phenomenal run. You looked completely in control.";
  }
  if (percentage >= 70) {
    return "Strong work. You are very close to a top-tier finish.";
  }
  if (percentage >= 50) {
    return "Solid progress. Another round could push you much higher.";
  }
  return "Every round builds momentum. Reset and take another shot.";
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(Math.round(milliseconds / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

initializeQuizPage();
