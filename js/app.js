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
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
document.querySelectorAll('.gif-pick').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('gif-url').value = btn.dataset.url;
    syncGifPicks();
    update();
  });
});

document.getElementById('gif-url').addEventListener('input', () => {
  syncGifPicks();
  update();
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
               oninput="setField('${exp}', 'targets', this.value)" />
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
  expData[exp][key] = value;
  updateProgPreviews();
  update();
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

/* ── Build command data ─────────────────────────────────────── */
function buildCommandData() {
  const world    = getComboVal('combo-world') || 'WORLD';
  const speed    = getSpeed();
  const gif      = val('gif-url');
  const speedStr = gif ? `[${speed}](${gif})` : `[${speed}]`;

  return selectedExps.map(exp => {
    const d      = expData[exp] || {};
    const map    = getComboVal(`combo-map-${exp}`)  || ZONES[exp][0]?.map || 'MAP';
    const aeth   = getComboVal(`combo-aeth-${exp}`) || d.aeth || 'AETHERYTE';
    const tgt    = d.targets || 'XX';
    const scouts = d.scouts  || 'NAMES';
    const prog   = (d.progEnabled && selectedExps.length > 1)
      ? ` *${buildProgText(exp)}*`
      : '';

    const rawCmd = `.sh ${world} "${map} - ${aeth} :book: Expansion: ${EXP_LABELS[exp]} :dart: Targets : ${tgt}/12 :train2: Speed: ${speedStr} :eyes: Scouts: ${scouts}${prog}" ${EXP_NUMS[exp]}`;

    return { exp, world, map, aeth, expLabel: EXP_LABELS[exp], tgt, speedStr, scouts, prog, expNum: EXP_NUMS[exp], rawCmd };
  });
}

/* ── Build visual (formatted) HTML for preview ──────────────── */
function buildVisualHTML(d) {
  const progLine = d.prog
    ? `<br><em>${escHtml(d.prog.replace(/^ \*/, '').replace(/\*$/, ''))}</em>`
    : '';

  return `.sh ${escHtml(d.world)} "<br>`
    + `${escHtml(d.map)} - <b>${escHtml(d.aeth)}</b><br>`
    + `:book: Expansion: <b>${escHtml(d.expLabel)}</b><br>`
    + `:dart: Targets : ${escHtml(d.tgt)}/12<br>`
    + `:train2: Speed: ${escHtml(d.speedStr)}<br>`
    + `:eyes: Scouts: <em>${escHtml(d.scouts)}</em>`
    + `${progLine}<br>" ${d.expNum}`;
}

/* ── Render preview area ────────────────────────────────────── */
function update() {
  updateProgPreviews();

  const area = document.getElementById('preview-area');

  if (selectedExps.length === 0) {
    area.innerHTML = '<p class="no-exps">Select at least one expansion above to generate a command.</p>';
    return;
  }

  const cmds = buildCommandData();

  const blocksHTML = cmds.map(c => `
    <div class="preview-block">
      <div class="preview-exp-label">${EXP_LABELS[c.exp]}</div>
      <div class="preview-visual">${buildVisualHTML(c)}</div>
      <div class="preview-raw">${escHtml(c.rawCmd)}</div>
      <div class="btn-row">
        <button class="btn" id="copybtn-${c.exp}" onclick="copyOne('${c.exp}')">
          <i class="ti ti-copy" aria-hidden="true"></i> Copy command
        </button>
      </div>
    </div>
  `).join('');

  const copyAllBtn = cmds.length > 1 ? `
    <div class="preview-block">
      <button class="btn" id="copybtn-all" onclick="copyAll()">
        <i class="ti ti-copy" aria-hidden="true"></i> Copy all commands
      </button>
    </div>
  ` : '';

  area.innerHTML = blocksHTML + copyAllBtn;
}

/* ── Copy helpers ───────────────────────────────────────────── */
function copyOne(exp) {
  const c = buildCommandData().find(x => x.exp === exp);
  if (!c) return;
  navigator.clipboard.writeText(c.rawCmd).then(() => {
    const btn = document.getElementById(`copybtn-${exp}`);
    btn.classList.add('ok');
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Copied!';
    setTimeout(() => {
      btn.classList.remove('ok');
      btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy command';
    }, 1600);
  });
}

function copyAll() {
  const text = buildCommandData().map(c => c.rawCmd).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copybtn-all');
    btn.classList.add('ok');
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Copied all!';
    setTimeout(() => {
      btn.classList.remove('ok');
      btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy all commands';
    }, 1600);
  });
}

/* ── Init ───────────────────────────────────────────────────── */
update();
