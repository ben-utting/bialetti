/* ============================================================
   brewlog.js — brew log form, storage, rendering, CSV export,
                troubleshooting accordion
   ============================================================ */

const BREWLOG_KEY = 'moka-brew-log';

// ---- Storage helpers ----

function getBrews() {
  try { return JSON.parse(localStorage.getItem(BREWLOG_KEY)) || []; }
  catch { return []; }
}

function saveBrews(brews) {
  localStorage.setItem(BREWLOG_KEY, JSON.stringify(brews));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---- Rating widget ----

const RATING_HINTS = {
  bitterness: '1 = barely bitter · 5 = harsh/dark',
  sourness:   '1 = flat · 5 = sharp/bright',
  sweetness:  '1 = none · 5 = caramel/fruit',
  body:       '1 = thin/watery · 5 = thick/syrupy',
};

function makeRatingWidget(name, label) {
  const wrap = document.createElement('div');
  wrap.className = 'rating-group';
  wrap.innerHTML = `<label>${label}</label>${RATING_HINTS[name] ? `<span class="rating-hint">${RATING_HINTS[name]}</span>` : ''}`;

  const stars = document.createElement('div');
  stars.className = 'rating-stars';
  stars.dataset.value = '3';

  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i;
    btn.dataset.val = i;
    if (i === 3) btn.classList.add('active');
    btn.addEventListener('click', () => {
      stars.dataset.value = i;
      stars.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', Number(b.dataset.val) === i);
      });
    });
    stars.appendChild(btn);
  }

  wrap.appendChild(stars);
  wrap._getValue = () => Number(stars.dataset.value);
  wrap._setValue = (v) => {
    stars.dataset.value = v;
    stars.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.val) === Number(v));
    });
  };
  return wrap;
}

// ---- Toggle widget ----

function makeToggle(options, defaultVal) {
  const wrap = document.createElement('div');
  wrap.className = 'toggle-group';
  wrap._value = defaultVal;

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toggle-btn' + (opt === defaultVal ? ' active' : '');
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      wrap._value = opt;
      wrap.querySelectorAll('.toggle-btn').forEach(b => {
        b.classList.toggle('active', b.textContent === opt);
      });
    });
    wrap.appendChild(btn);
  });

  wrap._getValue = () => wrap._value;
  wrap._setValue = (v) => {
    wrap._value = v;
    wrap.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.toggle('active', b.textContent === v);
    });
  };
  return wrap;
}

// ---- Build the form ----

function buildForm(container) {
  const today = new Date().toISOString().slice(0, 10);

  const card = document.createElement('div');
  card.className = 'brew-form-card';
  card.innerHTML = '<h2>Log a Brew</h2>';

  const grid = document.createElement('div');
  grid.className = 'form-grid';

  function field(labelText, inputEl, fullWidth) {
    const g = document.createElement('div');
    g.className = 'form-group' + (fullWidth ? ' full-width' : '');
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    g.appendChild(lbl);
    g.appendChild(inputEl);
    return g;
  }

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = today;

  const coffeeInput = document.createElement('input');
  coffeeInput.type = 'text';
  coffeeInput.placeholder = 'e.g. Has Bean Ethiopia Yirgacheffe';

  const roastSel = document.createElement('select');
  ['Light', 'Medium', 'Dark'].forEach(r => {
    const o = document.createElement('option');
    o.value = r;
    o.textContent = r;
    roastSel.appendChild(o);
  });
  roastSel.value = 'Medium';

  const doseInput = document.createElement('input');
  doseInput.type = 'number';
  doseInput.step = '0.1';
  doseInput.placeholder = '21';
  doseInput.min = '0';

  const grindInput = document.createElement('input');
  grindInput.type = 'text';
  grindInput.placeholder = 'e.g. 14 pumps or setting 14';

  const boilerSel = document.createElement('select');
  ['Full (to safety valve)', '3/4', '2/3'].forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    boilerSel.appendChild(o);
  });

  const yieldInput = document.createElement('input');
  yieldInput.type = 'number';
  yieldInput.step = '1';
  yieldInput.placeholder = '140';
  yieldInput.min = '0';

  // Ratings
  const ratingsWrap = document.createElement('div');
  ratingsWrap.className = 'ratings-grid';
  const rBitterness = makeRatingWidget('bitterness', 'Bitterness');
  const rSourness   = makeRatingWidget('sourness',   'Sourness / Acidity');
  const rSweetness  = makeRatingWidget('sweetness',  'Sweetness');
  const rBody       = makeRatingWidget('body',        'Body');
  ratingsWrap.append(rBitterness, rSourness, rSweetness, rBody);

  const notesTA = document.createElement('textarea');
  notesTA.placeholder = 'Observations, adjustments, anything worth remembering…';

  grid.appendChild(field('Date', dateInput));
  grid.appendChild(field('Coffee name', coffeeInput));
  grid.appendChild(field('Roast level', roastSel));
  grid.appendChild(field('Dose (g)', doseInput));
  grid.appendChild(field('Grind size', grindInput, false));
  grid.appendChild(field('Boiler fill', boilerSel));
  grid.appendChild(field('Yield (ml)', yieldInput));

  const ratingsContainer = document.createElement('div');
  ratingsContainer.className = 'form-group full-width';
  const ratingsLabel = document.createElement('label');
  ratingsLabel.textContent = 'Taste ratings';
  ratingsContainer.appendChild(ratingsLabel);
  ratingsContainer.appendChild(ratingsWrap);
  grid.appendChild(ratingsContainer);

  grid.appendChild(field('Notes', notesTA, true));

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn-save-brew';
  saveBtn.textContent = 'Save Brew';

  saveBtn.addEventListener('click', () => {
    const entry = {
      id:         generateId(),
      date:       dateInput.value || today,
      coffee:     coffeeInput.value.trim() || 'Unnamed coffee',
      roast:      roastSel.value,
      dose:       doseInput.value,
      grind:      grindInput.value.trim(),
      boiler:     boilerSel.value,
      yield:      yieldInput.value,
      bitterness: rBitterness._getValue(),
      sourness:   rSourness._getValue(),
      sweetness:  rSweetness._getValue(),
      body:       rBody._getValue(),
      notes:      notesTA.value.trim(),
    };

    const brews = getBrews();
    brews.unshift(entry);
    saveBrews(brews);
    renderLog(container.querySelector('.log-list'));

    // Reset form
    dateInput.value = new Date().toISOString().slice(0, 10);
    coffeeInput.value = '';
    roastSel.value = 'Medium';
    doseInput.value = '';
    grindInput.value = '';
    boilerSel.value = 'Full (to safety valve)';
    yieldInput.value = '';
    rBitterness._setValue(3);
    rSourness._setValue(3);
    rSweetness._setValue(3);
    rBody._setValue(3);
    notesTA.value = '';

    saveBtn.textContent = 'Saved ✓';
    saveBtn.style.background = '#4a7c4e';
    setTimeout(() => {
      saveBtn.textContent = 'Save Brew';
      saveBtn.style.background = '';
    }, 1800);
  });

  card.appendChild(grid);
  card.appendChild(saveBtn);
  container.appendChild(card);
}

// ---- Render dots ----

function renderDots(value, max) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    html += `<span class="rating-dot ${i <= value ? 'filled' : ''}"></span>`;
  }
  return html;
}

// ---- Render log entries ----

function renderLog(listEl) {
  const brews = getBrews();
  listEl.innerHTML = '';

  if (brews.length === 0) {
    listEl.innerHTML = '<div class="log-empty">No brews logged yet — make your first entry above.</div>';
    return;
  }

  brews.forEach((entry, idx) => {
    const card = document.createElement('div');
    card.className = 'brew-card';

    const header = document.createElement('div');
    header.className = 'brew-card-header';

    const expandBtn = document.createElement('button');
    expandBtn.className = 'brew-card-expand';
    expandBtn.innerHTML = '&#9660;';
    expandBtn.setAttribute('aria-label', 'Expand details');

    const details = document.createElement('div');
    details.className = 'brew-card-details';

    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('brew-card-delete')) return;
      details.classList.toggle('open');
      expandBtn.classList.toggle('open');
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'brew-card-delete';
    delBtn.innerHTML = '&#10005;';
    delBtn.setAttribute('aria-label', 'Delete entry');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete brew "${entry.coffee}" on ${entry.date}?`)) {
        const brews = getBrews();
        const updated = brews.filter(b => b.id !== entry.id);
        saveBrews(updated);
        renderLog(listEl);
      }
    });

    header.innerHTML = `
      <span class="brew-card-date">${entry.date}</span>
      <span class="brew-card-name">${entry.coffee}</span>
      <span class="brew-card-roast">${entry.roast}</span>
      ${entry.yield ? `<span class="brew-card-yield">${entry.yield} ml</span>` : ''}
      <div class="brew-card-ratings">
        <div class="rating-dot-group">
          <span class="rating-dot-label">Bit</span>
          <div class="rating-dots">${renderDots(entry.bitterness, 5)}</div>
        </div>
        <div class="rating-dot-group">
          <span class="rating-dot-label">Sour</span>
          <div class="rating-dots">${renderDots(entry.sourness, 5)}</div>
        </div>
        <div class="rating-dot-group">
          <span class="rating-dot-label">Sweet</span>
          <div class="rating-dots">${renderDots(entry.sweetness, 5)}</div>
        </div>
        <div class="rating-dot-group">
          <span class="rating-dot-label">Body</span>
          <div class="rating-dots">${renderDots(entry.body, 5)}</div>
        </div>
      </div>
    `;

    header.appendChild(expandBtn);
    header.appendChild(delBtn);

    details.innerHTML = `
      <div class="details-grid">
        ${entry.dose     ? `<div class="detail-item"><span class="detail-label">Dose</span><span class="detail-value">${entry.dose} g</span></div>` : ''}
        ${entry.grind    ? `<div class="detail-item"><span class="detail-label">Grind</span><span class="detail-value">${entry.grind}</span></div>` : ''}
        ${entry.boiler   ? `<div class="detail-item"><span class="detail-label">Boiler fill</span><span class="detail-value">${entry.boiler}</span></div>` : ''}
        ${entry.yield    ? `<div class="detail-item"><span class="detail-label">Yield</span><span class="detail-value">${entry.yield} ml</span></div>` : ''}
        ${entry.notes    ? `<div class="detail-item detail-notes full-width"><span class="detail-label">Notes</span><span class="detail-value">${entry.notes}</span></div>` : ''}
      </div>
    `;

    card.appendChild(header);
    card.appendChild(details);
    listEl.appendChild(card);
  });
}

// ---- CSV export ----

function exportCSV() {
  const brews = getBrews();
  if (brews.length === 0) { alert('No brews to export.'); return; }

  const cols = ['date','coffee','roast','dose','grind','boiler','yield','bitterness','sourness','sweetness','body','notes'];
  const header = cols.join(',');
  const rows = brews.map(b => cols.map(c => {
    const val = b[c] == null ? '' : String(b[c]);
    return val.includes(',') || val.includes('"') || val.includes('\n')
      ? `"${val.replace(/"/g, '""')}"`
      : val;
  }).join(','));

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'moka-brew-log.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Troubleshooting accordion ----

const TROUBLESHOOT_ITEMS = [
  {
    title: '"Coffee tastes bitter and harsh"',
    body: `<p>Most likely causes (in order):</p>
<ol>
  <li><strong>Heat too high</strong> — brew temperature got too hot towards the end</li>
  <li><strong>Brewed into the sputtering phase</strong> — uncondensed steam pushed through the puck</li>
  <li><strong>Grind too fine</strong> — building excessive pressure and temperature</li>
  <li><strong>Left coffee in hot pot</strong> — didn't pour immediately</li>
</ol>
<p><strong>Fix:</strong> lower the flame → stop earlier (or cold-tap sooner) → grind slightly coarser → pour immediately.</p>`
  },
  {
    title: '"Coffee tastes sour, thin, or weak"',
    body: `<p>Most likely causes:</p>
<ol>
  <li><strong>Low yield</strong> — not enough water through the coffee before stopping</li>
  <li><strong>Grind too coarse</strong> — insufficient extraction</li>
  <li><strong>Underfilled basket</strong> — not enough coffee</li>
  <li><strong>Starting with cold water</strong> — early brew temperature too low</li>
</ol>
<p><strong>Fix:</strong> check yield (aim for 130–150 ml) → grind finer → fill basket fully → use freshly boiled water.</p>`
  },
  {
    title: '"Brew stopped early / stalled"',
    body: `<p>Most likely causes:</p>
<ol>
  <li><strong>Heat cut too soon</strong> — not enough residual energy to finish</li>
  <li><strong>Grind too coarse</strong> — pressure discharged quickly</li>
  <li><strong>No diffusion plate</strong> — heat drops sharply when gas is cut</li>
</ol>
<p><strong>Fix:</strong> briefly reapply low heat for 10–15 seconds → consider adding a diffusion plate.</p>`
  },
  {
    title: '"Pot sputtering very early (low yield)"',
    body: `<p>Most likely causes:</p>
<ol>
  <li><strong>Heat too high</strong> — boiler overheated quickly</li>
  <li><strong>Grind too fine</strong> — excessive pressure build-up</li>
  <li><strong>Overfilled boiler</strong> — too much water heated aggressively</li>
</ol>
<p><strong>Fix:</strong> use lowest flame → grind slightly coarser → for dark roasts, fill boiler to 2/3 only.</p>`
  },
  {
    title: '"Leaking around the join"',
    body: `<p>Most likely cause: gasket degraded, cracked, or hardened — or pot not screwed together tightly enough.</p>
<p><strong>Fix:</strong> inspect the gasket. If it's hard, cracked, or visibly deteriorated, replace it. Bialetti 4-cup replacement gaskets are cheap and widely available.</p>`
  },
  {
    title: '"Coffee tastes fine but just too strong"',
    body: `<p>This is normal for Moka coffee. Try adding 80–100 ml of freshly boiled water to your cup (a "Moka Americano"). This typically:</p>
<ul>
  <li>Reduces intensity to a pleasant level</li>
  <li>Reveals sweetness hidden under concentration</li>
  <li>Balances the acidity beautifully</li>
</ul>
<p>Many people prefer Moka coffee this way, especially with lighter roasts.</p>`
  },
];

function buildTroubleshoot(container) {
  const section = document.createElement('div');
  section.className = 'troubleshoot-section';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'troubleshoot-toggle';
  toggleBtn.innerHTML = 'Troubleshooting Guide <span class="chevron">&#9660;</span>';

  const body = document.createElement('div');
  body.className = 'troubleshoot-body';

  toggleBtn.addEventListener('click', () => {
    body.classList.toggle('open');
    toggleBtn.classList.toggle('open');
  });

  TROUBLESHOOT_ITEMS.forEach(item => {
    const acc = document.createElement('div');
    acc.className = 'accordion-item';

    const trigger = document.createElement('button');
    trigger.className = 'accordion-trigger';
    trigger.innerHTML = `${item.title} <span class="acc-chevron">&#9660;</span>`;

    const accBody = document.createElement('div');
    accBody.className = 'accordion-body';
    accBody.innerHTML = item.body;

    trigger.addEventListener('click', () => {
      accBody.classList.toggle('open');
      trigger.classList.toggle('open');
    });

    acc.appendChild(trigger);
    acc.appendChild(accBody);
    body.appendChild(acc);
  });

  section.appendChild(toggleBtn);
  section.appendChild(body);
  container.appendChild(section);
}

// ---- Init brew log section ----

function initBrewLog() {
  const wrap = document.getElementById('content-brew-log');

  const outerWrap = document.createElement('div');
  outerWrap.className = 'brewlog-wrap';

  outerWrap.innerHTML = `
    <h1>Brew Log</h1>
    <p class="section-sub">Record each brew, track your variables, and find your sweet spot.</p>
  `;

  buildForm(outerWrap);

  // Log list header
  const logHeader = document.createElement('div');
  logHeader.className = 'log-header';
  logHeader.innerHTML = '<h2>Your Brews</h2>';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn-export';
  exportBtn.textContent = 'Export as CSV';
  exportBtn.addEventListener('click', exportCSV);
  logHeader.appendChild(exportBtn);

  outerWrap.appendChild(logHeader);

  const listEl = document.createElement('div');
  listEl.className = 'log-list';
  outerWrap.appendChild(listEl);

  renderLog(listEl);
  buildTroubleshoot(outerWrap);

  wrap.appendChild(outerWrap);
}

document.addEventListener('DOMContentLoaded', initBrewLog);
