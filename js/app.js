/* ============================================================
   app.js — navigation, markdown loading, kit list interactivity
   ============================================================ */

const SECTIONS = [
  { id: 'history',      file: '01-history.md',       type: 'markdown' },
  { id: 'how-it-works', file: '02-how-it-works.md',  type: 'markdown' },
  { id: 'recipe',       file: '03-recipe.md',         type: 'recipe'   },
  { id: 'science',      file: '04-science.md',        type: 'markdown' },
  { id: 'kit-list',     file: '05-shopping-list.md',  type: 'kit'      },
  { id: 'brew-log',     file: '06-brew-log.md',       type: 'brewlog'  },
];

const KIT_STORAGE_KEY = 'moka-kit-checked';

let currentSection = 'history';

// ---- Navigation ----

function activateSection(sectionId) {
  if (sectionId === currentSection) return;
  currentSection = sectionId;

  document.querySelectorAll('.nav-item, .tab-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === sectionId);
  });

  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.remove('active', 'fade-in');
  });

  const target = document.getElementById('section-' + sectionId);
  if (!target) return;
  target.classList.add('active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => target.classList.add('fade-in'));
  });

  // Scroll to top
  document.getElementById('main-content').scrollTop = 0;
}

function bindNav() {
  document.querySelectorAll('.nav-item, .tab-item').forEach(el => {
    el.addEventListener('click', () => activateSection(el.dataset.section));
  });
}

// ---- Markdown loading ----

async function loadMarkdown(file, targetEl) {
  try {
    const res = await fetch('content/' + file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    targetEl.innerHTML = marked.parse(text);
  } catch (e) {
    targetEl.innerHTML = `<div class="error-state">
      <p><strong>Could not load content.</strong></p>
      <p>Make sure the app is served from a web server (not opened as a file:// URL).</p>
      <p style="font-size:0.8em;opacity:0.7">${e.message}</p>
    </div>`;
  }
}

// ---- Recipe section ----

async function initRecipe() {
  const contentEl = document.getElementById('content-recipe');
  await loadMarkdown('03-recipe.md', contentEl);
}

// ---- Kit list section ----

const KIT_ITEMS = [
  { key: 'scales',    name: 'Digital kitchen scales (0.1g)',       priority: '⭐⭐⭐⭐⭐', cost: '£10–20' },
  { key: 'diffplate', name: 'Cast iron diffusion plate',           priority: '⭐⭐⭐⭐⭐', cost: '£10–25' },
  { key: 'aerofiltr', name: 'Aeropress paper filters',             priority: '⭐⭐⭐⭐',   cost: '£5–8' },
  { key: 'burr',      name: 'Burr grinder (manual)',               priority: '⭐⭐⭐⭐',   cost: '£45–90' },
  { key: 'gasket',    name: 'Replacement gasket kit',              priority: '⭐⭐⭐',     cost: '£5–10' },
  { key: 'wdt',       name: 'WDT needle tool',                     priority: '⭐⭐',       cost: '£8–20' },
  { key: 'jug',       name: 'Small measuring jug',                 priority: '⭐⭐',       cost: '£3–8' },
];

function getKitChecked() {
  try { return JSON.parse(localStorage.getItem(KIT_STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveKitChecked(state) {
  localStorage.setItem(KIT_STORAGE_KEY, JSON.stringify(state));
}

function renderKitChecklist(container) {
  const state = getKitChecked();
  container.innerHTML = '';

  KIT_ITEMS.forEach(item => {
    const checked = !!state[item.key];
    const div = document.createElement('label');
    div.className = 'kit-check-item' + (checked ? ' checked' : '');
    div.innerHTML = `
      <input type="checkbox" ${checked ? 'checked' : ''} data-key="${item.key}">
      <div class="kit-check-label">
        <div class="kit-check-name">${item.name}</div>
        <div class="kit-check-meta">${item.cost}</div>
      </div>
      <div class="kit-check-priority">${item.priority}</div>
    `;
    div.querySelector('input').addEventListener('change', e => {
      const s = getKitChecked();
      s[item.key] = e.target.checked;
      saveKitChecked(s);
      div.classList.toggle('checked', e.target.checked);
    });
    container.appendChild(div);
  });
}

async function initKitList() {
  const wrap = document.getElementById('content-kit-list');
  wrap.innerHTML = '';

  // Markdown prose
  const mdDiv = document.createElement('div');
  mdDiv.className = 'markdown-body kit-markdown';
  wrap.appendChild(mdDiv);
  await loadMarkdown('05-shopping-list.md', mdDiv);

  // Interactive checklist
  const checkSection = document.createElement('div');
  checkSection.className = 'kit-interactive';

  const header = document.createElement('div');
  header.className = 'kit-interactive-header';
  header.innerHTML = '<h2>Your Checklist</h2>';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-reset';
  resetBtn.textContent = 'Reset list';
  resetBtn.addEventListener('click', () => {
    saveKitChecked({});
    renderKitChecklist(listEl);
  });

  header.appendChild(resetBtn);
  checkSection.appendChild(header);

  const listEl = document.createElement('div');
  listEl.className = 'kit-checklist';
  checkSection.appendChild(listEl);

  wrap.appendChild(checkSection);
  renderKitChecklist(listEl);
}

// ---- Init all sections ----

async function initSections() {
  // Plain markdown sections
  for (const s of SECTIONS) {
    if (s.type === 'markdown') {
      await loadMarkdown(s.file, document.getElementById('content-' + s.id));
    }
  }
  await initRecipe();
  await initKitList();
  // Brew log is handled by brewlog.js
}

// ---- Boot ----

document.addEventListener('DOMContentLoaded', () => {
  marked.setOptions({ gfm: true, breaks: false });
  bindNav();
  initSections();

  // Start on history with fade-in
  const first = document.getElementById('section-history');
  if (first) {
    first.classList.add('active');
    requestAnimationFrame(() => requestAnimationFrame(() => first.classList.add('fade-in')));
  }
});
