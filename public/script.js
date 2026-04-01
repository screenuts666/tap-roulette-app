// --- MOTORE AUDIO E VIBRAZIONE ---
let audioCtx;
let audioUnlocked = false; // Aggiungiamo una variabile per tracciare lo sblocco

function playSound(type) {
  // 1. Inizializza il contesto se non esiste
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // 2. Risveglia l'audio se il browser lo ha messo in pausa
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  // 3. IL TRUCCO: Al primissimo tocco, spariamo un suono muto per sbloccare iOS/Android
  if (!audioUnlocked) {
    const dummyOsc = audioCtx.createOscillator();
    const dummyGain = audioCtx.createGain();
    dummyGain.gain.value = 0; // Volume a ZERO
    dummyOsc.connect(dummyGain);
    dummyGain.connect(audioCtx.destination);
    dummyOsc.start();
    dummyOsc.stop(audioCtx.currentTime + 0.001);
    audioUnlocked = true;
  }

  // 4. Creazione del suono reale
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

// Generatore Crittograficamente Sicuro basato su Entropia Hardware
function getSecureRandomIndex(max) {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);
  const randomFloat = randomBuffer[0] / (0xffffffff + 1);
  return Math.floor(randomFloat * max);
}

// VARIABILI GLOBALI
const colors = [
  "#FF3B30",
  "#34C759",
  "#007AFF",
  "#FFCC00",
  "#AF52DE",
  "#FF9500",
  "#32ADE6",
  "#FF2D55",
];
let colorIdx = 0;
let fingers = new Map();
let state = "WAITING";
let countdownInterval;
let timeLeft = 5;
const msg = document.getElementById("message");
const restartBtn = document.getElementById("restart-btn");

// GESTIONE PULSANTE RESTART
restartBtn.addEventListener(
  "touchstart",
  (e) => {
    e.stopPropagation(); // Evita che premere il tasto crei un nuovo pallino
    e.preventDefault();
    resetGame();
  },
  { passive: false },
);

// GESTIONE TOCCHI
document.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        console.log("Fullscreen ignorato");
      });
    }

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

    // Audio e vibrazione al tocco
    playSound("pop");
    if (navigator.vibrate) navigator.vibrate(50);

    checkState();
  },
  { passive: false },
);

// GESTIONE MOVIMENTO
document.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (state === "ANIMATING" || state === "DONE") return;

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

// GESTIONE RIMOZIONE DITA
const removeFinger = (e) => {
  e.preventDefault();

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
  // Se state === 'DONE', ora non facciamo più nulla in automatico, aspettiamo il tasto!
};

document.addEventListener("touchend", removeFinger, { passive: false });
document.addEventListener("touchcancel", removeFinger, { passive: false });

// CONTROLLO STATO
function checkState() {
  if (fingers.size > 1 && state === "WAITING") {
    state = "COUNTDOWN";
    timeLeft = 5;
    msg.innerText = timeLeft;

    countdownInterval = setInterval(() => {
      timeLeft--;

      // Audio e vibrazione per il timer
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

// ESTRAZIONE VINCITORE
function startSelection() {
  state = "ANIMATING";
  msg.innerText = "Fermi tutti...";

  let fingerArray = Array.from(document.querySelectorAll(".finger"));
  fingerArray.forEach((el) => el.classList.add("pulsing"));

  setTimeout(() => {
    state = "DONE";
    const winnerIndex = getSecureRandomIndex(fingerArray.length);

    fingerArray.forEach((el, index) => {
      el.classList.remove("pulsing");
      if (index === winnerIndex) {
        el.classList.add("winner");
        msg.innerText = "INIZI TU!";

        // Audio vittoria e vibrazione tripla!
        playSound("win");
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

        // Mostra il pulsante di riavvio
        restartBtn.style.display = "inline-flex";
      } else {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 500);
      }
    });
  }, 2000);
}

// RESET TOTALE
function resetGame() {
  clearInterval(countdownInterval);
  state = "WAITING";

  // Nascondi il pulsante di riavvio
  restartBtn.style.display = "none";

  document.querySelectorAll(".finger").forEach((el) => el.remove());
  fingers.clear();

  msg.innerText = "Tocca lo schermo!";
}
