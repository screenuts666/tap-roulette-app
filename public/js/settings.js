import { triggerVibration } from './audio.js';

export const settings = {
  sound: true,
  vibration: true,
  countdown: 5
};

export function loadSettings() {
  const savedSound = localStorage.getItem("tr_settings_sound");
  const savedVibe = localStorage.getItem("tr_settings_vibration");
  const savedCountdown = localStorage.getItem("tr_settings_countdown");
  
  if (savedSound !== null) settings.sound = savedSound === "true";
  if (savedVibe !== null) settings.vibration = savedVibe === "true";
  if (savedCountdown !== null) settings.countdown = parseInt(savedCountdown, 10);
}

export function saveSettings() {
  localStorage.setItem("tr_settings_sound", settings.sound);
  localStorage.setItem("tr_settings_vibration", settings.vibration);
  localStorage.setItem("tr_settings_countdown", settings.countdown);
}

export function applySettingsToUI() {
  const soundToggle = document.getElementById("sound-toggle");
  const vibrateToggle = document.getElementById("vibrate-toggle");
  const timerSlider = document.getElementById("timer-slider");
  const timerVal = document.getElementById("timer-val");
  
  if (soundToggle) soundToggle.checked = settings.sound;
  if (vibrateToggle) vibrateToggle.checked = settings.vibration;
  if (timerSlider) timerSlider.value = settings.countdown;
  if (timerVal) timerVal.innerText = settings.countdown + "s";
}

// Initialize settings listeners
export function initSettingsListeners() {
  const soundToggle = document.getElementById("sound-toggle");
  const vibrateToggle = document.getElementById("vibrate-toggle");
  const timerSlider = document.getElementById("timer-slider");
  const timerVal = document.getElementById("timer-val");

  if (soundToggle) {
    soundToggle.addEventListener("change", (e) => {
      settings.sound = e.target.checked;
      saveSettings();
    });
  }

  if (vibrateToggle) {
    vibrateToggle.addEventListener("change", (e) => {
      settings.vibration = e.target.checked;
      saveSettings();
      if (settings.vibration) {
        triggerVibration(50);
      }
    });
  }

  if (timerSlider && timerVal) {
    timerSlider.addEventListener("input", (e) => {
      settings.countdown = parseInt(e.target.value, 10);
      timerVal.innerText = settings.countdown + "s";
      saveSettings();
    });
  }
}
