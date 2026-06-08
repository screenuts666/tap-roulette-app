export let lastMathLog = {};

export function getSecureRandomIndex(max) {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);

  const raw = randomBuffer[0];
  const maxUint32 = 0xffffffff + 1;
  const randomFloat = raw / maxUint32;
  const index = Math.floor(randomFloat * max);

  // Save math logs for the terminal flex
  lastMathLog.raw = raw;
  lastMathLog.maxUint32 = maxUint32;
  lastMathLog.float = randomFloat;
  lastMathLog.max = max;
  lastMathLog.index = index;

  return index;
}

export function populateMathContent() {
  const mathContent = document.getElementById("math-content");
  if (!mathContent) return;

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
}
