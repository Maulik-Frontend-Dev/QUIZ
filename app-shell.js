(() => {
  try {
    const settings = JSON.parse(localStorage.getItem("quizEdSettings") || "{}");
    const theme = settings.theme === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme !== "dark");
  } catch (error) {
    console.warn("Unable to apply saved theme.", error);
  }

  const audioState = {
    context: null,
    masterGain: null,
    musicGain: null,
    initialized: false,
    musicTimer: null,
    lastUiTapAt: 0,
  };

  function getAudioSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem("quizEdSettings") || "{}");
      return {
        soundEnabled: settings.soundEnabled !== false,
        musicEnabled: settings.musicEnabled !== false,
      };
    } catch (error) {
      return { soundEnabled: true, musicEnabled: true };
    }
  }

  function ensureAudio() {
    if (audioState.initialized || !("AudioContext" in window || "webkitAudioContext" in window)) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioState.context = new AudioContextClass();
    audioState.masterGain = audioState.context.createGain();
    audioState.musicGain = audioState.context.createGain();
    audioState.masterGain.gain.value = 0.18;
    audioState.musicGain.gain.value = 0.05;
    audioState.musicGain.connect(audioState.masterGain);
    audioState.masterGain.connect(audioState.context.destination);
    audioState.initialized = true;
  }

  function resumeAudio() {
    ensureAudio();
    if (audioState.context?.state === "suspended") {
      audioState.context.resume().catch(() => {});
    }
  }

  function playTone(frequency, duration, type = "sine", volume = 0.12, when = 0) {
    const { soundEnabled } = getAudioSettings();
    if (!soundEnabled) {
      return;
    }

    resumeAudio();
    if (!audioState.context || !audioState.masterGain) {
      return;
    }

    const oscillator = audioState.context.createOscillator();
    const gainNode = audioState.context.createGain();
    const startTime = audioState.context.currentTime + when;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioState.masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  function playMusicPulse() {
    const { musicEnabled } = getAudioSettings();
    if (!musicEnabled || document.hidden) {
      return;
    }

    resumeAudio();
    if (!audioState.context || !audioState.musicGain) {
      return;
    }

    const sequence = [
      { frequency: 261.63, delay: 0, duration: 0.34 },
      { frequency: 329.63, delay: 0.42, duration: 0.28 },
      { frequency: 392.0, delay: 0.8, duration: 0.36 },
    ];

    sequence.forEach((note) => {
      const oscillator = audioState.context.createOscillator();
      const gainNode = audioState.context.createGain();
      const startTime = audioState.context.currentTime + note.delay;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, startTime);
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.04, startTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + note.duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioState.musicGain);
      oscillator.start(startTime);
      oscillator.stop(startTime + note.duration + 0.05);
    });
  }

  function syncMusicLoop() {
    const { musicEnabled } = getAudioSettings();

    if (audioState.musicTimer) {
      window.clearInterval(audioState.musicTimer);
      audioState.musicTimer = null;
    }

    if (!musicEnabled) {
      return;
    }

    playMusicPulse();
    audioState.musicTimer = window.setInterval(playMusicPulse, 5200);
  }

  function playUiTap() {
    const now = Date.now();
    if (now - audioState.lastUiTapAt < 90) {
      return;
    }
    audioState.lastUiTapAt = now;
    playTone(540, 0.08, "triangle", 0.045);
  }

  window.quizAudio = {
    refreshSettings() {
      syncMusicLoop();
    },
    play(type) {
      if (type === "correct") {
        playTone(523.25, 0.12, "triangle", 0.08, 0);
        playTone(659.25, 0.16, "triangle", 0.07, 0.08);
        return;
      }
      if (type === "wrong") {
        playTone(220, 0.16, "sawtooth", 0.06, 0);
        playTone(180, 0.18, "sawtooth", 0.05, 0.08);
        return;
      }
      if (type === "complete") {
        playTone(392, 0.14, "triangle", 0.08, 0);
        playTone(523.25, 0.16, "triangle", 0.08, 0.12);
        playTone(659.25, 0.2, "triangle", 0.08, 0.22);
        return;
      }
      playUiTap();
    },
  };

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target.closest("button, a, input, select, label")) {
        resumeAudio();
        syncMusicLoop();
      }
    },
    { passive: true },
  );

  document.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) {
      playUiTap();
    }
  });

  document.addEventListener("visibilitychange", syncMusicLoop);
  window.addEventListener("storage", syncMusicLoop);
  syncMusicLoop();

  document.querySelectorAll("[data-premium-reveal]").forEach((node, index) => {
    node.classList.add("premium-reveal");
    node.style.animationDelay = `${index * 80}ms`;
  });
})();
