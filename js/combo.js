/* js/combo.js — reusable searchable combobox */

let activeComboList = null;

document.addEventListener('click', (e) => {
  if (activeComboList && !e.target.closest('.combo')) {
    activeComboList.classList.remove('open');
    activeComboList = null;
  }
});

/**
 * Turn a container element into a searchable combobox.
 *
 * @param {string}   containerId  - id of the .combo wrapper element
 * @param {string[]} options      - list of option strings
 * @param {string}   placeholder  - input placeholder text
 * @param {Function} onSelect     - called with the chosen value whenever it changes
 * @param {string}   [initial]    - pre-selected value
 * @returns {HTMLElement}  the wrapper element (with ._getValue / ._setValue helpers)
 */
function makeCombo(containerId, options, placeholder, onSelect, initial = '') {
  const wrap = document.getElementById(containerId);
  if (!wrap) return null;
  wrap.innerHTML = '';

  let current = initial;
  let focusIdx = -1;

  /* ── Input ── */
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'combo-input';
  inp.placeholder = placeholder;
  inp.value = current;
  inp.autocomplete = 'off';

  /* ── Chevron icon ── */
  const arrow = document.createElement('i');
  arrow.className = 'ti ti-chevron-down combo-arrow';
  arrow.setAttribute('aria-hidden', 'true');

  /* ── Dropdown list ── */
  const list = document.createElement('div');
  list.className = 'combo-list';

  /* ── Build / filter option rows ── */
  function buildList(filter) {
    list.innerHTML = '';
    focusIdx = -1;
    const f = (filter || '').toLowerCase();
    const filtered = options.filter(o => o.toLowerCase().includes(f));

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'combo-empty';
      empty.textContent = 'No matches';
      list.appendChild(empty);
      return;
    }

    filtered.forEach(o => {
      const opt = document.createElement('div');
      opt.className = 'combo-opt';
      opt.textContent = o;
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        commit(o);
      });
      list.appendChild(opt);
    });
  }

  function commit(value) {
    current = value;
    inp.value = value;
    closeList();
    onSelect(value);
  }

  function openList() {
    if (activeComboList && activeComboList !== list) {
      activeComboList.classList.remove('open');
    }
    activeComboList = list;
    buildList(inp.value === current ? '' : inp.value);
    list.classList.add('open');
    focusIdx = -1;
  }

  function closeList() {
    list.classList.remove('open');
    if (activeComboList === list) activeComboList = null;
  }

  function moveFocus(dir) {
    const opts = [...list.querySelectorAll('.combo-opt')];
    focusIdx = Math.max(0, Math.min(focusIdx + dir, opts.length - 1));
    opts.forEach((o, i) => o.classList.toggle('focused', i === focusIdx));
    opts[focusIdx]?.scrollIntoView({ block: 'nearest' });
  }

  /* ── Events ── */
  inp.addEventListener('focus', () => { inp.select(); openList(); });

  inp.addEventListener('input', () => {
    buildList(inp.value);
    list.classList.add('open');
  });

  inp.addEventListener('keydown', (e) => {
    const opts = [...list.querySelectorAll('.combo-opt')];
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); moveFocus(+1); break;
      case 'ArrowUp':   e.preventDefault(); moveFocus(-1); break;
      case 'Enter':
        e.preventDefault();
        if (focusIdx >= 0 && opts[focusIdx]) commit(opts[focusIdx].textContent);
        else if (opts.length === 1)           commit(opts[0].textContent);
        else { current = inp.value; closeList(); onSelect(inp.value); }
        break;
      case 'Tab':
        if (opts.length === 1) commit(opts[0].textContent);
        else { current = inp.value; closeList(); onSelect(inp.value); }
        break;
      case 'Escape':
        inp.value = current;
        closeList();
        break;
    }
  });

  inp.addEventListener('blur', () => {
    setTimeout(() => {
      if (!inp.value) { current = ''; onSelect(''); }
      else if (!options.includes(inp.value)) onSelect(inp.value);
      else current = inp.value;
      closeList();
    }, 150);
  });

  wrap.appendChild(inp);
  wrap.appendChild(arrow);
  wrap.appendChild(list);

  /* ── Public helpers ── */
  wrap._getValue = () => inp.value.trim();
  wrap._setValue = (v) => { current = v; inp.value = v; };

  return wrap;
}
