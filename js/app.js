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

/* ── Click-to-copy handler ──────────────────────────────────── */
function copyCmd(exp, el) {
  const raw = buildRawCmd(exp);
  copyToClipboard(raw, el);
}

function copyCwl1(exp, el) {
  const raw = buildCwl1Raw(exp);
  copyToClipboard(raw, el);
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
    <div class="preview-block" ${i > 0 ? 'style="margin-top:1rem"' : ''}>
      <div class="preview-exp-label">${EXP_LABELS[exp]}</div>
      <div class="preview-visual" id="pv-${exp}" onclick="copyCmd('${exp}', this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildVisualHTML(exp)}
      </div>
      <div class="preview-exp-label" style="margin-top:.6rem">Join message</div>
      <div class="preview-visual" id="pvc-${exp}" onclick="copyCwl1('${exp}', this)">
        <span class="copy-hint"><i class="ti ti-copy"></i> Click to copy</span>${buildCwl1Visual(exp)}
      </div>
    </div>
  `).join('');
}

/* ── Init ───────────────────────────────────────────────────── */
update();