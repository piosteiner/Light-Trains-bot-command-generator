/* js/timer.js — sticky train countdown with sound cues, pause/resume, and overtime count-up.

   Public API (called from app.js):
     window.startTrainTimer(seconds)  — always pass an explicit duration.
     window.TIMER_DEFAULT_DURATION    — shared default (10:30) so app.js
                                         doesn't need to hardcode it twice.

   Sounds fire at: start, 10:00, 2:10, 1:10, 0:15, and 0:00 remaining.
   After 0:00 the timer keeps running and counts UP (elapsed overtime)
   instead of freezing, so you can see how long the train has been going.
   Sound mode (voice / beeps / muted) persists in localStorage. */

(function () {
  const SOUND_KEY = 'hunt-train-timer-sound';
  const VOICE_KEY = 'hunt-train-timer-voice';
  const DUR_KEY   = 'hunt-train-timer-duration';

  window.TIMER_DEFAULT_DURATION = 630; // 10:30 — single source of truth for app.js too

  /* ── State ──
     duration      total seconds for the current session (what "Reset" returns to)
     accumulatedMs frozen elapsed ms banked from previous run segments (while paused)
     runStartTs    Date.now() when the current running segment began; null if paused
     running       is the interval actively counting right now
     hasSession    has a timer ever been started (panel visible) since last close */
  let duration      = parseInt(localStorage.getItem(DUR_KEY)) || window.TIMER_DEFAULT_DURATION;
  let accumulatedMs = 0;
  let runStartTs    = null;
  let running       = false;
  let hasSession    = false;
  let interval      = null;
  let fired         = new Set();
  let voices        = []; // cached speechSynthesis voice list

  const THRESHOLDS = [
    { t: 600, say: '10 minutes',       beeps: 2, freq: 880 },
    { t: 130, say: '2 minutes 10',     beeps: 2, freq: 880 },
    { t: 70,  say: '1 minute 10',      beeps: 2, freq: 988 },
    { t: 15,  say: '15 seconds',       beeps: 3, freq: 1046 },
    { t: 0,   say: 'Train starts now', beeps: 4, freq: 1318 },
  ];

  /* ── Sound ── */
  function getSoundMode()  { return localStorage.getItem(SOUND_KEY) || 'voice'; }
  function getVoiceName()  { return localStorage.getItem(VOICE_KEY) || ''; }

  /* Voices load asynchronously in most browsers (Chrome fires 'voiceschanged'
     once they're ready; Firefox/Safari often have them immediately). We
     re-populate the dropdown whenever the list changes so it's never empty. */
  function refreshVoices() {
    try {
      voices = speechSynthesis.getVoices() || [];
    } catch { voices = []; }
    populateVoiceSelect();
  }

  function populateVoiceSelect() {
    const sel = document.getElementById('timer-voice');
    if (!sel) return;
    const saved = getVoiceName();
    const current = sel.value || saved;

    sel.innerHTML = '<option value="">Browser default</option>';
    // English voices first (most useful for train callouts), then everything else
    const sorted = [...voices].sort((a, b) => {
      const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1;
      const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1;
      if (aEn !== bEn) return aEn - bEn;
      return a.name.localeCompare(b.name);
    });
    sorted.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      sel.appendChild(opt);
    });

    // restore previous selection if it still exists in the refreshed list
    if (current && sorted.some(v => v.name === current)) sel.value = current;
    else sel.value = '';
  }

  function getSelectedVoice() {
    const name = getVoiceName();
    if (!name) return null;
    return voices.find(v => v.name === name) || null;
  }

  function speak(text) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      const v = getSelectedVoice();
      if (v) u.voice = v;
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
  /* Positive seconds -> "MM:SS". Negative (overtime) -> "+MM:SS". */
  function fmt(s) {
    const sign = s < 0 ? '+' : '';
    const abs  = Math.abs(s);
    const m  = Math.floor(abs / 60);
    const ss = abs % 60;
    return `${sign}${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
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

  /* ── Elapsed / remaining (supports pause/resume via accumulatedMs) ── */
  function elapsedMs() {
    return accumulatedMs + (running ? Date.now() - runStartTs : 0);
  }

  function remaining() {
    return duration - Math.floor(elapsedMs() / 1000);
  }

  /* ── Rendering ── */
  function updatePauseIcon() {
    const icon = document.getElementById('timer-pause-icon');
    if (!icon) return;
    icon.className = running ? 'ti ti-player-pause' : 'ti ti-player-play';
  }

  function render() {
    const el    = document.getElementById('timer-display');
    const panel = document.getElementById('timer-panel');
    if (!el || !panel) return;
    const r = remaining();
    el.textContent = fmt(r);
    panel.classList.toggle('overtime', r < 0);
    panel.classList.toggle('paused', hasSession && !running);
    updatePauseIcon();
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
    // No auto-stop at zero anymore — keep ticking so it counts upward (overtime).
  }

  /* ── Core session controls ── */

  /* Start a brand-new countdown at the given duration (seconds).
     Always call with an explicit value — this never reads stale UI state. */
  window.startTrainTimer = function (seconds) {
    const panel = document.getElementById('timer-panel');
    if (!panel) return;

    duration = (typeof seconds === 'number' && seconds > 0) ? seconds : window.TIMER_DEFAULT_DURATION;
    localStorage.setItem(DUR_KEY, String(duration));

    accumulatedMs = 0;
    runStartTs    = Date.now();
    running       = true;
    hasSession    = true;
    fired         = new Set();
    // Skip cue thresholds at or above the starting duration (e.g. a 5-min
    // timer never reaches "10 minutes remaining", so don't wait to fire it).
    THRESHOLDS.forEach(th => { if (th.t >= duration) fired.add(th.t); });

    panel.style.display = 'block';
    panel.classList.remove('overtime', 'paused');

    const m = Math.floor(duration / 60);
    const s = duration % 60;
    playCue(`Start: ${m} minutes${s ? ' ' + s : ''}`, 1, 660);

    if (interval) clearInterval(interval);
    render();
    interval = setInterval(tick, 250);
  };

  function pauseTimer() {
    if (!hasSession || !running) return;
    accumulatedMs += Date.now() - runStartTs;
    runStartTs = null;
    running = false;
    if (interval) { clearInterval(interval); interval = null; }
    render();
  }

  function resumeTimer() {
    if (!hasSession || running) return;
    runStartTs = Date.now();
    running = true;
    if (interval) clearInterval(interval);
    interval = setInterval(tick, 250);
    render();
  }

  function togglePause() {
    if (!hasSession) return;
    if (running) pauseTimer(); else resumeTimer();
  }

  /* Reset back to the full duration and STOP — does not auto-resume.
     (Distinct from Apply/startTrainTimer, which both set AND start.) */
  function resetTimer() {
    if (!hasSession) return;
    if (interval) { clearInterval(interval); interval = null; }
    accumulatedMs = 0;
    runStartTs    = null;
    running       = false;
    fired         = new Set();
    THRESHOLDS.forEach(th => { if (th.t >= duration) fired.add(th.t); });
    const panel = document.getElementById('timer-panel');
    panel?.classList.remove('overtime');
    render();
  }

  function closeTimer() {
    if (interval) clearInterval(interval);
    interval      = null;
    running       = false;
    hasSession    = false;
    accumulatedMs = 0;
    runStartTs    = null;
    const panel = document.getElementById('timer-panel');
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('overtime', 'paused');
    }
    try { speechSynthesis.cancel(); } catch {}
  }

  /* Show the panel in an idle, silent, not-running state at page load —
     ready to display a countdown but not actually counting until the user
     presses Pause/Resume, hits Apply, or copies a main command. This is the
     only place the panel appears without an explicit start; closeTimer()
     hides it again and it then only reappears via a copy action. */
  function initIdlePanel() {
    const panel = document.getElementById('timer-panel');
    if (!panel) return;
    accumulatedMs = 0;
    runStartTs    = null;
    running       = false;
    hasSession    = true;
    fired         = new Set();
    THRESHOLDS.forEach(th => { if (th.t >= duration) fired.add(th.t); });
    panel.style.display = 'block';
    panel.classList.remove('overtime');
    render();
  }

  /* ── Wire up controls ── */
  document.addEventListener('DOMContentLoaded', () => {
    const setInput  = document.getElementById('timer-set');
    const soundSel  = document.getElementById('timer-sound');
    const voiceSel  = document.getElementById('timer-voice');
    const voiceRow  = document.getElementById('timer-voice-row');

    if (setInput) setInput.value = fmt(duration);

    function syncVoiceRowVisibility() {
      if (voiceRow) voiceRow.style.display = (soundSel?.value === 'voice') ? 'flex' : 'none';
    }

    if (soundSel) {
      soundSel.value = getSoundMode();
      syncVoiceRowVisibility();
      soundSel.addEventListener('change', () => {
        localStorage.setItem(SOUND_KEY, soundSel.value);
        syncVoiceRowVisibility();
      });
    }

    if (voiceSel) {
      voiceSel.addEventListener('change', () => {
        localStorage.setItem(VOICE_KEY, voiceSel.value);
      });
    }

    // Populate voices now (some browsers have them immediately) and again
    // once the async 'voiceschanged' event fires (Chrome typically needs this).
    refreshVoices();
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = refreshVoices;
    }

    // Apply = set a custom duration AND start fresh from it.
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

    document.getElementById('timer-pause')?.addEventListener('click', togglePause);
    document.getElementById('timer-reset')?.addEventListener('click', resetTimer);
    document.getElementById('timer-close')?.addEventListener('click', closeTimer);
    document.getElementById('timer-test')?.addEventListener('click', () => {
      playCue('Sound test: train starts now', 2, 880);
    });

    initIdlePanel();
  });
})();