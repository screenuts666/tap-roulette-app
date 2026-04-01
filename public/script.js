// --- AUDIO ENGINE AND VIBRATION ---
let audioCtx;
let audioUnlocked = false;

function playSound(type) {
  if (!audioCtx) return;
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

// Cryptographically Secure Random Generator (Now saves proof!)
function getSecureRandomIndex(max) {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);

  const raw = randomBuffer[0];
  const maxUint32 = 0xffffffff + 1;
  const randomFloat = raw / maxUint32;
  const index = Math.floor(randomFloat * max);

  // Save math logs for the terminal flex
  lastMathLog = { raw, maxUint32, float: randomFloat, max, index };

  return index;
}

// GLOBAL VARIABLES
const colors = [
  "#F9FAF8", // White
  "#0E68AB", // Blue
  "#A64DFF", // Black (Magic Purple for visibility)
  "#D3202A", // Red
  "#00733E", // Green
  "#9CA3AF", // Colorless/Artifact (Elegant Silver/Gray)
  "#F6C644", // Multicolor (Gold)
];

let colorIdx = 0;
let fingers = new Map();
let state = "WAITING";
let countdownInterval;
let timeLeft = 5;
let isGameActive = false;
let lastMathLog = {}; // Stores the last random generation data

const msg = document.getElementById("message");
const restartBtn = document.getElementById("restart-btn");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");

// Terminal Math Elements
const mathBtn = document.getElementById("math-btn");
const mathModal = document.getElementById("math-modal");
const mathContent = document.getElementById("math-content");
const closeMathBtn = document.getElementById("close-math-btn");

// START BUTTON HANDLER
startBtn.addEventListener(
  "touchstart",
  (e) => {
    e.stopPropagation();
    e.preventDefault();

    // 1. Safe Fullscreen
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

    // 2. Unlock Audio Engine
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

    // 3. Small confirmation vibration
    if (navigator.vibrate) navigator.vibrate(50);

    // 4. Visually start the game
    startScreen.style.opacity = "0";
    setTimeout(() => {
      startScreen.style.display = "none";
      isGameActive = true;
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

// MAIN TOUCH HANDLER
document.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

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
  msg.innerText = "Selecting...";

  let fingerArray = Array.from(document.querySelectorAll(".finger"));
  fingerArray.forEach((el) => el.classList.add("pulsing"));

  setTimeout(() => {
    state = "DONE";
    const winnerIndex = getSecureRandomIndex(fingerArray.length);

    fingerArray.forEach((el, index) => {
      el.classList.remove("pulsing");
      if (index === winnerIndex) {
        el.classList.add("winner");
        msg.innerText = "YOU GO FIRST!";
        playSound("win");
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

        // Show restart and math flex buttons
        restartBtn.style.display = "inline-flex";
        if (mathBtn) mathBtn.style.display = "block";
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

  // Hide buttons
  restartBtn.style.display = "none";
  if (mathBtn) mathBtn.style.display = "none";

  document.querySelectorAll(".finger").forEach((el) => el.remove());
  fingers.clear();
  msg.innerText = "Place your fingers";
}

// --- TERMINAL MATH FLEX LOGIC ---
if (mathBtn && mathModal && closeMathBtn) {
  mathBtn.addEventListener(
    "touchstart",
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Build the super nerdy terminal output
      mathContent.innerHTML = `
      > FETCHING HARDWARE NOISE...<br>
      > Uint32Array generated:<br>
      > [<span class="highlight">${lastMathLog.raw}</span>]<br>
      <br>
      > NORMALIZING FLOAT:<br>
      > ${lastMathLog.raw} / ${lastMathLog.maxUint32}<br>
      > = <span class="highlight">${lastMathLog.float.toFixed(8)}...</span><br>
      <br>
      > MULTIPLYING BY PLAYERS (${lastMathLog.max}):<br>
      > Result: ${(lastMathLog.float * lastMathLog.max).toFixed(6)}<br>
      <br>
      > FLOORING VALUE:<br>
      > WINNER INDEX = <span class="highlight">${lastMathLog.index}</span><br>
      <br>
      > STATUS: <span style="color:#34C759">CRYPTOGRAPHICALLY FAIR</span>
    `;

      mathModal.style.display = "flex";
      setTimeout(() => (mathModal.style.opacity = "1"), 10);
    },
    { passive: false },
  );

  closeMathBtn.addEventListener(
    "touchstart",
    (e) => {
      e.stopPropagation();
      e.preventDefault();

      mathModal.style.opacity = "0";
      setTimeout(() => (mathModal.style.display = "none"), 200);
    },
    { passive: false },
  );
}
