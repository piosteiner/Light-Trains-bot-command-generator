/* js/app.js — hunt train command builder logic */

/* ── State ─────────────────────────────────────────────────── */
let selectedSpeed = 'relaxed';
let selectedExps  = [];
let expData       = {};   // { [exp]: { mapIdx, aeth, targets, scouts, progEnabled, showRewards, customMsg } }
let noBreaks      = false; // multi-expansion trains: merge into one announcement
let noBreaksProg  = true;  // progression message in merged mode (on by default)
let noBreaksRewards = false; // consolidated currency rewards in merged mode

/* ── Helpers ────────────────────────────────────────────────── */
function val(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function getComboVal(id) {
  const el = document.getElementById(id);
  return el?._getValue?.() ?? '';
}

function getSpeed() {
  return selectedSpeed === 'custom'
    ? val('speed-custom') || 'custom'
    : selectedSpeed;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/* ── World combobox ─────────────────────────────────────────── */
makeCombo('combo-world', WORLDS, 'type or select world…', () => update());

/* ── Speed pills ────────────────────────────────────────────── */
document.querySelectorAll('#speed-pills .pill').forEach(p => {
  p.addEventListener('click', () => {
    selectedSpeed = p.dataset.speed;
    document.querySelectorAll('#speed-pills .pill')
      .forEach(x => x.classList.toggle('active', x === p));
    document.getElementById('speed-custom')
      .classList.toggle('show', selectedSpeed === 'custom');
    update();
  });
});
document.getElementById('speed-custom').addEventListener('input', update);

/* ── GIF quick-picks ────────────────────────────────────────── */
const GIF_STORAGE_KEY = 'hunt-train-gif-library-v2';

/* Storage format: [{ url, label }, ...] */
function loadSavedGifs() {
  try {
    const raw = JSON.parse(localStorage.getItem(GIF_STORAGE_KEY));
    if (!Array.isArray(raw)) return [];
    // migrate old plain-string format
    return raw.map(e => typeof e === 'string' ? { url: e, label: 'GIF' } : e);
  } catch { return []; }
}

function persistGifs(gifs) {
  gifs.sort((a, b) => a.label.localeCompare(b.label));
  localStorage.setItem(GIF_STORAGE_KEY, JSON.stringify(gifs));
}

/* Save a new GIF or rename an existing one using the inline name field. */
function saveOrRenameGif(url) {
  if (!url) return;
  const nameInput = document.getElementById('gif-name');
  const label = (nameInput?.value || '').trim() || 'My GIF';
  const saved = loadSavedGifs();
  const staticUrls = GIF_LIBRARY.map(g => g.url).filter(Boolean);
  if (staticUrls.includes(url)) return; // static GIFs can't be renamed

  const existing = saved.find(g => g.url === url);
  if (existing) {
    existing.label = label;
    persistGifs(saved);
    rebuildSavedPills();
  } else {
    const entry = { url, label };
    saved.push(entry);
    persistGifs(saved);
    rebuildSavedPills();
  }
}

function removeGif(url) {
  persistGifs(loadSavedGifs().filter(g => g.url !== url));
  rebuildSavedPills();
}

/* Remove and re-render all saved pills in sorted order. */
function rebuildSavedPills() {
  const container = document.getElementById('gif-picks');
  container.querySelectorAll('.gif-pick--saved').forEach(p => p.remove());
  loadSavedGifs().forEach(entry => addGifPill(entry));
  syncGifPicks();
}

function addGifPill(entry) {
  const container = document.getElementById('gif-picks');
  if (container.querySelector(`[data-url="${CSS.escape(entry.url)}"]`)) return;

  const pill = document.createElement('div');
  pill.className = 'gif-pick gif-pick--saved';
  pill.dataset.url = entry.url;
  pill.title = entry.label;

  const labelEl = document.createElement('span');
  labelEl.className = 'gif-pick-label';
  labelEl.textContent = entry.label;

  const renameBtn = document.createElement('button');
  renameBtn.className = 'gif-pick-action';
  renameBtn.title = 'Rename — click to select, then edit name above';
  renameBtn.innerHTML = '<i class="ti ti-pencil"></i>';
  renameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // selecting the pill loads it into the URL field → name row appears
    document.getElementById('gif-url').value = entry.url;
    syncGifPicks();
    updateGifPreview();
    updateGifNameRow();
    update();
    // focus the name input for immediate editing
    setTimeout(() => document.getElementById('gif-name')?.focus(), 50);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'gif-pick-action gif-pick-del';
  delBtn.title = 'Remove from library';
  delBtn.innerHTML = '<i class="ti ti-x"></i>';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeGif(entry.url);
    if (val('gif-url') === entry.url) {
      document.getElementById('gif-url').value = '';
      syncGifPicks();
      updateGifPreview();
      updateGifNameRow();
      update();
    }
  });

  pill.appendChild(labelEl);
  pill.appendChild(renameBtn);
  pill.appendChild(delBtn);

  pill.addEventListener('click', () => {
    document.getElementById('gif-url').value = entry.url;
    syncGifPicks();
    updateGifPreview();
    updateGifNameRow();
    update();
  });

  container.appendChild(pill);
}

function renderGifPicks() {
  const container = document.getElementById('gif-picks');

  // static library pills from data.js
  GIF_LIBRARY.forEach(g => {
    if (!g.url) return;
    const pill = document.createElement('div');
    pill.className = 'gif-pick';
    pill.dataset.url = g.url;
    pill.textContent = g.label;
    pill.addEventListener('click', () => {
      document.getElementById('gif-url').value = g.url;
      syncGifPicks();
      updateGifPreview();
      updateGifNameRow();
      update();
    });
    container.appendChild(pill);
  });

  // wire up the static "None" pill
  container.querySelector('.gif-pick[data-url=""]')
    .addEventListener('click', () => {
      document.getElementById('gif-url').value = '';
      syncGifPicks();
      updateGifPreview();
      updateGifNameRow();
      update();
    });

  // saved GIFs from localStorage
  loadSavedGifs().forEach(entry => addGifPill(entry));
}

renderGifPicks();

/* Show name field whenever a non-static GIF URL is active.
   Pre-fill with existing saved name so rename works too. */
function updateGifNameRow() {
  const url = val('gif-url');
  const nameRow = document.getElementById('gif-name-row');
  const nameInput = document.getElementById('gif-name');
  const staticUrls = GIF_LIBRARY.map(g => g.url).filter(Boolean);

  if (!url || staticUrls.includes(url)) {
    nameRow.style.display = 'none';
    if (nameInput) nameInput.value = '';
    return;
  }

  nameRow.style.display = 'block';
  // pre-fill with existing saved name if known, but don't overwrite if user is typing
  const saved = loadSavedGifs();
  const existing = saved.find(g => g.url === url);
  if (existing && document.activeElement !== nameInput) {
    nameInput.value = existing.label;
  }
}

/* ── GIF preview ────────────────────────────────────────────── */

/* Returns true if the URL is a direct media host URL that won't embed properly in Discord. */
function isIncompatibleForDiscord(url) {
  // Only raw media.tenor.com URLs are known to not embed as GIFs in Discord
  return /media\d*\.tenor\.com/i.test(url);
}


function updateGifPreview() {
  const url  = val('gif-url');
  const box  = document.getElementById('gif-preview');
  const img  = box.querySelector('img');
  const hint = document.getElementById('gif-url-hint');

  hint.style.display = 'none';
  box.style.display  = 'none';
  img.src = '';

  if (!url) return;

  // Direct media host URLs — previewable locally but won't embed in Discord
  if (isIncompatibleForDiscord(url)) {
    hint.style.display = 'block';
    hint.innerHTML = `<i class="ti ti-alert-triangle"></i>
      <span>This <code>media.tenor.com</code> URL won't embed as a GIF in Discord.
      Use the short Tenor link instead — e.g. <code>https://tenor.com/reygSVZAanM.gif</code>.</span>`;
    box.style.display = 'block';
    img.onerror = () => { box.style.display = 'none'; };
    img.onload  = () => { box.style.display = 'block'; };
    img.src = url;
    return;
  }

  // Short tenor.com or tenor.com/view URLs — fetch og:image via CORS proxy for preview
  if (/tenor\.com/i.test(url)) {
    hint.style.display = 'block';
    hint.innerHTML = `<i class="ti ti-loader"></i> <span>Loading preview…</span>`;
    const proxy = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    fetch(proxy, { signal: AbortSignal.timeout(7000) })
      .then(r => r.text())
      .then(html => {
        const m = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (m && m[1]) {
          hint.style.display = 'none';
          img.onerror = () => { box.style.display = 'none'; };
          img.onload  = () => { box.style.display = 'block'; };
          img.src = m[1];
        } else {
          hint.innerHTML = `<i class="ti ti-check"></i>
            <span>This URL works in Discord. Preview unavailable.</span>`;
        }
      })
      .catch(() => {
        hint.innerHTML = `<i class="ti ti-check"></i>
          <span>This URL works in Discord. Preview unavailable.</span>`;
      });
    return;
  }

  // Giphy share page — valid for Discord, no local preview
  if (/giphy\.com\/gifs\//i.test(url)) {
    hint.style.display = 'block';
    hint.innerHTML = `<i class="ti ti-check"></i>
      <span>This URL works in Discord. No local preview available.</span>`;
    return;
  }

  // Any other direct image URL — preview directly
  box.style.display = 'block';
  img.onerror = () => { box.style.display = 'none'; };
  img.onload  = () => { box.style.display = 'block'; };
  img.src = url;
}

document.getElementById('gif-url').addEventListener('input', () => {
  syncGifPicks();
  updateGifPreview();
  updateGifNameRow();
  update();
});

// Save/rename via Enter in the name field or URL field
document.getElementById('gif-url').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveOrRenameGif(val('gif-url'));
});
document.getElementById('gif-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveOrRenameGif(val('gif-url'));
});
document.getElementById('gif-name').addEventListener('blur', () => {
  saveOrRenameGif(val('gif-url'));
});

function syncGifPicks() {
  const cur = val('gif-url');
  document.querySelectorAll('.gif-pick')
    .forEach(b => b.classList.toggle('active', b.dataset.url === cur));
}

/* ── Expansion pills ────────────────────────────────────────── */
document.querySelectorAll('#exp-pills .pill').forEach(p => {
  p.addEventListener('click', () => {
    const exp = p.dataset.exp;
    if (selectedExps.includes(exp)) {
      selectedExps = selectedExps.filter(e => e !== exp);
    } else {
      selectedExps.push(exp);
    }
    selectedExps.sort((a, b) => EXP_ORDER.indexOf(a) - EXP_ORDER.indexOf(b));
    p.classList.toggle('active', selectedExps.includes(exp));

    if (!expData[exp]) {
      expData[exp] = { mapIdx: 0, aeth: '', targets: '', scouts: '', progEnabled: false, showRewards: false, customMsg: '' };
    }

    renderTrainOptions();
    renderExpSections();
    update();
  });
});

/* ── Render expansion sections ──────────────────────────────── */
function renderExpSections() {
  const container = document.getElementById('exp-sections');
  container.innerHTML = '';
  const multi = selectedExps.length > 1;

  selectedExps.forEach(exp => {
    const d     = expData[exp];
    const zones = ZONES[exp];
    const sec   = document.createElement('div');
    sec.className = 'exp-section';

    sec.innerHTML = `
      <div class="exp-section-title">
        <i class="ti ti-train" aria-hidden="true" style="font-size:15px"></i>
        ${EXP_LABELS[exp]}
        <span class="exp-badge">cmd #${EXP_NUMS[exp]}</span>
      </div>
      <div class="exp-divider"></div>

      <div class="sub-label">Starting point</div>
      <div class="row2">
        <div class="field">
          <label>Map</label>
          <div class="combo" id="combo-map-${exp}"></div>
        </div>
        <div class="field">
          <label>Aetheryte</label>
          <div class="combo" id="combo-aeth-${exp}"></div>
        </div>
      </div>

      <div class="sub-label">Custom message <span class="label-hint">optional — own line after the starting point</span></div>
      <input type="text" id="cmsg-${exp}" value="${escAttr(d.customMsg || '')}"
             placeholder="e.g. Please mount up quickly!"
             oninput="setField('${exp}', 'customMsg', this.value)" />

      <div class="sub-label">Targets</div>
      <div class="targets-row">
        <input type="number" id="tgt-${exp}" value="${d.targets}"
               min="0" max="12" placeholder="0"
               oninput="setField('${exp}', 'targets', this.value); this.value = expData['${exp}'].targets;" />
        <span class="targets-sep">/ 12</span>
      </div>
      ${noBreaks ? '' : `
      <label class="prog-toggle" style="margin-top:2px">
        <input type="checkbox" id="rewards-${exp}"
               ${d.showRewards ? 'checked' : ''}
               onchange="setField('${exp}', 'showRewards', this.checked)" />
        Include currency rewards in message
      </label>`}

      <div class="sub-label">Scouts</div>
      <input type="text" id="scouts-${exp}" value="${escAttr(d.scouts)}"
             placeholder="e.g. Presea Brunel, Rosemarie Herz, Ceri Elfari"
             oninput="setField('${exp}', 'scouts', this.value)" />

      ${(multi && !noBreaks) ? `
        <div class="exp-divider"></div>
        <label class="prog-toggle">
          <input type="checkbox" id="prog-${exp}"
                 ${d.progEnabled ? 'checked' : ''}
                 onchange="toggleProg('${exp}', this.checked)" />
          Show progression message
        </label>
        <div class="prog-preview" id="prog-prev-${exp}">${buildProgText(exp)}</div>
      ` : ''}
    `;

    container.appendChild(sec);
    initMapCombo(exp);
  });
}

/* ── Train-level options (shown when 2+ expansions selected) ── */
function renderTrainOptions() {
  const box = document.getElementById('train-options');
  if (!box) return;
  if (selectedExps.length < 2) {
    box.innerHTML = '';
    noBreaks = false;
    return;
  }
  box.innerHTML = `
    <label class="prog-toggle" style="margin-top:8px">
      <input type="checkbox" id="no-breaks" ${noBreaks ? 'checked' : ''}
             onchange="toggleNoBreaks(this.checked)" />
      No breaks — one merged announcement for all expansions
    </label>
    ${noBreaks ? `
      <label class="prog-toggle" style="margin-top:6px">
        <input type="checkbox" id="nb-prog" ${noBreaksProg ? 'checked' : ''}
               onchange="toggleNoBreaksProg(this.checked)" />
        Show progression message
      </label>
      <div class="prog-preview" id="nb-prog-prev" style="margin-top:6px"></div>
      <label class="prog-toggle" style="margin-top:6px">
        <input type="checkbox" id="nb-rewards" ${noBreaksRewards ? 'checked' : ''}
               onchange="toggleNoBreaksRewards(this.checked)" />
        Include consolidated currency rewards
      </label>
    ` : ''}
  `;
}

function toggleNoBreaks(checked) {
  noBreaks = checked;
  if (checked) noBreaksProg = true; // ticked by default for no-break trains
  renderTrainOptions();
  renderExpSections();
  update();
}

function toggleNoBreaksProg(checked) {
  noBreaksProg = checked;
  update();
}

function toggleNoBreaksRewards(checked) {
  noBreaksRewards = checked;
  update();
}

function initMapCombo(exp) {
  const zones    = ZONES[exp];
  const d        = expData[exp];
  const mapNames = zones.map(z => z.map);
  const initMap  = zones[d.mapIdx]?.map || mapNames[0];

  makeCombo(`combo-map-${exp}`, mapNames, 'type or select map…', v => {
    const idx = zones.findIndex(z => z.map === v);
    if (idx >= 0) {
      expData[exp].mapIdx = idx;
      expData[exp].aeth   = zones[idx].aeths[0];
      rebuildAethCombo(exp);
    }
    update();
  }, initMap);

  expData[exp].mapIdx = Math.max(0, zones.findIndex(z => z.map === initMap));

  const initAeth = d.aeth || zones[expData[exp].mapIdx]?.aeths[0] || '';
  makeCombo(
    `combo-aeth-${exp}`,
    zones[expData[exp].mapIdx]?.aeths || [],
    'type or select aetheryte…',
    v => { expData[exp].aeth = v; update(); },
    initAeth,
  );
  expData[exp].aeth = initAeth;
}

function rebuildAethCombo(exp) {
  const zones    = ZONES[exp];
  const d        = expData[exp];
  const aethList = zones[d.mapIdx]?.aeths || [];
  const initAeth = aethList[0] || '';
  expData[exp].aeth = initAeth;
  makeCombo(
    `combo-aeth-${exp}`,
    aethList,
    'type or select aetheryte…',
    v => { expData[exp].aeth = v; update(); },
    initAeth,
  );
}

/* ── Field helpers ──────────────────────────────────────────── */
function setField(exp, key, value) {
  if (key === 'targets') {
    value = clampTargets(value);
  }
  expData[exp][key] = value;
  updateProgPreviews();
  clearInvalidIfFilled(exp, key, value);
  update();
}

/* Remove the red outline the moment a previously-empty field gets a value. */
function clearInvalidIfFilled(exp, key, value) {
  if (!value) return;
  const idMap = { targets: `tgt-${exp}`, scouts: `scouts-${exp}` };
  const id = idMap[key];
  if (id) document.getElementById(id)?.classList.remove('field-invalid');
}

/* Clamp target count to the valid 0–12 range; non-numeric becomes ''. */
function clampTargets(value) {
  if (value === '') return '';
  let n = parseInt(value, 10);
  if (isNaN(n)) return '';
  if (n < 0) n = 0;
  if (n > 12) n = 12;
  return String(n);
}

function toggleProg(exp, checked) {
  expData[exp].progEnabled = checked;
  update();
}

/* ── Progression text ───────────────────────────────────────── */
function buildProgText(currentExp) {
  const total = selectedExps.length;
  const word  = total === 2 ? 'double train' : total === 3 ? 'triple train' : `${total}x train`;
  if (noBreaks) {
    const breakWord = total === 2 ? 'with no break in between!' : 'with no breaks in between!';
    return `${selectedExps.join(' > ')} ${word} ${breakWord}`;
  }
  const idx       = selectedExps.indexOf(currentExp);
  const parts     = selectedExps.map((e, i) => i < idx ? `~~${e}~~` : e);
  const breakWord = total === 2 ? 'with a break in between!' : 'with breaks in between!';
  return `${parts.join(' > ')} ${word} ${breakWord}`;
}

function updateProgPreviews() {
  selectedExps.forEach(exp => {
    const el = document.getElementById(`prog-prev-${exp}`);
    if (el) el.textContent = buildProgText(exp);
  });
  const nb = document.getElementById('nb-prog-prev');
  if (nb && selectedExps.length) nb.textContent = buildProgText(selectedExps[0]);
}

/* ── Reward calculation ─────────────────────────────────────── */
function buildRewardLine(exp, targets) {
  const count = parseInt(targets) || 0;
  if (count === 0) return null;
  const rewards = EXP_REWARDS[exp] || [];
  return rewards
    .map(r => {
      const total = r.amount * count;
      return r.emoji ? `${total} ${r.emoji}` : `${total} ${r.label}`;
    })
    .join(' | ');
}

/* ── Build parts shared by raw + visual ─────────────────────── */
function buildParts(exp) {
  const world  = getComboVal('combo-world') || 'WORLD';
  const speed  = getSpeed();
  const gif    = val('gif-url');
  // No space between ] and ( — matches Discord bot format exactly
  const speedStr = gif ? `[${speed}](${gif})` : `[${speed}]`;
  const d      = expData[exp] || {};
  const map    = getComboVal(`combo-map-${exp}`)  || ZONES[exp][0]?.map || 'MAP';
  const aeth   = getComboVal(`combo-aeth-${exp}`) || d.aeth || 'AETHERYTE';
  const tgt    = d.targets || 'XX';
  const scouts = d.scouts  || 'NAMES';
  const cmsg   = (d.customMsg || '').trim();
  const prog   = (d.progEnabled && selectedExps.length > 1)
    ? buildProgText(exp)
    : null;
  const reward = (d.showRewards) ? buildRewardLine(exp, d.targets) : null;
  return { world, speedStr, map, aeth, tgt, scouts, cmsg, prog, reward, expNum: EXP_NUMS[exp] };
}

/* ── Raw command (real newlines, Discord markdown) ──────────── */
function buildRawCmd(exp) {
  const { world, speedStr, map, aeth, tgt, scouts, cmsg, prog, reward, expNum } = buildParts(exp);
  const expLabel = EXP_LABELS[exp];
  const progLine   = prog   ? `\n*${prog}*`  : '';
  const rewardLine = reward ? `\n${reward}`  : '';
  const cmsgLine   = cmsg   ? `\n${cmsg}`    : '';
  return `.sh ${world} "${map} - **${aeth}**${cmsgLine}\n:book: Expansion: **${expLabel}**\n:dart: Targets : ${tgt}/12${rewardLine}\n:train2: Speed: ${speedStr}\n:eyes: Scouts: *${scouts}*${progLine}\n:person_gesturing_ok:" ${expNum}`;
}

/* ── Visual HTML (rendered in the preview box) ──────────────── */
function buildVisualHTML(exp) {
  const { world, speedStr, map, aeth, tgt, scouts, cmsg, prog, reward, expNum } = buildParts(exp);
  const expLabel   = EXP_LABELS[exp];
  const progLine   = prog
    ? `\n<span class="pv-italic">${escHtml(prog)}</span>`
    : '';
  const rewardLine = reward ? `\n${escHtml(reward)}` : '';
  const cmsgLine   = cmsg   ? `\n${escHtml(cmsg)}`   : '';
  return `.sh ${escHtml(world)} "\n`
    + `${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${cmsgLine}\n`
    + `:book: Expansion: <span class="pv-bold">${escHtml(expLabel)}</span>\n`
    + `:dart: Targets : ${escHtml(tgt)}/12${rewardLine}\n`
    + `:train2: Speed: ${escHtml(speedStr)}\n`
    + `:eyes: Scouts: <span class="pv-italic">${escHtml(scouts)}</span>`
    + `${progLine}\n:person_gesturing_ok:\n" ${expNum}`;
}

/* ── CWL1 join-message (separate copyable text) ─────────────── */
function buildCwl1Raw(exp) {
  const { world, map, aeth } = buildParts(exp);
  const expLabel = EXP_LABELS[exp];
  return `/cwl1 Running a ${expLabel} A-Rank Hunt Train on ${world} in 10mins. Join at ${map} - ${aeth} if you want to hunt together <3`;
}

function buildCwl1Visual(exp) {
  const { world, map, aeth } = buildParts(exp);
  const expLabel = EXP_LABELS[exp];
  return `/cwl1 Running a <span class="pv-bold">${escHtml(expLabel)}</span> A-Rank Hunt Train on <span class="pv-bold">${escHtml(world)}</span> in 10mins. Join at ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span> if you want to hunt together &lt;3`;
}

/* ── Scouts macro (separate copyable text, per expansion) ────── */
function buildScoutsRaw(exp) {
  const { scouts } = buildParts(exp);
  return `/sh This train was scouted by ${scouts}\n/p This train was scouted by ${scouts}`;
}

function buildScoutsVisual(exp) {
  const { scouts } = buildParts(exp);
  return `/sh This train was scouted by <span class="pv-italic">${escHtml(scouts)}</span>\n/p This train was scouted by <span class="pv-italic">${escHtml(scouts)}</span>`;
}

/* ── Merged (no-breaks) builders ─────────────────────────────── */

/* Combine scout names across expansions.
   Same names everywhere -> single string; different -> "A (ShB), B (EW) and C (DT)" */
function combineScouts() {
  const entries = selectedExps.map(exp => ({
    exp,
    scouts: (expData[exp]?.scouts || '').trim() || 'NAMES',
  }));
  const allSame = entries.every(e => e.scouts === entries[0].scouts);
  if (allSame) return entries[0].scouts;
  const parts = entries.map(e => `${e.scouts} (${e.exp})`);
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

/* Sum currency rewards per currency across all selected expansions,
   gated on the single consolidated "Include rewards" toggle. */
function buildMergedRewardLine() {
  if (!noBreaksRewards) return null;
  const totals = new Map();
  selectedExps.forEach(exp => {
    const d = expData[exp] || {};
    const count = parseInt(d.targets) || 0;
    if (!count) return;
    (EXP_REWARDS[exp] || []).forEach(r => {
      const key = r.emoji || r.label;
      totals.set(key, (totals.get(key) || 0) + r.amount * count);
    });
  });
  if (!totals.size) return null;
  return [...totals.entries()].map(([k, v]) => `${v} ${k}`).join(' | ');
}

function buildMergedParts() {
  const first = selectedExps[0];
  const { world, speedStr, map, aeth, cmsg } = buildParts(first);
  const expLabels = selectedExps.map(e => EXP_LABELS[e]).join(' & ');
  const targets   = selectedExps.map(e => `${expData[e]?.targets || 'XX'}/12`).join(' & ');
  const scouts    = combineScouts();
  const reward    = buildMergedRewardLine();
  const prog      = noBreaksProg ? buildProgText(first) : null;
  return { world, speedStr, map, aeth, cmsg, expLabels, targets, scouts, reward, prog, expNum: EXP_NUMS[first] };
}

function buildMergedRawCmd() {
  const { world, speedStr, map, aeth, cmsg, expLabels, targets, scouts, reward, prog, expNum } = buildMergedParts();
  const cmsgLine   = cmsg   ? `\n${cmsg}`   : '';
  const rewardLine = reward ? `\n${reward}` : '';
  const progLine   = prog   ? `\n*${prog}*` : '';
  return `.sh ${world} "${map} - **${aeth}**${cmsgLine}\n:book: Expansions: **${expLabels}**\n:dart: Targets : ${targets}${rewardLine}\n:train2: Speed: ${speedStr}\n:eyes: Scouts: *${scouts}*${progLine}\n:person_gesturing_ok:" ${expNum}`;
}

function buildMergedVisualHTML() {
  const { world, speedStr, map, aeth, cmsg, expLabels, targets, scouts, reward, prog, expNum } = buildMergedParts();
  const cmsgLine   = cmsg   ? `\n${escHtml(cmsg)}`   : '';
  const rewardLine = reward ? `\n${escHtml(reward)}` : '';
  const progLine   = prog   ? `\n<span class="pv-italic">${escHtml(prog)}</span>` : '';
  return `.sh ${escHtml(world)} "\n`
    + `${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${cmsgLine}\n`
    + `:book: Expansions: <span class="pv-bold">${escHtml(expLabels)}</span>\n`
    + `:dart: Targets : ${escHtml(targets)}${rewardLine}\n`
    + `:train2: Speed: ${escHtml(speedStr)}\n`
    + `:eyes: Scouts: <span class="pv-italic">${escHtml(scouts)}</span>`
    + `${progLine}\n:person_gesturing_ok:\n" ${expNum}`;
}

/* Mid-train starting-location announcements (expansions 2+) */
function buildMshRaw(exp) {
  const { map, aeth, cmsg } = buildParts(exp);
  const cm = cmsg ? ` ${cmsg}` : '';
  return `.msh "${map} - **${aeth}** will be the starting location for the "${EXP_LABELS[exp]}" expansion.${cm}" ${EXP_NUMS[exp]}`;
}

function buildMshVisual(exp) {
  const { map, aeth, cmsg } = buildParts(exp);
  const cm = cmsg ? ` ${escHtml(cmsg)}` : '';
  return `.msh "${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span> will be the starting location for the "${escHtml(EXP_LABELS[exp])}" expansion.${cm}" ${EXP_NUMS[exp]}`;
}

function buildMergedCwl1Raw() {
  const { world, map, aeth, expLabels } = buildMergedParts();
  const breakNote = selectedExps.length === 2
    ? 'There will be no break between the expansions.'
    : 'There will be no breaks between the expansions.';
  return `/cwl1 Running a ${expLabels} A-Rank Hunt Train on ${world} in 10mins. ${breakNote} Join at ${map} - ${aeth} if you want to hunt together <3`;
}

function buildMergedCwl1Visual() {
  const { world, map, aeth, expLabels } = buildMergedParts();
  const breakNote = selectedExps.length === 2
    ? 'There will be no break between the expansions.'
    : 'There will be no breaks between the expansions.';
  return `/cwl1 Running a <span class="pv-bold">${escHtml(expLabels)}</span> A-Rank Hunt Train on <span class="pv-bold">${escHtml(world)}</span> in 10mins. ${breakNote} Join at ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span> if you want to hunt together &lt;3`;
}

function buildMergedScoutsRaw() {
  const s = combineScouts();
  return `/sh This train was scouted by ${s}\n/p This train was scouted by ${s}`;
}

function buildMergedScoutsVisual() {
  const s = escHtml(combineScouts());
  return `/sh This train was scouted by <span class="pv-italic">${s}</span>\n/p This train was scouted by <span class="pv-italic">${s}</span>`;
}

/* ── Train control commands (.start / .end) ─────────────────── */
/* Only Shadowbringers onward support .start/.end train control. */
function hasTrainControl(exp) {
  return EXP_ORDER.indexOf(exp) >= EXP_ORDER.indexOf('ShB');
}

function buildEndCmd(exp) {
  const world = getComboVal('combo-world') || 'WORLD';
  return `.end ${world} ${EXP_NUMS[exp]}`;
}

function buildStartCmd(exp) {
  const world = getComboVal('combo-world') || 'WORLD';
  return `.start ${world} ${EXP_NUMS[exp]}`;
}

/* ── Required-field validation ───────────────────────────────── */
/* Checks World + per-expansion Map / Aetheryte / Targets / Scouts.
   Adds .field-invalid to any empty required input and returns
   true only if everything for the given exp (plus World) is filled. */
function validateFields(exp) {
  let valid = true;

  const worldInput = document.querySelector('#combo-world .combo-input');
  const worldOk = !!getComboVal('combo-world');
  worldInput?.classList.toggle('field-invalid', !worldOk);
  if (!worldOk) valid = false;

  const mapInput = document.querySelector(`#combo-map-${exp} .combo-input`);
  const mapOk = !!getComboVal(`combo-map-${exp}`);
  mapInput?.classList.toggle('field-invalid', !mapOk);
  if (!mapOk) valid = false;

  const aethInput = document.querySelector(`#combo-aeth-${exp} .combo-input`);
  const aethOk = !!getComboVal(`combo-aeth-${exp}`);
  aethInput?.classList.toggle('field-invalid', !aethOk);
  if (!aethOk) valid = false;

  const tgtInput = document.getElementById(`tgt-${exp}`);
  const tgtOk = !!(expData[exp]?.targets);
  tgtInput?.classList.toggle('field-invalid', !tgtOk);
  if (!tgtOk) valid = false;

  const scoutsInput = document.getElementById(`scouts-${exp}`);
  const scoutsOk = !!val(`scouts-${exp}`);
  scoutsInput?.classList.toggle('field-invalid', !scoutsOk);
  if (!scoutsOk) valid = false;

  return valid;
}

/* ── Click-to-copy handler ──────────────────────────────────── */
function copyCmd(exp, el) {
  if (!validateFields(exp)) {
    flashInvalid(el);
    return;
  }
  const raw = buildRawCmd(exp);
  copyToClipboard(raw, el);
  if (typeof startTrainTimer === 'function') startTrainTimer();
}

function copyCwl1(exp, el) {
  if (!validateFields(exp)) {
    flashInvalid(el);
    return;
  }
  const raw = buildCwl1Raw(exp);
  copyToClipboard(raw, el);
}

function copyScouts(exp, el) {
  const scoutsOk = !!val(`scouts-${exp}`);
  if (!scoutsOk) {
    document.getElementById(`scouts-${exp}`)?.classList.add('field-invalid');
    flashInvalid(el);
    return;
  }
  const raw = buildScoutsRaw(exp);
  copyToClipboard(raw, el);
}

/* ── Merged-mode copy handlers ──────────────────────────────── */
function validateAllExps() {
  let ok = true;
  selectedExps.forEach(e => { if (!validateFields(e)) ok = false; });
  return ok;
}

function copyMergedCmd(el) {
  if (!validateAllExps()) { flashInvalid(el); return; }
  copyToClipboard(buildMergedRawCmd(), el);
  if (typeof startTrainTimer === 'function') startTrainTimer();
}

function copyMsh(exp, el) {
  if (!validateFields(exp)) { flashInvalid(el); return; }
  copyToClipboard(buildMshRaw(exp), el);
}

function copyMergedCwl1(el) {
  if (!validateAllExps()) { flashInvalid(el); return; }
  copyToClipboard(buildMergedCwl1Raw(), el);
}

function copyMergedScouts(el) {
  copyToClipboard(buildMergedScoutsRaw(), el);
}

function copyEnd(exp, el)   { copyToClipboard(buildEndCmd(exp), el); }
function copyStart(exp, el) { copyToClipboard(buildStartCmd(exp), el); }

function flashInvalid(el) {
  el.classList.add('blocked');
  el.querySelector('.copy-hint').innerHTML = '<i class="ti ti-alert-triangle"></i> Fill required fields';
  setTimeout(() => {
    el.classList.remove('blocked');
    el.querySelector('.copy-hint').innerHTML = '<i class="ti ti-copy"></i> Click to copy';
  }, 1800);
}

function copyToClipboard(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    el.classList.add('copied');
    el.querySelector('.copy-hint').innerHTML = '<i class="ti ti-check"></i> Copied!';
    setTimeout(() => {
      el.classList.remove('copied');
      el.querySelector('.copy-hint').innerHTML = '<i class="ti ti-copy"></i> Click to copy';
    }, 1800);
  });
}

/* ── Render preview area ────────────────────────────────────── */
function update() {
  updateProgPreviews();

  const area = document.getElementById('preview-area');

  if (selectedExps.length === 0) {
    area.innerHTML = '<p class="no-exps">Select at least one expansion above to generate a command.</p>';
    return;
  }

  if (noBreaks && selectedExps.length > 1) {
    renderMergedPreview(area);
    return;
  }

  area.innerHTML = selectedExps.map((exp, i) => `
    ${i > 0 ? '<div class="exp-preview-divider"></div>' : ''}
    <div class="preview-block" style="border-left:3px solid var(--exp-color-${exp}); padding-left:.75rem">
      <div class="preview-exp-label">
        <span class="exp-icon">${EXP_ICONS[exp]}</span> ${EXP_LABELS[exp]}
      </div>
      <div class="preview-visual" id="pv-${exp}" onclick="copyCmd('${exp}', this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildVisualHTML(exp)}
      </div>
      <div class="preview-exp-label" style="margin-top:.6rem">
        <span class="exp-icon">${EXP_ICONS[exp]}</span> CWLS message
      </div>
      <div class="preview-visual" id="pvc-${exp}" onclick="copyCwl1('${exp}', this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildCwl1Visual(exp)}
      </div>
      <div class="preview-exp-label" style="margin-top:.6rem">
        <span class="exp-icon">${EXP_ICONS[exp]}</span> Scouts macro
      </div>
      <div class="preview-visual" id="pvs-${exp}" onclick="copyScouts('${exp}', this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildScoutsVisual(exp)}
      </div>
      ${hasTrainControl(exp) ? `
      <div class="preview-exp-label" style="margin-top:.6rem">
        <span class="exp-icon">${EXP_ICONS[exp]}</span> End train
      </div>
      <div class="preview-visual pv-small" id="pve-${exp}" onclick="copyEnd('${exp}', this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${escHtml(buildEndCmd(exp))}
      </div>` : ''}
    </div>
  `).join('');
}

/* ── Merged (no-breaks) preview rendering ────────────────────── */
function renderMergedPreview(area) {
  const first  = selectedExps[0];
  const others = selectedExps.slice(1);

  const mshBlocks = others.map(exp => `
    <div class="preview-exp-label" style="margin-top:.6rem">
      <span class="exp-icon">${EXP_ICONS[exp]}</span> ${EXP_LABELS[exp]} — mid-train starting location
    </div>
    <div class="preview-visual" id="pvm-${exp}" onclick="copyMsh('${exp}', this)">
      <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildMshVisual(exp)}
    </div>
  `).join('');

  const controlBlocks = selectedExps
    .filter(exp => hasTrainControl(exp))
    .map(exp => {
      const isFirstOverall = selectedExps[0] === exp;
      return `
    ${!isFirstOverall ? `
    <div class="preview-visual pv-small" id="pvst-${exp}" onclick="copyStart('${exp}', this)" style="margin-bottom:6px">
      <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${escHtml(buildStartCmd(exp))}
    </div>` : ''}
    <div class="preview-visual pv-small" id="pve-${exp}" onclick="copyEnd('${exp}', this)" style="margin-bottom:6px">
      <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${escHtml(buildEndCmd(exp))}
    </div>`;
    }).join('');

  area.innerHTML = `
    <div class="preview-block" style="border-left:3px solid var(--exp-color-${first}); padding-left:.75rem">
      <div class="preview-exp-label">
        <span class="exp-icon">🚄</span> Merged train announcement (${selectedExps.join(' > ')})
      </div>
      <div class="preview-visual" id="pv-merged" onclick="copyMergedCmd(this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildMergedVisualHTML()}
      </div>
      ${mshBlocks}
      <div class="preview-exp-label" style="margin-top:.6rem">
        <span class="exp-icon">💬</span> CWLS message
      </div>
      <div class="preview-visual" id="pvc-merged" onclick="copyMergedCwl1(this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildMergedCwl1Visual()}
      </div>
      <div class="preview-exp-label" style="margin-top:.6rem">
        <span class="exp-icon">🔭</span> Scouts macro
      </div>
      <div class="preview-visual" id="pvs-merged" onclick="copyMergedScouts(this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildMergedScoutsVisual()}
      </div>
      ${controlBlocks ? `
      <div class="preview-exp-label" style="margin-top:.6rem">
        <span class="exp-icon">🏁</span> Train control (.start on reaching an expansion, .end when done)
      </div>
      ${controlBlocks}` : ''}
    </div>
  `;
}

/* ── Init ───────────────────────────────────────────────────── */
update();