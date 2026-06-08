import {
  settings,
  applySettingsToUI,
  initSettingsListeners,
} from "./settings.js";
import { playSound, triggerVibration, unlockAudio } from "./audio.js";
import { getSecureRandomIndex, populateMathContent, lastMathLog } from "./random.js";
import { clearParticles, particles, Particle } from "./particles.js";
import {
  addTrail,
  updateTrail,
  deactivateTrail,
  clearTrails,
  triggerDrawingLoop,
  updateTrailColor,
} from "./trails.js";

// ----------------------------------------------------
// ENUMS
// ----------------------------------------------------
export const GameState = {
  WAITING: "WAITING",
  COUNTDOWN: "COUNTDOWN",
  ANIMATING: "ANIMATING",
  DONE: "DONE",
};

export const GameMode = {
  CLASSIC: "classic",
  TEAMS: "teams",
  ORDER: "order",
};

// ----------------------------------------------------
// GLOBAL VARIABLES & PALETTE
// ----------------------------------------------------
const colors = [
  "#0E68AB", // Blue
  "#A64DFF", // Purple
  "#D3202A", // Red
  "#00733E", // Green
  "#F6C644", // Gold
  "#FF6B00", // Orange
  "#FF007F", // Neon Pink/Magenta
  "#00E5FF", // Neon Cyan
  "#7CFF01", // Neon Lime/Green
  "#BD00FF", // Neon Violet
  "#FFD700", // Gold Yellow
  "#FF4F00", // Neon Red/Orange
  "#AAF0D1", // Mint
  "#E6E6FA", // Lavender
  "#1F51FF", // Electric Blue
];

let colorIdx = 0;
let fingers = new Map();
let state = GameState.WAITING;
let countdownInterval;
let timeLeft = settings.countdown;
let isGameActive = false;
let gameMode = GameMode.CLASSIC;

// ----------------------------------------------------
// DOM Selectors
// ----------------------------------------------------
let msg, restartBtn, startScreen, startBtn;
let mathBtn, mathModal, closeMathBtn;
let settingsBtn, settingsModal, closeSettingsBtn, homeBtn;

function initDOMRefs() {
  msg = document.getElementById("message");
  restartBtn = document.getElementById("restart-btn");
  startScreen = document.getElementById("start-screen");
  startBtn = document.getElementById("start-btn");

  mathBtn = document.getElementById("math-btn");
  mathModal = document.getElementById("math-modal");
  closeMathBtn = document.getElementById("close-math-btn");

  settingsBtn = document.getElementById("settings-btn");
  settingsModal = document.getElementById("settings-modal");
  closeSettingsBtn = document.getElementById("close-settings-btn");
  homeBtn = document.getElementById("home-btn");
}

// ----------------------------------------------------
// TAP HELPER (Supports both click and touch)
// ----------------------------------------------------
function addTapListener(element, callback) {
  if (!element) return;
  let triggered = false;
  const handler = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.type === "touchstart") {
      triggered = true;
      setTimeout(() => {
        triggered = false;
      }, 400);
      callback(e);
    } else if (e.type === "click") {
      if (!triggered) {
        callback(e);
      }
    }
  };
  element.addEventListener("touchstart", handler, { passive: false });
  element.addEventListener("click", handler);
}

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------
function secureShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getSecureRandomIndex(i + 1);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function triggerExplosion(x, y, color) {
  for (let p = 0; p < 35; p++) {
    const angle = (p / 35) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    const speed = Math.random() * 5 + 4; // speed in pixels per frame
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    particles.push(new Particle(x, y, color, vx, vy, true));
  }
  triggerDrawingLoop();
}

// ----------------------------------------------------
// GAME STATE MACHINE ACTIONS
// ----------------------------------------------------
function checkState() {
  if (fingers.size > 1 && state === GameState.WAITING) {
    state = GameState.COUNTDOWN;
    timeLeft = settings.countdown;
    msg.innerText = timeLeft;

    countdownInterval = setInterval(() => {
      timeLeft--;
      playSound("tic");
      triggerVibration(20);

      if (timeLeft > 0) {
        msg.innerText = timeLeft;
      } else {
        clearInterval(countdownInterval);
        startSelection();
      }
    }, 1000);
  }
}

function startSelection() {
  state = GameState.ANIMATING;
  msg.innerText = "Selecting...";
  updateHomeButtonVisibility();

  const fingerArray = Array.from(fingers.values());
  fingerArray.forEach((el) => el.classList.add("pulsing"));

  setTimeout(() => {
    state = GameState.DONE;

    if (gameMode === GameMode.CLASSIC) {
      const winnerTouchId = Array.from(fingers.keys())[
        getSecureRandomIndex(fingers.size)
      ];
      const winnerFinger = fingers.get(winnerTouchId);

      fingers.forEach((el, id) => {
        el.classList.remove("pulsing");
        if (id === winnerTouchId) {
          el.classList.add("winner");
          msg.innerText = "YOU GO FIRST!";
          playSound("win");
          triggerVibration([300, 100, 300]);

          // Trigger particle explosion!
          const x = parseFloat(el.style.left);
          const y = parseFloat(el.style.top);
          const color = el.style.backgroundColor;
          triggerExplosion(x, y, color);

          // Show restart and math flex buttons
          restartBtn.style.display = "inline-flex";
          if (mathBtn) mathBtn.style.display = "block";
        } else {
          el.style.opacity = "0";
          setTimeout(() => el.remove(), 500);
        }
      });

      // Save mode for math log
      lastMathLog.mode = "classic";

    } else if (gameMode === GameMode.TEAMS) {
      const touchIds = Array.from(fingers.keys());
      secureShuffle(touchIds);

      // Determine configured teams count (2, 3, or 4)
      const numTeams = parseInt(
        document
          .querySelector(".team-count-btn.active")
          ?.getAttribute("data-count") || "2",
        10,
      );

      const teamColors = ["#00E5FF", "#FF007F", "#FFEA00", "#BD00FF"];
      const teamLabels = ["A", "B", "C", "D"];

      const teams = Array.from({ length: numTeams }, () => []);
      touchIds.forEach((id, idx) => {
        teams[idx % numTeams].push(id);
      });

      const teamsGroups = {};

      teams.forEach((teamPlayers, teamIdx) => {
        const color = teamColors[teamIdx];
        const label = teamLabels[teamIdx];
        teamsGroups[label] = [];

        teamPlayers.forEach((id, playerIdx) => {
          const el = fingers.get(id);
          if (el) {
            el.classList.remove("pulsing");
            el.style.backgroundColor = color;
            el.style.setProperty("--finger-color", color);
            el.style.borderColor = color;
            el.innerText = `${label}${playerIdx + 1}`;
            
            teamsGroups[label].push(`${label}${playerIdx + 1}`);

            // Update corresponding trail color!
            updateTrailColor(id, color);

            // Spawn team explosion
            const x = parseFloat(el.style.left);
            const y = parseFloat(el.style.top);
            triggerExplosion(x, y, color);
          }
        });
      });

      // Save log data for entropy inspector
      lastMathLog.mode = "teams";
      lastMathLog.numTeams = numTeams;
      lastMathLog.teamsGroups = teamsGroups;

      msg.innerText = "TEAMS ASSIGNED!";
      playSound("win");
      triggerVibration([300, 100, 300]);

      restartBtn.style.display = "inline-flex";
      if (mathBtn) mathBtn.style.display = "block";

    } else if (gameMode === GameMode.ORDER) {
      // Assign playing order
      const touchIds = Array.from(fingers.keys());
      secureShuffle(touchIds);

      const shuffledOrder = [];

      touchIds.forEach((id, idx) => {
        const el = fingers.get(id);
        el.classList.remove("pulsing");
        el.innerText = idx + 1;
        shuffledOrder.push(`Player ${idx + 1}`);

        // Spawn order explosion
        const x = parseFloat(el.style.left);
        const y = parseFloat(el.style.top);
        const color = el.style.backgroundColor;
        triggerExplosion(x, y, color);
      });

      // Save log data for entropy inspector
      lastMathLog.mode = "order";
      lastMathLog.shuffledOrder = shuffledOrder;

      msg.innerText = "ORDER DECIDED!";
      playSound("win");
      triggerVibration([300, 100, 300]);

      restartBtn.style.display = "inline-flex";
      if (mathBtn) mathBtn.style.display = "block";
    }

    updateHomeButtonVisibility();
  }, 2000);
}

function resetGame() {
  clearInterval(countdownInterval);
  state = GameState.WAITING;

  // Hide buttons
  restartBtn.style.display = "none";
  if (mathBtn) mathBtn.style.display = "none";

  document.querySelectorAll(".finger").forEach((el) => el.remove());
  fingers.clear();
  msg.innerText = "Place your fingers";

  // Reset trails, particles, and canvas
  clearTrails();
  clearParticles();

  updateHomeButtonVisibility();
}

// ----------------------------------------------------
// UI PRESENTATION HELPERS
// ----------------------------------------------------
function updateHomeButtonVisibility() {
  if (isGameActive && state === GameState.WAITING && fingers.size === 0) {
    homeBtn.classList.add("visible");
    homeBtn.style.display = "flex";
  } else {
    homeBtn.classList.remove("visible");
    setTimeout(() => {
      if (!homeBtn.classList.contains("visible")) {
        homeBtn.style.display = "none";
      }
    }, 300);
  }
}

// ----------------------------------------------------
// MULTI-TOUCH GESTURE COORDINATORS
// ----------------------------------------------------
function handleTouchStart(e) {
  if (!isGameActive) return;
  if (state === GameState.ANIMATING || state === GameState.DONE) return;

  // Don't prevent default on interactive UI buttons
  if (
    e.target.closest("#restart-btn") ||
    e.target.closest("#math-btn") ||
    e.target.closest("#home-btn")
  ) {
    return;
  }

  e.preventDefault();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    const el = document.createElement("div");
    el.className = "finger";
    el.style.left = touch.clientX + "px";
    el.style.top = touch.clientY + "px";

    const currentColor = colors[colorIdx % colors.length];
    el.style.backgroundColor = currentColor;
    el.style.setProperty("--finger-color", currentColor);

    document.body.appendChild(el);
    fingers.set(touch.identifier, el);
    colorIdx++;

    // Register and start trail tracking
    addTrail(touch.identifier, touch.clientX, touch.clientY, currentColor);
  }

  playSound("pop");
  triggerVibration(50);

  checkState();
  updateHomeButtonVisibility();
}

function handleTouchMove(e) {
  if (
    !isGameActive ||
    state === GameState.ANIMATING ||
    state === GameState.DONE
  )
    return;

  if (
    e.target.closest("#restart-btn") ||
    e.target.closest("#math-btn") ||
    e.target.closest("#home-btn")
  ) {
    return;
  }

  e.preventDefault();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (fingers.has(touch.identifier)) {
      const el = fingers.get(touch.identifier);
      el.style.left = touch.clientX + "px";
      el.style.top = touch.clientY + "px";

      // Update trail path with the new finger position
      updateTrail(touch.identifier, touch.clientX, touch.clientY);
    }
  }
}

function handleTouchEnd(e) {
  if (!isGameActive) return;

  if (
    e.target.closest("#restart-btn") ||
    e.target.closest("#math-btn") ||
    e.target.closest("#home-btn")
  ) {
    return;
  }

  e.preventDefault();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (fingers.has(touch.identifier)) {
      const el = fingers.get(touch.identifier);
      if (state === GameState.WAITING || state === GameState.COUNTDOWN) {
        el.remove();
        fingers.delete(touch.identifier);
      }
    }
    // Deactivate the trail so it fades out smoothly
    deactivateTrail(touch.identifier);
  }

  if (state === GameState.WAITING || state === GameState.COUNTDOWN) {
    if (fingers.size < 2) resetGame();
  }
  updateHomeButtonVisibility();
}

// ----------------------------------------------------
// BOOTSTRAP / INITIALIZATION
// ----------------------------------------------------
export function initGame() {
  // Bind DOM References
  initDOMRefs();

  // Initialize settings module listeners
  initSettingsListeners();

  // BIND TOUCH GESTURE LISTENERS
  document.addEventListener("touchstart", handleTouchStart, { passive: false });
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", handleTouchEnd, { passive: false });
  document.addEventListener("touchcancel", handleTouchEnd, { passive: false });

  // BIND UI BUTTONS
  addTapListener(startBtn, () => {
    // Safe Fullscreen
    try {
      const docEl = document.documentElement;
      const requestFS =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFS) {
        requestFS
          .call(docEl)
          .catch((err) => console.log("Fullscreen ignored (normal on iOS)"));
      }
    } catch (error) {
      console.log("Browser does not support Fullscreen API", error);
    }

    // Unlock Audio Context
    unlockAudio();

    // Small confirmation vibration
    triggerVibration(50);

    // Visually start the game
    startScreen.style.opacity = "0";
    setTimeout(() => {
      startScreen.style.display = "none";
      isGameActive = true;
      updateHomeButtonVisibility();
    }, 300);
  });

  addTapListener(restartBtn, () => {
    resetGame();
  });

  if (mathBtn && mathModal && closeMathBtn) {
    addTapListener(mathBtn, () => {
      populateMathContent();
      mathModal.style.display = "flex";
      setTimeout(() => (mathModal.style.opacity = "1"), 10);
    });

    addTapListener(closeMathBtn, () => {
      mathModal.style.opacity = "0";
      setTimeout(() => (mathModal.style.display = "none"), 200);
    });
  }

  if (homeBtn) {
    addTapListener(homeBtn, () => {
      isGameActive = false;
      resetGame();

      startScreen.style.display = "flex";
      setTimeout(() => {
        startScreen.style.opacity = "1";
      }, 10);
    });
  }

  if (settingsBtn && settingsModal && closeSettingsBtn) {
    addTapListener(settingsBtn, () => {
      applySettingsToUI();
      settingsModal.style.display = "flex";
      setTimeout(() => (settingsModal.style.opacity = "1"), 10);
    });

    addTapListener(closeSettingsBtn, () => {
      settingsModal.style.opacity = "0";
      setTimeout(() => (settingsModal.style.display = "none"), 200);
    });
  }

  const modeButtons = document.querySelectorAll(".mode-btn");
  const teamsCountSelector = document.getElementById("teams-count-selector");

  modeButtons.forEach((btn) => {
    addTapListener(btn, () => {
      // Update active state class
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Set the game mode
      const selectedMode = btn.getAttribute("data-mode");
      if (selectedMode === "teams") {
        gameMode = GameMode.TEAMS;
        if (teamsCountSelector) {
          teamsCountSelector.style.display = "inline-flex";
          setTimeout(() => {
            teamsCountSelector.style.opacity = "1";
          }, 10);
        }
      } else {
        if (selectedMode === "order") gameMode = GameMode.ORDER;
        else gameMode = GameMode.CLASSIC;

        if (teamsCountSelector) {
          teamsCountSelector.style.opacity = "0";
          setTimeout(() => {
            teamsCountSelector.style.display = "none";
          }, 300);
        }
      }

      // Trigger a small tactile feedback
      triggerVibration(30);
    });
  });

  const teamCountButtons = document.querySelectorAll(".team-count-btn");
  teamCountButtons.forEach((btn) => {
    addTapListener(btn, () => {
      teamCountButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      triggerVibration(30);
    });
  });
}
