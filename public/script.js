// --- AUDIO ENGINE AND VIBRATION ---
let audioCtx;
let audioUnlocked = false;

function playSound(type) {
  if (!audioCtx) return; // Sicurezza nel caso non sia ancora sbloccato
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "pop") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === "tic") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } else if (type === "win") {
    osc.type = "square";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }
}

// Cryptographically Secure Random Generator
function getSecureRandomIndex(max) {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);
  const randomFloat = randomBuffer[0] / (0xffffffff + 1);
  return Math.floor(randomFloat * max);
}

// GLOBAL VARIABLES
// const colors = [
//   "#FF3B30",
//   "#34C759",
//   "#007AFF",
//   "#FFCC00",
//   "#AF52DE",
//   "#FF9500",
//   "#32ADE6",
//   "#FF2D55",
// ];

// Color mana MTG
const colors = [
  "#F9FAF8", // Bianco
  "#0E68AB", // Blu
  "#A64DFF", // Nero (Viola magico per visibilità)
  "#D3202A", // Rosso
  "#00733E", // Verde
  "#9CA3AF", // Incolore/Artefatto (Argento/Grigio elegante)
  "#F6C644", // Multicolore (Oro)
];

let colorIdx = 0;
let fingers = new Map();
let state = "WAITING";
let countdownInterval;
let timeLeft = 5;
let isGameActive = false; // NUOVO: Blocca i tocchi finché non premi INIZIA

const msg = document.getElementById("message");
const restartBtn = document.getElementById("restart-btn");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");

// NUOVO: GESTIONE PULSANTE INIZIA (A prova di bomba)
startBtn.addEventListener(
  "touchstart",
  (e) => {
    e.stopPropagation(); // Evita che il tocco finisca sullo sfondo
    e.preventDefault(); // Evita il doppio click fantasma

    // 1. Fullscreen Sicuro (dentro un try-catch per non far mai crashare l'app)
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
          .catch((err) => console.log("Fullscreen ignorato (normale su iOS)"));
      }
    } catch (error) {
      console.log("Il browser non supporta questa API", error);
    }

    // 2. Sblocca Motore Audio
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();

    if (!audioUnlocked) {
      const dummyOsc = audioCtx.createOscillator();
      const dummyGain = audioCtx.createGain();
      dummyGain.gain.value = 0;
      dummyOsc.connect(dummyGain);
      dummyGain.connect(audioCtx.destination);
      dummyOsc.start();
      dummyOsc.stop(audioCtx.currentTime + 0.001);
      audioUnlocked = true;
    }

    // 3. Piccola vibrazione di conferma
    if (navigator.vibrate) navigator.vibrate(50);

    // 4. Avvia visivamente il gioco
    startScreen.style.opacity = "0"; // Dissolvenza
    setTimeout(() => {
      startScreen.style.display = "none";
      isGameActive = true; // Da ora in poi, lo schermo reagisce alle dita
    }, 300);
  },
  { passive: false },
);

// RESTART BUTTON HANDLER
restartBtn.addEventListener(
  "touchstart",
  (e) => {
    e.stopPropagation();
    e.preventDefault();
    resetGame();
  },
  { passive: false },
);

// TOUCH HANDLER PRINCIPALE
document.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

    // Se la schermata iniziale è ancora visibile, ignora i tocchi sul resto dello schermo
    if (!isGameActive) return;
    if (state === "ANIMATING" || state === "DONE") return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      const el = document.createElement("div");
      el.className = "finger";
      el.style.left = touch.clientX + "px";
      el.style.top = touch.clientY + "px";

      const currentColor = colors[colorIdx % colors.length];
      el.style.backgroundColor = currentColor;
      el.style.color = currentColor;

      document.body.appendChild(el);
      fingers.set(touch.identifier, el);
      colorIdx++;
    }

    playSound("pop");
    if (navigator.vibrate) navigator.vibrate(50);

    checkState();
  },
  { passive: false },
);

// MOVEMENT HANDLER
document.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (!isGameActive || state === "ANIMATING" || state === "DONE") return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (fingers.has(touch.identifier)) {
        const el = fingers.get(touch.identifier);
        el.style.left = touch.clientX + "px";
        el.style.top = touch.clientY + "px";
      }
    }
  },
  { passive: false },
);

// FINGER REMOVAL HANDLER
const removeFinger = (e) => {
  e.preventDefault();
  if (!isGameActive) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (fingers.has(touch.identifier)) {
      const el = fingers.get(touch.identifier);
      if (state === "WAITING" || state === "COUNTDOWN") {
        el.remove();
      }
      fingers.delete(touch.identifier);
    }
  }

  if (state === "WAITING" || state === "COUNTDOWN") {
    if (fingers.size < 2) resetGame();
  }
};

document.addEventListener("touchend", removeFinger, { passive: false });
document.addEventListener("touchcancel", removeFinger, { passive: false });

// STATE CHECK
function checkState() {
  if (fingers.size > 1 && state === "WAITING") {
    state = "COUNTDOWN";
    timeLeft = 5;
    msg.innerText = timeLeft;

    countdownInterval = setInterval(() => {
      timeLeft--;
      playSound("tic");
      if (navigator.vibrate) navigator.vibrate(20);

      if (timeLeft > 0) {
        msg.innerText = timeLeft;
      } else {
        clearInterval(countdownInterval);
        startSelection();
      }
    }, 1000);
  }
}

// WINNER SELECTION
function startSelection() {
  state = "ANIMATING";
  msg.innerText = "State boni...";

  let fingerArray = Array.from(document.querySelectorAll(".finger"));
  fingerArray.forEach((el) => el.classList.add("pulsing"));

  setTimeout(() => {
    state = "DONE";
    const winnerIndex = getSecureRandomIndex(fingerArray.length);

    fingerArray.forEach((el, index) => {
      el.classList.remove("pulsing");
      if (index === winnerIndex) {
        el.classList.add("winner");
        msg.innerText = "PRIMO DI TURNO!";
        playSound("win");
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        restartBtn.style.display = "inline-flex";
      } else {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 500);
      }
    });
  }, 2000);
}

// FULL RESET
function resetGame() {
  clearInterval(countdownInterval);
  state = "WAITING";
  restartBtn.style.display = "none";
  document.querySelectorAll(".finger").forEach((el) => el.remove());
  fingers.clear();
  msg.innerText = "Piazzate le dita";
}
