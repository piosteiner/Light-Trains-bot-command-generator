/* js/timer.js — sticky train countdown with sound cues
   Starts automatically when the main .sh command is copied.
   Sounds: at start, 10:00, 2:10, 1:10, 0:15, and 0:00.
   Sound mode (voice / beeps / muted) persists in localStorage. */

(function () {
  const SOUND_KEY = 'hunt-train-timer-sound';
  const DUR_KEY   = 'hunt-train-timer-duration';
  const DEFAULT_DURATION = 630; // 10:30

  let endTime  = null;
  let interval = null;
  let duration = parseInt(localStorage.getItem(DUR_KEY)) || DEFAULT_DURATION;
  let fired    = new Set();

  const THRESHOLDS = [
    { t: 600, say: '10 minutes',       beeps: 2, freq: 880 },
    { t: 130, say: '2 minutes 10',     beeps: 2, freq: 880 },
    { t: 70,  say: '1 minute 10',      beeps: 2, freq: 988 },
    { t: 15,  say: '15 seconds',       beeps: 3, freq: 1046 },
    { t: 0,   say: 'Train starts now', beeps: 4, freq: 1318 },
  ];

  /* ── Sound ── */
  function getSoundMode() { return localStorage.getItem(SOUND_KEY) || 'voice'; }

  function speak(text) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      speechSynthesis.speak(u);
    } catch { /* unsupported browser — silent */ }
  }

  function beep(times = 1, freq = 880) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < times; i++) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        const t0 = ctx.currentTime + i * 0.3;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
        osc.start(t0);
        osc.stop(t0 + 0.26);
      }
    } catch { /* silent */ }
  }

  function playCue(say, beeps, freq) {
    const mode = getSoundMode();
    if (mode === 'mute') return;
    if (mode === 'voice') speak(say);
    else beep(beeps, freq);
  }

  /* ── Time formatting / parsing ── */
  function fmt(s) {
    const m  = Math.floor(Math.max(0, s) / 60);
    const ss = Math.max(0, s) % 60;
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  /* Accepts "10:30", "10.30", "630" (seconds), or "10" (minutes) */
  function parseDuration(text) {
    text = (text || '').trim();
    if (!text) return null;
    const colonMatch = text.match(/^(\d{1,3})[:.](\d{1,2})$/);
    if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
    const n = parseInt(text);
    if (isNaN(n)) return null;
    return n <= 60 ? n * 60 : n; // small numbers treated as minutes
  }

  function remaining() {
    return endTime ? Math.round((endTime - Date.now()) / 1000) : 0;
  }

  /* ── Rendering ── */
  function render() {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = fmt(remaining());
  }

  function tick() {
    const r = remaining();
    THRESHOLDS.forEach(th => {
      if (r <= th.t && !fired.has(th.t)) {
        fired.add(th.t);
        playCue(th.say, th.beeps, th.freq);
      }
    });
    render();
    if (r <= 0) {
      clearInterval(interval);
      interval = null;
      document.getElementById('timer-panel')?.classList.add('finished');
    }
  }

  /* ── Public controls ── */
  window.startTrainTimer = function (seconds) {
    const panel = document.getElementById('timer-panel');
    if (!panel) return;

    duration = seconds
      || parseDuration(document.getElementById('timer-set')?.value)
      || duration
      || DEFAULT_DURATION;
    localStorage.setItem(DUR_KEY, String(duration));

    endTime = Date.now() + duration * 1000;
    fired = new Set();
    // Skip thresholds at or above the starting duration
    THRESHOLDS.forEach(th => { if (th.t >= duration) fired.add(th.t); });

    panel.style.display = 'block';
    panel.classList.remove('finished');

    const m = Math.floor(duration / 60);
    const s = duration % 60;
    playCue(`Start: ${m} minutes${s ? ' ' + s : ''}`, 1, 660);

    if (interval) clearInterval(interval);
    render();
    interval = setInterval(tick, 250);
  };

  function resetTimer()  { window.startTrainTimer(duration); }
  function cancelTimer() {
    if (interval) clearInterval(interval);
    interval = null;
    endTime  = null;
    const panel = document.getElementById('timer-panel');
    if (panel) { panel.style.display = 'none'; panel.classList.remove('finished'); }
    try { speechSynthesis.cancel(); } catch {}
  }

  /* ── Wire up controls ── */
  document.addEventListener('DOMContentLoaded', () => {
    const setInput  = document.getElementById('timer-set');
    const soundSel  = document.getElementById('timer-sound');

    if (setInput) setInput.value = fmt(duration);
    if (soundSel) {
      soundSel.value = getSoundMode();
      soundSel.addEventListener('change', () => {
        localStorage.setItem(SOUND_KEY, soundSel.value);
      });
    }

    document.getElementById('timer-apply')?.addEventListener('click', () => {
      const secs = parseDuration(setInput?.value);
      if (secs) window.startTrainTimer(secs);
    });
    setInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const secs = parseDuration(setInput.value);
        if (secs) window.startTrainTimer(secs);
      }
    });

    document.getElementById('timer-reset')?.addEventListener('click', resetTimer);
    document.getElementById('timer-close')?.addEventListener('click', cancelTimer);
    document.getElementById('timer-test')?.addEventListener('click', () => {
      playCue('Sound test: train starts now', 2, 880);
    });
  });
})();
