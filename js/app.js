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

/* Fresh per-expansion form values, used when an expansion is first ticked. */
function newExpData() {
  return { mapIdx: 0, aeth: '', targets: '', scouts: '', progEnabled: false, showRewards: false, customMsg: '', startInMin: '5', maxTargets: '12', instance: false, instanceNum: '1' };
}

/* ── World combobox ─────────────────────────────────────────── */
function initWorldCombo(initial = '') {
  makeCombo('combo-world', WORLDS, 'type or select world…', () => update(), initial);
}
initWorldCombo();

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
    // migrate old plain-string format, and fix links saved before
    // normalizeGifUrl existed (dropping any that then duplicate another)
    const seen = new Set();
    return raw
      .map(e => typeof e === 'string' ? { url: e, label: 'GIF' } : e)
      .map(e => ({ ...e, url: normalizeGifUrl(e.url) }))
      .filter(e => !seen.has(e.url) && seen.add(e.url));
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
  // pre-fill with the saved name (or clear it for an unsaved link, so it isn't
  // saved under the previous GIF's name), but don't overwrite while the user types
  const saved = loadSavedGifs();
  const existing = saved.find(g => g.url === url);
  if (document.activeElement !== nameInput) {
    nameInput.value = existing ? existing.label : '';
  }
}

/* ── GIF link check & preview ───────────────────────────────── */
/* Whether Discord shows a link as a GIF depends on its format (host and
   path), not on the file: the same Tenor GIF works from c.tenor.com and
   fails from media1.tenor.com. GIF_LINK_RULES in data.js records the
   tested formats; this checks a link against them and previews the GIF. */

function matchGifRule(url) {
  return GIF_LINK_RULES.find(r => r.pattern.test(url)) || null;
}

/* media*.tenor.com/<id>/<name>.gif → c.tenor.com/<id>/tenor.gif: the same file,
   in the format Discord shows as a GIF. */
function tenorWorkingUrl(fileUrl) {
  const m = (fileUrl || '').match(/^https?:\/\/media\d*\.tenor\.com\/(?:m\/)?([A-Za-z0-9_-]+)\/[^/?#]+\.gif/i);
  return m ? `https://c.tenor.com/${m[1]}/tenor.gif` : null;
}

/* tenor.com/en-GB/view/… → tenor.com/view/…: Discord only recognises the plain
   page link, so whatever sits between tenor.com/ and /view/ is dropped. */
function tenorPlainPageUrl(url) {
  const m = url.match(/^https?:\/\/(?:www\.)?tenor\.com\/(?:[^/?#]+\/)+(view\/.*)$/i);
  return m ? `https://tenor.com/${m[1]}` : null;
}

/* Every GIF link goes through this before use, so a fixable link is
   never put into a command. */
function normalizeGifUrl(url) {
  return tenorPlainPageUrl(url) || url;
}

/* Giphy page links end in the GIF's id, and its file lives at a fixed address. */
function giphyFileUrl(pageUrl) {
  const m = pageUrl.match(/giphy\.com\/gifs\/(?:[^/?#]*-)?([A-Za-z0-9]+)\/?([?#]|$)/i);
  return m ? `https://media.giphy.com/media/${m[1]}/giphy.gif` : null;
}

/* Tenor page links end in the post number, which Tenor's embeddable player
   takes. (Tenor doesn't let other sites read its pages, so the GIF file
   itself can't be looked up from here.) */
function tenorEmbedUrl(pageUrl) {
  const m = pageUrl.match(/tenor\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?view\/[^/?#]*-(\d+)\/?([?#]|$)/i);
  return m ? `https://tenor.com/embed/${m[1]}` : null;
}

function showGifVerdict(hint, rule) {
  let icon, text;
  if (!rule) {
    icon = 'ti-help-circle';
    text = 'Untested link format — Discord may or may not show it as a GIF. '
      + 'Try it once, then add the result to <code>GIF_LINK_RULES</code> in data.js.';
  } else if (rule.verdict === 'works') {
    icon = 'ti-check';
    text = rule.tested
      ? `Shows as a GIF in Discord <span class="gif-rule">(${rule.name})</span>.`
      : `Probably shows as a GIF in Discord <span class="gif-rule">(${rule.name}, not tested yet)</span>. ${rule.note}`;
  } else {
    icon = 'ti-alert-triangle';
    text = rule.tested
      ? `Discord won't show this as a GIF <span class="gif-rule">(${rule.name})</span>. ${rule.note}`
      : `Discord probably won't show this as a GIF <span class="gif-rule">(${rule.name}, not tested yet)</span>. ${rule.note}`;
  }
  hint.innerHTML = `<i class="ti ${icon}"></i><span>${text}</span>`;
  hint.style.display = 'flex';
}

/* Add a button to the hint that swaps in the working version of the link.
   A saved GIF moves to the new link, keeping its name. */
function offerGifFix(hint, fixedUrl) {
  const oldUrl = val('gif-url');
  if (!fixedUrl || fixedUrl === oldUrl) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn gif-fix';
  btn.title = fixedUrl;
  btn.innerHTML = '<i class="ti ti-wand"></i> <span>Use the working link</span>';
  btn.addEventListener('click', () => {
    const saved = loadSavedGifs();
    const entry = saved.find(g => g.url === oldUrl);
    if (entry && !saved.some(g => g.url === fixedUrl)) {
      entry.url = fixedUrl;
      persistGifs(saved);
      rebuildSavedPills();
    }
    document.getElementById('gif-url').value = fixedUrl;
    syncGifPicks();
    updateGifPreview();
    updateGifNameRow();
    update();
  });
  hint.querySelector('span').append(' ', btn);
}

function updateGifPreview() {
  const typed  = val('gif-url');
  const url    = normalizeGifUrl(typed);
  const box    = document.getElementById('gif-preview');
  const img    = box.querySelector('img');
  const player = box.querySelector('iframe');
  const hint   = document.getElementById('gif-url-hint');

  hint.style.display = 'none';
  box.style.display  = 'none';
  img.onload = img.onerror = null;   // a late event from the old image mustn't hide the new preview
  img.src = '';
  img.style.display = '';
  player.removeAttribute('src');
  player.style.display = 'none';

  if (!url) return;

  showGifVerdict(hint, matchGifRule(url));
  if (url !== typed) {
    document.getElementById('gif-url').value = url;
    syncGifPicks();
    const removed = typed.match(/tenor\.com(\/.*?)\/view\//i)[1];
    hint.querySelector('span').insertAdjacentHTML('afterbegin',
      `Removed <code>${escHtml(removed)}</code> from the link — Discord only shows the plain Tenor link as a GIF. `);
  }
  offerGifFix(hint, tenorWorkingUrl(url));

  const embed = tenorEmbedUrl(url);
  if (embed) {
    img.style.display = 'none';
    player.style.display = 'block';
    player.src = embed;
    box.style.display = 'block';
    return;
  }

  // Tenor short links can't be resolved from here; the hint says what to paste instead
  if (/^https?:\/\/(www\.)?tenor\.com\//i.test(url)) return;

  img.onerror = () => { box.style.display = 'none'; };
  img.onload  = () => { box.style.display = 'block'; };
  img.src = giphyFileUrl(url) || url;
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
      expData[exp] = newExpData();
    }

    renderTrainOptions();
    renderExpSections();
    update();
  });
});

/* Faint background art for an expansion (js/art.js): its official image if
   one is listed, else its line drawing. */
function expArtHTML(exp) {
  const image = EXP_ART_IMAGES[exp];
  return `<div class="exp-art" aria-hidden="true">${
    image
      ? `<img src="${image.src}" alt=""${image.focus ? ` style="object-position:${image.focus}"` : ''} />`
      : (EXP_ART[exp] || '')
  }</div>`;
}

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
    sec.style.setProperty('--exp', `var(--exp-color-${exp})`);

    sec.innerHTML = `
      ${expArtHTML(exp)}
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

      <label class="prog-toggle" id="instance-row-${exp}"
             style="margin-top:2px; display:${(parseInt(d.maxTargets, 10) || 12) > 12 ? 'flex' : 'none'}">
        <input type="checkbox" id="instance-${exp}"
               ${d.instance ? 'checked' : ''}
               onchange="setField('${exp}', 'instance', this.checked)" />
        Instance
        <input type="number" id="instancenum-${exp}" value="${d.instanceNum}"
               min="1" max="99" style="width:48px; margin-left:4px"
               onclick="event.stopPropagation()"
               oninput="setField('${exp}', 'instanceNum', this.value); this.value = expData['${exp}'].instanceNum;" />
      </label>

      ${isPreShb(exp) ? `
      <div class="sub-label">Starts in (minutes)</div>
      <input type="number" id="starttime-${exp}" value="${d.startInMin}"
             min="0" max="180" placeholder="e.g. 5"
             oninput="setField('${exp}', 'startInMin', this.value); this.value = expData['${exp}'].startInMin;" />
      ` : ''}

      <div class="sub-label">Custom message <span class="label-hint">optional — own line after the starting point</span></div>
      <input type="text" id="cmsg-${exp}" value="${escAttr(d.customMsg || '')}"
             placeholder="e.g. Please mount up quickly!"
             oninput="setField('${exp}', 'customMsg', this.value)" />

      <div class="sub-label">Targets <span class="label-hint">max is editable — some zones have extra instances above 12</span></div>
      <div class="targets-row">
        <input type="number" id="tgt-${exp}" value="${d.targets}"
               min="0" max="${d.maxTargets}" placeholder="0"
               oninput="setField('${exp}', 'targets', this.value); this.value = expData['${exp}'].targets;" />
        <span class="targets-sep">/</span>
        <input type="number" id="maxtgt-${exp}" value="${d.maxTargets}"
               min="1" max="99"
               oninput="setMaxTargets('${exp}', this.value)" />
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
             placeholder="leave blank for &quot;myself&quot;"
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
    value = clampTargets(value, expData[exp]?.maxTargets);
  }
  if (key === 'startInMin') {
    value = clampMinutes(value);
  }
  if (key === 'instanceNum') {
    value = clampInstanceNum(value);
  }
  expData[exp][key] = value;
  updateProgPreviews();
  clearInvalidIfFilled(exp, key, value);
  update();
}

/* Edit the per-expansion max target count (default 12, for zones with
   extra instances). Re-clamps the current Targets value against the new
   ceiling and shows/hides the Instance toggle without a full re-render. */
function setMaxTargets(exp, value) {
  const n = parseInt(clampMaxTargets(value), 10);
  expData[exp].maxTargets = String(n);

  const tgtInput = document.getElementById(`tgt-${exp}`);
  if (tgtInput) {
    tgtInput.max = n;
    expData[exp].targets = clampTargets(expData[exp].targets, n);
    tgtInput.value = expData[exp].targets;
  }

  const row = document.getElementById(`instance-row-${exp}`);
  if (row) row.style.display = n > 12 ? 'flex' : 'none';
  if (n <= 12 && expData[exp].instance) {
    expData[exp].instance = false;
    const cb = document.getElementById(`instance-${exp}`);
    if (cb) cb.checked = false;
  }

  update();
}

/* Remove the red outline the moment a previously-empty field gets a value. */
function clearInvalidIfFilled(exp, key, value) {
  if (!value) return;
  const idMap = { targets: `tgt-${exp}`, scouts: `scouts-${exp}`, startInMin: `starttime-${exp}` };
  const id = idMap[key];
  if (id) document.getElementById(id)?.classList.remove('field-invalid');
}

/* Clamp start-time minutes to a sane 0–180 range; non-numeric becomes ''. */
function clampMinutes(value) {
  if (value === '') return '';
  let n = parseInt(value, 10);
  if (isNaN(n)) return '';
  if (n < 0) n = 0;
  if (n > 180) n = 180;
  return String(n);
}

/* Clamp target count to 0–max (default 12); non-numeric becomes ''. */
function clampTargets(value, max) {
  if (value === '') return '';
  const ceiling = parseInt(max, 10) || 12;
  let n = parseInt(value, 10);
  if (isNaN(n)) return '';
  if (n < 0) n = 0;
  if (n > ceiling) n = ceiling;
  return String(n);
}

/* Clamp the max target count to 1–99; non-numeric falls back to 1. */
function clampMaxTargets(value) {
  let n = parseInt(value, 10);
  if (isNaN(n) || n < 1) n = 1;
  if (n > 99) n = 99;
  return String(n);
}

/* Clamp the instance number to 1–99; non-numeric falls back to 1. */
function clampInstanceNum(value) {
  let n = parseInt(value, 10);
  if (isNaN(n) || n < 1) n = 1;
  if (n > 99) n = 99;
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

/* Pre-Shadowbringers expansions use .msh with a relative start-time line
   instead of .sh, since these older hunt zones need a scheduled start. */
function isPreShb(exp) {
  return EXP_ORDER.indexOf(exp) < EXP_ORDER.indexOf('ShB');
}

/* Build a Discord relative timestamp tag from a number of minutes from now. */
function buildRelativeTimestamp(minutes) {
  const mins = parseInt(minutes) || 0;
  const unix = Math.floor(Date.now() / 1000) + mins * 60;
  return `<t:${unix}:R>`;
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
  const maxTgt = d.maxTargets || 12;
  const scouts = (d.scouts || '').trim() || 'myself';
  const cmsg   = (d.customMsg || '').trim();
  const instance = !!d.instance;
  const instanceNum = d.instanceNum || '1';
  const prog   = (d.progEnabled && selectedExps.length > 1)
    ? buildProgText(exp)
    : null;
  const reward = (d.showRewards) ? buildRewardLine(exp, d.targets) : null;
  const startInMin = d.startInMin;
  return { world, speedStr, map, aeth, tgt, maxTgt, scouts, cmsg, instance, instanceNum, prog, reward, startInMin, expNum: EXP_NUMS[exp] };
}

/* ── Raw command (real newlines, Discord markdown) ──────────── */
function buildRawCmd(exp) {
  const { world, speedStr, map, aeth, tgt, maxTgt, scouts, cmsg, instance, instanceNum, prog, reward, startInMin, expNum } = buildParts(exp);
  const expLabel = EXP_LABELS[exp];
  const progLine   = prog   ? `\n*${prog}*`  : '';
  const rewardLine = reward ? `\n${reward}`  : '';
  const cmsgLine   = cmsg   ? `\n${cmsg}`    : '';
  const instTag    = instance ? ` **(Instance ${instanceNum})**` : '';

  if (isPreShb(exp)) {
    const ts = buildRelativeTimestamp(startInMin);
    return `.msh "On **${world}** at ${map} - **${aeth}**${instTag} in ${ts}${cmsgLine}\n:book: Expansion: **${expLabel}**\n:dart: Targets : ${tgt}/${maxTgt}${rewardLine}\n:train2: Speed: ${speedStr}\n:eyes: Scouts: *${scouts}*${progLine}\n:person_gesturing_ok:" ${expNum}`;
  }
  return `.sh ${world} "${map} - **${aeth}**${instTag}${cmsgLine}\n:book: Expansion: **${expLabel}**\n:dart: Targets : ${tgt}/${maxTgt}${rewardLine}\n:train2: Speed: ${speedStr}\n:eyes: Scouts: *${scouts}*${progLine}\n:person_gesturing_ok:" ${expNum}`;
}

/* ── Visual HTML (rendered in the preview box) ──────────────── */
function buildVisualHTML(exp) {
  const { world, speedStr, map, aeth, tgt, maxTgt, scouts, cmsg, instance, instanceNum, prog, reward, startInMin, expNum } = buildParts(exp);
  const expLabel   = EXP_LABELS[exp];
  const instTag    = instance ? ` <span class="pv-bold">(Instance ${instanceNum})</span>` : '';
  const progLine   = prog
    ? `\n<span class="pv-italic">${escHtml(prog)}</span>`
    : '';
  const rewardLine = reward ? `\n${escHtml(reward)}` : '';
  const cmsgLine   = cmsg   ? `\n${escHtml(cmsg)}`   : '';

  if (isPreShb(exp)) {
    const ts = escHtml(buildRelativeTimestamp(startInMin));
    return `.msh "\n`
      + `On <span class="pv-bold">${escHtml(world)}</span> at ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag} in ${ts}${cmsgLine}\n`
      + `:book: Expansion: <span class="pv-bold">${escHtml(expLabel)}</span>\n`
      + `:dart: Targets : ${escHtml(tgt)}/${escHtml(String(maxTgt))}${rewardLine}\n`
      + `:train2: Speed: ${escHtml(speedStr)}\n`
      + `:eyes: Scouts: <span class="pv-italic">${escHtml(scouts)}</span>`
      + `${progLine}\n:person_gesturing_ok:\n" ${expNum}`;
  }

  return `.sh ${escHtml(world)} "\n`
    + `${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag}${cmsgLine}\n`
    + `:book: Expansion: <span class="pv-bold">${escHtml(expLabel)}</span>\n`
    + `:dart: Targets : ${escHtml(tgt)}/${escHtml(String(maxTgt))}${rewardLine}\n`
    + `:train2: Speed: ${escHtml(speedStr)}\n`
    + `:eyes: Scouts: <span class="pv-italic">${escHtml(scouts)}</span>`
    + `${progLine}\n:person_gesturing_ok:\n" ${expNum}`;
}

/* ── CWL1 join-message (separate copyable text) ─────────────── */
function buildCwl1Raw(exp) {
  const { world, map, aeth, instance, instanceNum, startInMin } = buildParts(exp);
  const expLabel = EXP_LABELS[exp];
  const timing = isPreShb(exp) ? `${parseInt(startInMin, 10) || 5}min` : '10mins';
  const instTag = instance ? ` **(Instance ${instanceNum})**` : '';
  return `/cwl1 Running a ${expLabel} A-Rank Hunt Train on ${world} in ${timing}. Join at ${map} - ${aeth}${instTag} if you want to hunt together <3`;
}

function buildCwl1Visual(exp) {
  const { world, map, aeth, instance, instanceNum, startInMin } = buildParts(exp);
  const expLabel = EXP_LABELS[exp];
  const timing = isPreShb(exp) ? `${parseInt(startInMin, 10) || 5}min` : '10mins';
  const instTag = instance ? ` <span class="pv-bold">(Instance ${instanceNum})</span>` : '';
  return `/cwl1 Running a <span class="pv-bold">${escHtml(expLabel)}</span> A-Rank Hunt Train on <span class="pv-bold">${escHtml(world)}</span> in ${timing}. Join at ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag} if you want to hunt together &lt;3`;
}

/* ── Scouts macro (separate copyable text, per expansion) ────── */
function buildScoutsRaw(exp) {
  const { scouts } = buildParts(exp);
  const cmd = isPreShb(exp) ? '/msh' : '/sh';
  return `${cmd} This train was scouted by ${scouts}\n/p This train was scouted by ${scouts}`;
}

function buildScoutsVisual(exp) {
  const { scouts } = buildParts(exp);
  const cmd = isPreShb(exp) ? '/msh' : '/sh';
  return `${cmd} This train was scouted by <span class="pv-italic">${escHtml(scouts)}</span>\n/p This train was scouted by <span class="pv-italic">${escHtml(scouts)}</span>`;
}

/* ── Merged (no-breaks) builders ─────────────────────────────── */

/* Combine scout names across expansions.
   Same names everywhere -> single string; different -> "A (ShB), B (EW) and C (DT)" */
function combineScouts() {
  const entries = selectedExps.map(exp => ({
    exp,
    scouts: (expData[exp]?.scouts || '').trim() || 'myself',
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
  const { world, speedStr, map, aeth, cmsg, instance, instanceNum, startInMin } = buildParts(first);
  const expLabels = selectedExps.map(e => EXP_LABELS[e]).join(' & ');
  const targets   = selectedExps
    .map(e => `${expData[e]?.targets || 'XX'}/${expData[e]?.maxTargets || 12}`)
    .join(' & ');
  const scouts    = combineScouts();
  const reward    = buildMergedRewardLine();
  const prog      = noBreaksProg ? buildProgText(first) : null;
  return { first, world, speedStr, map, aeth, cmsg, instance, instanceNum, startInMin, expLabels, targets, scouts, reward, prog, expNum: EXP_NUMS[first] };
}

/* A merged train starting on ARR/HW/SB uses that expansion's scheduled
   .msh format (with a start timestamp), like its single-expansion command. */
function buildMergedRawCmd() {
  const { first, world, speedStr, map, aeth, cmsg, instance, instanceNum, startInMin, expLabels, targets, scouts, reward, prog, expNum } = buildMergedParts();
  const cmsgLine   = cmsg   ? `\n${cmsg}`   : '';
  const rewardLine = reward ? `\n${reward}` : '';
  const progLine   = prog   ? `\n*${prog}*` : '';
  const instTag    = instance ? ` **(Instance ${instanceNum})**` : '';
  const head = isPreShb(first)
    ? `.msh "On **${world}** at ${map} - **${aeth}**${instTag} in ${buildRelativeTimestamp(startInMin)}`
    : `.sh ${world} "${map} - **${aeth}**${instTag}`;
  return `${head}${cmsgLine}\n:book: Expansions: **${expLabels}**\n:dart: Targets : ${targets}${rewardLine}\n:train2: Speed: ${speedStr}\n:eyes: Scouts: *${scouts}*${progLine}\n:person_gesturing_ok:" ${expNum}`;
}

function buildMergedVisualHTML() {
  const { first, world, speedStr, map, aeth, cmsg, instance, instanceNum, startInMin, expLabels, targets, scouts, reward, prog, expNum } = buildMergedParts();
  const cmsgLine   = cmsg   ? `\n${escHtml(cmsg)}`   : '';
  const rewardLine = reward ? `\n${escHtml(reward)}` : '';
  const progLine   = prog   ? `\n<span class="pv-italic">${escHtml(prog)}</span>` : '';
  const instTag    = instance ? ` <span class="pv-bold">(Instance ${instanceNum})</span>` : '';
  const head = isPreShb(first)
    ? `.msh "\nOn <span class="pv-bold">${escHtml(world)}</span> at ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag} in ${escHtml(buildRelativeTimestamp(startInMin))}`
    : `.sh ${escHtml(world)} "\n${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag}`;
  return head
    + `${cmsgLine}\n`
    + `:book: Expansions: <span class="pv-bold">${escHtml(expLabels)}</span>\n`
    + `:dart: Targets : ${escHtml(targets)}${rewardLine}\n`
    + `:train2: Speed: ${escHtml(speedStr)}\n`
    + `:eyes: Scouts: <span class="pv-italic">${escHtml(scouts)}</span>`
    + `${progLine}\n:person_gesturing_ok:\n" ${expNum}`;
}

/* Mid-train starting-location announcements (expansions 2+) */
function buildMshRaw(exp) {
  const { world, map, aeth, cmsg, instance, instanceNum } = buildParts(exp);
  const cm = cmsg ? ` ${cmsg}` : '';
  const instTag = instance ? ` **(Instance ${instanceNum})**` : '';
  return `.msh "[${world}] ${map} - **${aeth}**${instTag} will be the starting location for the **${EXP_LABELS[exp]}** expansion.${cm}" ${EXP_NUMS[exp]}`;
}

function buildMshVisual(exp) {
  const { world, map, aeth, cmsg, instance, instanceNum } = buildParts(exp);
  const cm = cmsg ? ` ${escHtml(cmsg)}` : '';
  const instTag = instance ? ` <span class="pv-bold">(Instance ${instanceNum})</span>` : '';
  return `.msh "[${escHtml(world)}] ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag} will be the starting location for the <span class="pv-bold">${escHtml(EXP_LABELS[exp])}</span> expansion.${cm}" ${EXP_NUMS[exp]}`;
}

/* "Train will shortly arrive in..." — a second heads-up message per
   mid-train expansion, meant to be copied right after the starting-location
   message above once the train is actually about to reach that leg. */
function buildMshArriveRaw(exp) {
  const { world, map, aeth, instance, instanceNum } = buildParts(exp);
  const instTag = instance ? ` **(Instance ${instanceNum})**` : '';
  return `.msh "Train will shortly arrive in [${world}] ${map} - **${aeth}**${instTag} for the **${EXP_LABELS[exp]}** expansion." ${EXP_NUMS[exp]}`;
}

function buildMshArriveVisual(exp) {
  const { world, map, aeth, instance, instanceNum } = buildParts(exp);
  const instTag = instance ? ` <span class="pv-bold">(Instance ${instanceNum})</span>` : '';
  return `.msh "Train will shortly arrive in [${escHtml(world)}] ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag} for the <span class="pv-bold">${escHtml(EXP_LABELS[exp])}</span> expansion." ${EXP_NUMS[exp]}`;
}

function buildMergedCwl1Raw() {
  const { first, world, map, aeth, instance, instanceNum, startInMin, expLabels } = buildMergedParts();
  const timing = isPreShb(first) ? `${parseInt(startInMin, 10) || 5}min` : '10mins';
  const instTag = instance ? ` **(Instance ${instanceNum})**` : '';
  const breakNote = selectedExps.length === 2
    ? 'There will be no break between the expansions.'
    : 'There will be no breaks between the expansions.';
  return `/cwl1 Running a ${expLabels} A-Rank Hunt Train on ${world} in ${timing}. ${breakNote} Join at ${map} - ${aeth}${instTag} if you want to hunt together <3`;
}

function buildMergedCwl1Visual() {
  const { first, world, map, aeth, instance, instanceNum, startInMin, expLabels } = buildMergedParts();
  const timing = isPreShb(first) ? `${parseInt(startInMin, 10) || 5}min` : '10mins';
  const instTag = instance ? ` <span class="pv-bold">(Instance ${instanceNum})</span>` : '';
  const breakNote = selectedExps.length === 2
    ? 'There will be no break between the expansions.'
    : 'There will be no breaks between the expansions.';
  return `/cwl1 Running a <span class="pv-bold">${escHtml(expLabels)}</span> A-Rank Hunt Train on <span class="pv-bold">${escHtml(world)}</span> in ${timing}. ${breakNote} Join at ${escHtml(map)} - <span class="pv-bold">${escHtml(aeth)}</span>${instTag} if you want to hunt together &lt;3`;
}

function buildMergedScoutsRaw() {
  const s = combineScouts();
  const cmd = isPreShb(selectedExps[0]) ? '/msh' : '/sh';
  return `${cmd} This train was scouted by ${s}\n/p This train was scouted by ${s}`;
}

function buildMergedScoutsVisual() {
  const s = escHtml(combineScouts());
  const cmd = isPreShb(selectedExps[0]) ? '/msh' : '/sh';
  return `${cmd} This train was scouted by <span class="pv-italic">${s}</span>\n/p This train was scouted by <span class="pv-italic">${s}</span>`;
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

  // Scouts is no longer required — a blank field defaults to "myself".
  document.getElementById(`scouts-${exp}`)?.classList.remove('field-invalid');

  if (isPreShb(exp)) {
    const startInput = document.getElementById(`starttime-${exp}`);
    const startOk = !!(expData[exp]?.startInMin);
    startInput?.classList.toggle('field-invalid', !startOk);
    if (!startOk) valid = false;
  }

  return valid;
}

/* ── Click-to-copy handler ──────────────────────────────────── */
function copyCmd(exp, el) {
  if (!validateFields(exp)) {
    flashInvalid(el);
    return;
  }
  const raw = buildRawCmd(exp);
  copyToClipboard(raw, el).then(ok => { if (ok) startCurrentTrainTimer(exp); });
}

/* Copying a main command starts this train's countdown: the scheduled
   start time for ARR/HW/SB, else the default 10:30. */
function startCurrentTrainTimer(exp) {
  const secs = isPreShb(exp)
    ? (parseInt(expData[exp]?.startInMin, 10) || 5) * 60
    : window.TIMER_DEFAULT_DURATION;
  const train = trains[activeTrain];
  TrainTimers.start(train.id, secs, trainLabel(train.state), trainSpokenName(train.state));
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
  copyToClipboard(buildMergedRawCmd(), el).then(ok => { if (ok) startCurrentTrainTimer(selectedExps[0]); });
}

function copyMsh(exp, el) {
  if (!validateFields(exp)) { flashInvalid(el); return; }
  copyToClipboard(buildMshRaw(exp), el);
}

function copyMshArrive(exp, el) {
  if (!validateFields(exp)) { flashInvalid(el); return; }
  copyToClipboard(buildMshArriveRaw(exp), el);
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

/* Briefly mark a command box (state class + hint text), then restore it. */
function flashHint(el, cls, html, ms = 1800) {
  const hint = el.querySelector('.copy-hint');
  clearTimeout(el._flashTimer);
  el.classList.remove('copied', 'blocked');
  el.classList.add(cls);
  hint.innerHTML = html;
  el._flashTimer = setTimeout(() => {
    el.classList.remove(cls);
    hint.innerHTML = '<i class="ti ti-copy"></i> Click to copy';
  }, ms);
}

function flashInvalid(el) {
  flashHint(el, 'blocked', '<i class="ti ti-alert-triangle"></i> Fill required fields');
}

/* Copy text; resolves true only if it really reached the clipboard.
   Falls back to execCommand where the Clipboard API is missing or
   blocked (e.g. the page opened as a local file). */
function writeClipboard(text) {
  const legacy = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    return ok;
  };
  if (!navigator.clipboard?.writeText) return Promise.resolve(legacy());
  return navigator.clipboard.writeText(text).then(() => true, () => legacy());
}

function copyToClipboard(text, el) {
  return writeClipboard(text).then(ok => {
    if (ok) flashHint(el, 'copied', '<i class="ti ti-check"></i> Copied!');
    else    flashHint(el, 'blocked', '<i class="ti ti-alert-triangle"></i> Copy failed: your browser blocked the clipboard', 4000);
    return ok;
  });
}

/* ── Render preview area ────────────────────────────────────── */
function update() {
  updateProgPreviews();
  syncTrainState();

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
    <div class="preview-block" style="--exp: var(--exp-color-${exp})">
      ${expArtHTML(exp)}
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
    <div class="preview-exp-label" style="margin-top:.6rem">
      <span class="exp-icon">${EXP_ICONS[exp]}</span> ${EXP_LABELS[exp]} — mid-train starting announcement
    </div>
    <div class="preview-visual" id="pvma-${exp}" onclick="copyMshArrive('${exp}', this)">
      <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildMshArriveVisual(exp)}
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
    <div class="preview-block" style="--exp: var(--exp-color-${first})">
      ${expArtHTML(first)}
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

/* ── Train state: shareable link + tabs ─────────────────────── */
/* One train = the whole form, encoded as URL parameters, e.g.
   w=Phoenix&e=ShB.DT&ShB.m=Lakeland&ShB.a=Fort+Jobb&ShB.t=8
   Default values are left out, so a blank train encodes to ''.
   The page's #hash always mirrors the active tab; all tabs are kept
   in localStorage so prepared trains survive a reload. Each tab has a
   stable id, which its countdown (js/timer.js) is keyed by. */
const TRAINS_STORAGE_KEY = 'hunt-train-trains-v1';
let trains      = [newTrain()];   // one { id, state } per tab; state = encoded train
let activeTrain = 0;

function newTrain(state = '') {
  return { id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, state };
}

function serializeTrain() {
  const p = new URLSearchParams();
  const set = (key, value) => { if (value) p.set(key, value); };

  set('w', getComboVal('combo-world'));
  if (selectedSpeed !== 'relaxed') p.set('sp', selectedSpeed);
  if (selectedSpeed === 'custom') set('cs', val('speed-custom'));
  set('gif', val('gif-url'));
  set('e', selectedExps.join('.'));
  if (noBreaks) {
    p.set('nb', '1');
    if (!noBreaksProg) p.set('nbp', '0');
    if (noBreaksRewards) p.set('nbr', '1');
  }

  selectedExps.forEach(exp => {
    const d = expData[exp];
    set(`${exp}.m`, getComboVal(`combo-map-${exp}`));
    set(`${exp}.a`, getComboVal(`combo-aeth-${exp}`));
    set(`${exp}.t`, d.targets);
    if (d.maxTargets !== '12') set(`${exp}.max`, d.maxTargets);
    if (d.instance) set(`${exp}.i`, d.instanceNum);
    if (isPreShb(exp) && d.startInMin !== '5') set(`${exp}.st`, d.startInMin);
    set(`${exp}.msg`, d.customMsg);
    set(`${exp}.sc`, d.scouts);
    if (d.progEnabled) p.set(`${exp}.p`, '1');
    if (d.showRewards) p.set(`${exp}.r`, '1');
  });

  return p.toString();
}

/* Load an encoded train into the form, replacing whatever is there.
   Every value goes through the same clamps as typed input. */
function applyTrain(encoded) {
  const p = new URLSearchParams(encoded);
  const get = key => (p.get(key) || '').trim();

  initWorldCombo(get('w'));

  const sp = get('sp') || 'relaxed';
  selectedSpeed = ['slow', 'relaxed', 'fast', 'custom'].includes(sp) ? sp : 'relaxed';
  document.querySelectorAll('#speed-pills .pill')
    .forEach(x => x.classList.toggle('active', x.dataset.speed === selectedSpeed));
  const customSpeed = document.getElementById('speed-custom');
  customSpeed.value = get('cs');
  customSpeed.classList.toggle('show', selectedSpeed === 'custom');

  document.getElementById('gif-url').value = get('gif');
  syncGifPicks();
  updateGifPreview();
  updateGifNameRow();

  selectedExps = EXP_ORDER.filter(e => get('e').split('.').includes(e));
  expData = {};
  selectedExps.forEach(exp => {
    const d = newExpData();
    d.mapIdx      = Math.max(0, ZONES[exp].findIndex(z => z.map === get(`${exp}.m`)));
    d.aeth        = get(`${exp}.a`);
    d.maxTargets  = get(`${exp}.max`) ? clampMaxTargets(get(`${exp}.max`)) : '12';
    d.targets     = clampTargets(get(`${exp}.t`), d.maxTargets);
    d.instance    = !!get(`${exp}.i`) && parseInt(d.maxTargets, 10) > 12;
    if (d.instance) d.instanceNum = clampInstanceNum(get(`${exp}.i`));
    if (get(`${exp}.st`)) d.startInMin = clampMinutes(get(`${exp}.st`));
    d.customMsg   = get(`${exp}.msg`);
    d.scouts      = get(`${exp}.sc`);
    d.progEnabled = get(`${exp}.p`) === '1';
    d.showRewards = get(`${exp}.r`) === '1';
    expData[exp] = d;
  });
  document.querySelectorAll('#exp-pills .pill')
    .forEach(x => x.classList.toggle('active', selectedExps.includes(x.dataset.exp)));

  noBreaks        = get('nb') === '1' && selectedExps.length > 1;
  noBreaksProg    = get('nbp') !== '0';
  noBreaksRewards = get('nbr') === '1';

  renderTrainOptions();
  renderExpSections();
  update();
}

/* Short tab / timer name for an encoded train, e.g. "Phoenix · ShB > DT". */
function trainLabel(encoded) {
  const p     = new URLSearchParams(encoded);
  const world = p.get('w') || 'New train';
  const exps  = (p.get('e') || '').split('.').filter(Boolean);
  return exps.length ? `${world} · ${exps.join(' > ')}` : world;
}

/* How spoken timer cues name a train: its world. */
function trainSpokenName(encoded) {
  return new URLSearchParams(encoded).get('w') || 'New train';
}

/* Called from update(): record the active train, mirror it into the
   address bar (replaceState, so typing doesn't flood Back), and persist. */
function syncTrainState() {
  const train   = trains[activeTrain];
  const encoded = serializeTrain();
  train.state = encoded;
  history.replaceState(null, '', encoded ? `#${encoded}` : location.pathname + location.search);
  try {
    localStorage.setItem(TRAINS_STORAGE_KEY, JSON.stringify({ trains, active: activeTrain }));
  } catch {}
  renderTrainTabs();
  TrainTimers.setCurrent(train.id, trainLabel(encoded), trainSpokenName(encoded));
}

function renderTrainTabs() {
  const bar = document.getElementById('train-tabs');
  bar.innerHTML = trains.map((t, i) => `
    <div class="train-tab${i === activeTrain ? ' active' : ''}" onclick="switchTrain(${i})" title="${escAttr(trainLabel(t.state))}">
      <span class="train-tab-label">${escHtml(trainLabel(t.state))}</span>
      <span class="train-tab-timer" data-train-id="${t.id}"></span>
      ${trains.length > 1 ? `<button type="button" class="train-tab-close" title="Close this train"
              onclick="event.stopPropagation(); closeTrain(${i})"><i class="ti ti-x"></i></button>` : ''}
    </div>
  `).join('') + `
    <button type="button" class="train-tab-add" title="Prepare another train" onclick="addTrain()">
      <i class="ti ti-plus"></i>
    </button>`;
  updateTabTimers();
}

/* Remaining time on each tab with a timer, refreshed on every timer tick. */
function updateTabTimers() {
  document.querySelectorAll('.train-tab-timer').forEach(el => {
    const st = TrainTimers.status(el.dataset.trainId);
    el.textContent = st ? st.text : '';
    el.className = `train-tab-timer${st ? ' ' + st.state : ''}`;
  });
}
document.addEventListener('traintimers:tick', updateTabTimers);

/* A timer card's name was clicked: show that train. */
document.addEventListener('traintimers:open', e => {
  const idx = trains.findIndex(t => t.id === e.detail);
  if (idx >= 0) switchTrain(idx);
});

function switchTrain(idx) {
  if (idx === activeTrain) return;
  activeTrain = idx;
  applyTrain(trains[idx].state);
}

function addTrain(encoded = '') {
  trains.push(newTrain(encoded));
  activeTrain = trains.length - 1;
  applyTrain(encoded);
}

function closeTrain(idx) {
  const closing = trains[idx];
  const timer   = TrainTimers.status(closing.id);
  if ((closing.state || timer) && !confirm(`Close "${trainLabel(closing.state)}"? Its entries${timer ? ' and its timer' : ''} will be lost.`)) return;
  TrainTimers.remove(closing.id);
  trains.splice(idx, 1);
  const wasActive = idx === activeTrain;
  if (idx < activeTrain) activeTrain--;
  activeTrain = Math.min(activeTrain, trains.length - 1);
  if (wasActive) applyTrain(trains[activeTrain].state);
  else syncTrainState();
}

/* Open a train link: reuse a tab already holding exactly this train,
   else fill the current tab if it's blank, else open a new tab. */
function openTrainLink(hash) {
  const encoded = new URLSearchParams(hash).toString();
  const existing = trains.findIndex(t => t.state === encoded);
  if (existing >= 0) {
    activeTrain = existing;
  } else if (!trains[activeTrain].state) {
    trains[activeTrain].state = encoded;
  } else {
    trains.push(newTrain(encoded));
    activeTrain = trains.length - 1;
  }
  applyTrain(trains[activeTrain].state);
}

/* Saved tabs; older saves stored bare encoded strings, which get ids here. */
function loadSavedTrains() {
  try {
    const saved = JSON.parse(localStorage.getItem(TRAINS_STORAGE_KEY));
    if (Array.isArray(saved?.trains) && saved.trains.length) {
      trains = saved.trains.map(t => typeof t === 'string'
        ? newTrain(t)
        : { id: String(t.id || newTrain().id), state: String(t.state || '') });
      activeTrain = Math.min(Math.max(0, parseInt(saved.active, 10) || 0), trains.length - 1);
    }
  } catch {}
  TrainTimers.prune(trains.map(t => t.id));
}

/* Pasting a different train link into the address bar of an open page. */
window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1);
  if (hash !== trains[activeTrain].state) openTrainLink(hash);
});

function flashButton(btn, text) {
  const label = btn.querySelector('span');
  label.dataset.original ??= label.textContent;
  label.textContent = text;
  clearTimeout(btn._flashTimer);
  btn._flashTimer = setTimeout(() => { label.textContent = label.dataset.original; }, 1800);
}

document.getElementById('train-copy-link').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  writeClipboard(location.href).then(ok => flashButton(btn, ok ? 'Copied!' : 'Copy failed'));
});

document.getElementById('train-duplicate').addEventListener('click', () => {
  addTrain(trains[activeTrain].state);
});

document.getElementById('train-clear').addEventListener('click', () => {
  if (trains[activeTrain].state && !confirm('Clear every entry of this train?')) return;
  applyTrain('');
});

/* ── Init ───────────────────────────────────────────────────── */
loadSavedTrains();
if (location.hash.length > 1) openTrainLink(location.hash.slice(1));
else applyTrain(trains[activeTrain].state);