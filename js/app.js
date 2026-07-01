/* js/app.js — hunt train command builder logic */

/* ── State ─────────────────────────────────────────────────── */
let selectedSpeed = 'relaxed';
let selectedExps  = [];
let expData       = {};   // { [exp]: { mapIdx, aeth, targets, scouts, progEnabled } }

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
    // update pill in DOM
    const pill = document.querySelector(`#gif-picks [data-url="${CSS.escape(url)}"]`);
    if (pill) {
      const labelEl = pill.querySelector('.gif-pick-label');
      if (labelEl) { labelEl.textContent = label; pill.title = label; }
    }
  } else {
    const entry = { url, label };
    saved.push(entry);
    persistGifs(saved);
    addGifPill(entry);
  }
}

function removeGif(url) {
  persistGifs(loadSavedGifs().filter(g => g.url !== url));
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
    pill.remove();
    if (val('gif-url') === entry.url) {
      document.getElementById('gif-url').value = '';
      syncGifPicks();
      updateGifPreview();
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
function updateGifPreview() {
  const url = val('gif-url');
  const box = document.getElementById('gif-preview');
  const img = box.querySelector('img');
  if (!url) {
    box.style.display = 'none';
    img.src = '';
    return;
  }
  img.onerror = () => {
    box.style.display = 'none';
  };
  img.onload = () => {
    box.style.display = 'block';
  };
  // Set display block optimistically — onload/onerror will correct it
  box.style.display = 'block';
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
      expData[exp] = { mapIdx: 0, aeth: '', targets: '', scouts: '', progEnabled: false };
    }

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

      <div class="sub-label">Targets</div>
      <div class="targets-row">
        <input type="number" id="tgt-${exp}" value="${d.targets}"
               min="0" max="12" placeholder="0"
               oninput="setField('${exp}', 'targets', this.value); this.value = expData['${exp}'].targets;" />
        <span class="targets-sep">/ 12</span>
      </div>

      <div class="sub-label">Scouts</div>
      <input type="text" id="scouts-${exp}" value="${d.scouts}"
             placeholder="e.g. Pio Eiro, Minfilia Warde"
             oninput="setField('${exp}', 'scouts', this.value)" />

      ${multi ? `
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
  const idx   = selectedExps.indexOf(currentExp);
  const total = selectedExps.length;
  const parts = selectedExps.map((e, i) => i < idx ? `~~${e}~~` : e);
  const word  = total === 2 ? 'double train' : total === 3 ? 'triple train' : `${total}x train`;
  return `${parts.join(' > ')} ${word} with breaks in between!`;
}

function updateProgPreviews() {
  selectedExps.forEach(exp => {
    const el = document.getElementById(`prog-prev-${exp}`);
    if (el) el.textContent = buildProgText(exp);
  });
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
  const prog   = (d.progEnabled && selectedExps.length > 1)
    ? buildProgText(exp)
    : null;
  const reward = buildRewardLine(exp, d.targets);
  return { world, speedStr, map, aeth, tgt, scouts, prog, reward, expNum: EXP_NUMS[exp] };
}

/* ── Raw command (real newlines, Discord markdown) ──────────── */
function buildRawCmd(exp) {
  const { world, speedStr, map, aeth, tgt, scouts, prog, reward, expNum } = buildParts(exp);
  const expLabel = EXP_LABELS[exp];
  const progLine   = prog   ? `\n*${prog}*`           : '';
  const rewardLine = reward ? `\n${reward}`    : '';
  return `.sh ${world} "${map} - **${aeth}**\n:book: Expansion: **${expLabel}**\n:dart: Targets : ${tgt}/12${rewardLine}\n:train2: Speed: ${speedStr}\n:eyes: Scouts: *${scouts}*${progLine}\n:person_gesturing_ok:" ${expNum}`;
}

/* ── Visual HTML (rendered in the preview box) ──────────────── */
function buildVisualHTML(exp) {
  const { world, speedStr, map, aeth, tgt, scouts, prog, reward, expNum } = buildParts(exp);
  const expLabel   = EXP_LABELS[exp];
  const progLine   = prog
    ? `\n<span class="pv-italic">${escHtml(prog)}</span>`
    : '';
  const rewardLine = reward ? `\n${escHtml(reward)}` : '';
  return `.sh ${escHtml(world)} "\n`
    + `${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>\n`
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
    </div>
  `).join('');
}

/* ── Init ───────────────────────────────────────────────────── */
update();