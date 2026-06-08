import { triggerVibration } from './audio.js';

export const SettingsKeys = {
  SOUND: "tr_settings_sound",
  VIBRATION: "tr_settings_vibration",
  COUNTDOWN: "tr_settings_countdown",
  AUDIO_THEME: "tr_settings_audiotheme"
};

export const AudioThemes = {
  MINIMAL: "minimal",
  RETRO: "retro",
  SCIFI: "scifi"
};

export const settings = {
  sound: true,
  vibration: true,
  countdown: 5,
  audioTheme: AudioThemes.MINIMAL
};

export function loadSettings() {
  const savedSound = localStorage.getItem(SettingsKeys.SOUND);
  const savedVibe = localStorage.getItem(SettingsKeys.VIBRATION);
  const savedCountdown = localStorage.getItem(SettingsKeys.COUNTDOWN);
  const savedAudioTheme = localStorage.getItem(SettingsKeys.AUDIO_THEME);
  
  if (savedSound !== null) settings.sound = savedSound === "true";
  if (savedVibe !== null) settings.vibration = savedVibe === "true";
  if (savedCountdown !== null) settings.countdown = parseInt(savedCountdown, 10);
  if (savedAudioTheme !== null) settings.audioTheme = savedAudioTheme;
}

export function saveSettings() {
  localStorage.setItem(SettingsKeys.SOUND, settings.sound);
  localStorage.setItem(SettingsKeys.VIBRATION, settings.vibration);
  localStorage.setItem(SettingsKeys.COUNTDOWN, settings.countdown);
  localStorage.setItem(SettingsKeys.AUDIO_THEME, settings.audioTheme);
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
  
  const activeRadio = document.querySelector(`input[name="audio-theme"][value="${settings.audioTheme}"]`);
  if (activeRadio) activeRadio.checked = true;
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

  // Bind radio buttons list
  const themeRadios = document.querySelectorAll(`input[name="audio-theme"]`);
  themeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      settings.audioTheme = e.target.value;
      saveSettings();
    });
  });
}
