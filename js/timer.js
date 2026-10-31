/* js/timer.js — one countdown per train tab, with sound cues, pause/resume
   and overtime count-up, docked bottom-right.

   Public API (window.TrainTimers, called from app.js):
     start(id, seconds, label, spoken)  start or restart that train's countdown
     setCurrent(id, label, spoken)      the train on screen: the panel's manual
                                        start acts on it and its card is
                                        highlighted; also renames its card
     remove(id)                         drop a train's timer (its tab closed)
     prune(ids)                         drop timers of trains not in ids
     status(id)                         { text, state } or null; state is
                                        'running' | 'paused' | 'overtime'
   Events on document:
     'traintimers:tick'  after every repaint (app.js updates the tab badges)
     'traintimers:open'  detail = train id; a timer card's name was clicked
   window.TIMER_DEFAULT_DURATION — shared default (10:30).

   Sounds fire at: start, 10:00, 2:10, 1:10, 0:15, and 0:00 remaining. While
   several timers exist, each cue starts with its train's name. After 0:00 a
   timer keeps running and counts UP (overtime) until dismissed. Running
   timers are saved, so they survive a reload. */

(function () {
  const SOUND_KEY  = 'hunt-train-timer-sound';
  const VOICE_KEY  = 'hunt-train-timer-voice';
  const DUR_KEY    = 'hunt-train-timer-duration';
  const TIMERS_KEY = 'hunt-train-timers-v1';

  window.TIMER_DEFAULT_DURATION = 630; // 10:30 — single source of truth for app.js too

  const THRESHOLDS = [
    { t: 600, say: '10 minutes',       beeps: 2, freq: 880 },
    { t: 130, say: '2 minutes 10',     beeps: 2, freq: 880 },
    { t: 70,  say: '1 minute 10',      beeps: 2, freq: 988 },
    { t: 15,  say: '15 seconds',       beeps: 3, freq: 1046 },
    { t: 0,   say: 'Train starts now', beeps: 4, freq: 1318 },
  ];

  /* ── State ──
     timers: train id → {
       id, label, spoken  which train, its card name, its name in spoken cues
       duration           total seconds (what Reset returns to)
       accumulatedMs      elapsed ms banked from earlier run segments (while paused)
       runStartTs         Date.now() when the current running segment began; null if paused
       running            counting right now
       fired              thresholds already announced }
     Map order = card order (a restart keeps its place). */
  const timers  = new Map();
  let current   = { id: null, label: '', spoken: '' };
  let interval  = null;
  let voices    = []; // cached speechSynthesis voice list

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
    const selected = sel.value || saved;

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
    if (selected && sorted.some(v => v.name === selected)) sel.value = selected;
    else sel.value = '';
  }

  function getSelectedVoice() {
    const name = getVoiceName();
    if (!name) return null;
    return voices.find(v => v.name === name) || null;
  }

  /* Cues are queued, not cancelled, so two trains announcing in the same
     second are both heard. */
  function speak(text) {
    try {
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

  /* A timer's cue; names the train while more than one timer exists. */
  function cue(t, say, beeps, freq) {
    const prefix = timers.size > 1 && t.spoken ? `${t.spoken}: ` : '';
    playCue(prefix + say, beeps, freq);
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
  function elapsedMs(t) {
    return t.accumulatedMs + (t.running ? Date.now() - t.runStartTs : 0);
  }

  function remaining(t) {
    return t.duration - Math.floor(elapsedMs(t) / 1000);
  }

  /* Thresholds a timer must not announce: those at or above its starting
     duration (a 5-min timer never says "10 minutes"), and those already
     passed (after a reload). */
  function initialFired(t) {
    const r = remaining(t);
    return new Set(THRESHOLDS.filter(th => th.t >= t.duration || th.t > r).map(th => th.t));
  }

  function stateOf(t) {
    if (remaining(t) < 0) return 'overtime';
    return t.running ? 'running' : 'paused';
  }

  /* ── Persistence ── */
  function persist() {
    try {
      localStorage.setItem(TIMERS_KEY, JSON.stringify([...timers.values()].map(t => ({
        id: t.id, label: t.label, spoken: t.spoken, duration: t.duration,
        accumulatedMs: t.accumulatedMs, runStartTs: t.runStartTs, running: t.running,
      }))));
    } catch {}
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(TIMERS_KEY));
      if (!Array.isArray(saved)) return;
      saved.forEach(s => {
        if (!s?.id || !(s.duration > 0)) return;
        const t = {
          id: String(s.id), label: String(s.label || ''), spoken: String(s.spoken || ''),
          duration: s.duration, accumulatedMs: s.accumulatedMs || 0,
          runStartTs: s.running ? s.runStartTs : null, running: !!s.running && s.runStartTs > 0,
        };
        t.fired = initialFired(t);
        timers.set(t.id, t);
      });
    } catch {}
  }

  /* ── Rendering ── */
  /* Rebuild the cards; called when timers are added, removed or renamed. */
  function renderCards() {
    const list = document.getElementById('timer-list');
    if (!list) return;
    list.innerHTML = '';
    timers.forEach(t => {
      const card = document.createElement('div');
      card.className = 'timer-card';
      card.dataset.id = t.id;
      card.innerHTML = `
        <div class="timer-head">
          <i class="ti ti-alarm"></i>
          <button type="button" class="timer-name" data-act="open" title="Show this train"></button>
          <button type="button" class="timer-icon" data-act="pause" title="Pause / resume"><i class="ti ti-player-pause"></i></button>
          <button type="button" class="timer-icon" data-act="reset" title="Reset to full time (does not start)"><i class="ti ti-refresh"></i></button>
          <button type="button" class="timer-icon timer-dismiss" data-act="close" title="Stop and dismiss"><i class="ti ti-x"></i></button>
        </div>
        <div class="timer-display"></div>`;
      const name = card.querySelector('.timer-name');
      name.textContent = t.label || 'Train';
      name.title = `Show ${t.label || 'this train'}`;
      list.appendChild(card);
    });
    paint();
  }

  /* Update times, states and the current-train highlight. */
  function paint() {
    document.querySelectorAll('#timer-list .timer-card').forEach(card => {
      const t = timers.get(card.dataset.id);
      if (!t) return;
      const state = stateOf(t);
      card.querySelector('.timer-display').textContent = fmt(remaining(t));
      card.classList.toggle('overtime', state === 'overtime');
      card.classList.toggle('paused', !t.running);
      card.classList.toggle('current', t.id === current.id);
      card.querySelector('[data-act="pause"] i').className = t.running ? 'ti ti-player-pause' : 'ti ti-player-play';
    });
    document.dispatchEvent(new CustomEvent('traintimers:tick'));
  }

  function tick() {
    timers.forEach(t => {
      if (!t.running) return;
      const r = remaining(t);
      THRESHOLDS.forEach(th => {
        if (r <= th.t && !t.fired.has(th.t)) {
          t.fired.add(th.t);
          cue(t, th.say, th.beeps, th.freq);
        }
      });
    });
    paint();
  }

  /* One shared interval, running only while some timer counts. */
  function syncInterval() {
    const anyRunning = [...timers.values()].some(t => t.running);
    if (anyRunning && !interval) interval = setInterval(tick, 250);
    if (!anyRunning && interval) { clearInterval(interval); interval = null; }
  }

  function changed() {
    persist();
    syncInterval();
    renderCards();
  }

  /* ── Timer controls ── */

  /* Start (or restart) a train's countdown at the given duration (seconds). */
  function start(id, seconds, label, spoken) {
    if (!id) return;
    const duration = (typeof seconds === 'number' && seconds > 0) ? seconds : window.TIMER_DEFAULT_DURATION;
    localStorage.setItem(DUR_KEY, String(duration));
    const t = { id, label: label || '', spoken: spoken || '', duration,
                accumulatedMs: 0, runStartTs: Date.now(), running: true };
    t.fired = initialFired(t);
    timers.set(id, t);
    document.getElementById('timer-panel').style.display = '';

    const m = Math.floor(duration / 60);
    const s = duration % 60;
    cue(t, `Start: ${m} minutes${s ? ' ' + s : ''}`, 1, 660);
    changed();
  }

  function togglePause(t) {
    if (t.running) {
      t.accumulatedMs += Date.now() - t.runStartTs;
      t.runStartTs = null;
      t.running = false;
    } else {
      t.runStartTs = Date.now();
      t.running = true;
    }
    changed();
  }

  /* Back to the full duration and STOPPED — does not auto-resume. */
  function reset(t) {
    t.accumulatedMs = 0;
    t.runStartTs    = null;
    t.running       = false;
    t.fired         = initialFired(t);
    changed();
  }

  function remove(id) {
    if (!timers.delete(id)) return;
    if (!timers.size) { try { speechSynthesis.cancel(); } catch {} }
    changed();
  }

  function setCurrent(id, label, spoken) {
    current = { id, label: label || '', spoken: spoken || '' };
    const title = document.getElementById('timer-title');
    if (title) title.textContent = current.label || 'This train';
    const t = timers.get(id);
    if (t && (t.label !== current.label || t.spoken !== current.spoken)) {
      t.label  = current.label;
      t.spoken = current.spoken;
      changed();
    } else {
      paint();
    }
  }

  function status(id) {
    const t = timers.get(id);
    return t ? { text: fmt(remaining(t)), state: stateOf(t) } : null;
  }

  /* Drop saved timers whose train no longer exists. */
  function prune(trainIds) {
    const keep = new Set(trainIds);
    let dropped = false;
    [...timers.keys()].forEach(id => { if (!keep.has(id)) { timers.delete(id); dropped = true; } });
    if (dropped) changed();
  }

  window.TrainTimers = { start, setCurrent, remove, status, prune };

  restore();

  /* ── Wire up controls ── */
  document.addEventListener('DOMContentLoaded', () => {
    const setInput  = document.getElementById('timer-set');
    const soundSel  = document.getElementById('timer-sound');
    const voiceSel  = document.getElementById('timer-voice');
    const voiceRow  = document.getElementById('timer-voice-row');

    if (setInput) setInput.value = fmt(parseInt(localStorage.getItem(DUR_KEY)) || window.TIMER_DEFAULT_DURATION);

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

    // Start = (re)start the current train's timer at the typed duration.
    const startCurrent = () => {
      const secs = parseDuration(setInput?.value);
      if (secs) start(current.id, secs, current.label, current.spoken);
    };
    document.getElementById('timer-apply')?.addEventListener('click', startCurrent);
    setInput?.addEventListener('keydown', e => { if (e.key === 'Enter') startCurrent(); });

    document.getElementById('timer-close')?.addEventListener('click', () => {
      document.getElementById('timer-panel').style.display = 'none';
    });
    document.getElementById('timer-test')?.addEventListener('click', () => {
      playCue('Sound test: train starts now', 2, 880);
    });

    // Card buttons (cards are rebuilt, so listen on the list)
    document.getElementById('timer-list')?.addEventListener('click', e => {
      const btn  = e.target.closest('[data-act]');
      const card = e.target.closest('.timer-card');
      const t    = card && timers.get(card.dataset.id);
      if (!btn || !t) return;
      if (btn.dataset.act === 'open')  document.dispatchEvent(new CustomEvent('traintimers:open', { detail: t.id }));
      if (btn.dataset.act === 'pause') togglePause(t);
      if (btn.dataset.act === 'reset') reset(t);
      if (btn.dataset.act === 'close') remove(t.id);
    });

    syncInterval();
    renderCards();
  });
})();
