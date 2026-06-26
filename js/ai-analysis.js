/* ============================================================
   ai-analysis.js — AI brew analysis via Claude API or OpenRouter
   ============================================================ */

const AI_PROVIDER_KEY     = 'moka-ai-provider';
const AI_KEY_CLAUDE_STORE = 'moka-ai-key-claude';
const AI_KEY_OR_STORE     = 'moka-ai-key-openrouter';
const AI_MODEL_OR_STORE   = 'moka-ai-model-openrouter';

const DEFAULT_OR_MODEL = 'anthropic/claude-haiku-4-5';

// ---- Storage helpers ----

function getProvider()       { return localStorage.getItem(AI_PROVIDER_KEY)     || 'openrouter'; }
function saveProvider(v)     { localStorage.setItem(AI_PROVIDER_KEY, v); }
function getClaudeKey()      { return localStorage.getItem(AI_KEY_CLAUDE_STORE) || ''; }
function getORKey()          { return localStorage.getItem(AI_KEY_OR_STORE)     || ''; }
function saveClaudeKey(k)    { localStorage.setItem(AI_KEY_CLAUDE_STORE, k.trim()); }
function saveORKey(k)        { localStorage.setItem(AI_KEY_OR_STORE, k.trim()); }
function getORModel()        { return localStorage.getItem(AI_MODEL_OR_STORE) || DEFAULT_OR_MODEL; }
function saveORModel(m)      { localStorage.setItem(AI_MODEL_OR_STORE, m.trim()); }

// ---- In-memory report cache (id → text) ----

const analysisCache = new Map();

// ---- Prompts ----

const SYSTEM_PROMPT = `You are a specialist moka pot brewing assistant. Analyse a single brew session and give concrete, actionable advice to improve the next brew.

**User's setup:**
- Pot: 4-cup Bialetti Moka Express
- Heat source: gas hob (cast iron diffusion plate available)
- Grinder: manual burr grinder

**Key technique reminders (reference when advising):**
- Always start with freshly boiled water in the boiler — never cold tap water
- Fill the basket fully and level — absolutely no tamping
- Light/medium roast: fill boiler to the safety valve. Dark roast: fill to 2/3
- Lowest possible flame on the smallest burner
- Lid open — cut the heat the moment liquid appears in the chamber
- If early sputtering starts, immediately run cold water over the base of the pot
- Pour immediately once done — never leave coffee sitting in a hot pot
- A cast iron diffusion plate significantly smooths out heat delivery

**User's target flavour profile (aim all advice toward this):**
- Bitterness: 2–3 / 5 (low-moderate — not harsh)
- Sourness / Acidity: 3–4 / 5 (present and bright, not sharp)
- Sweetness: 4–5 / 5 (high — caramel, fruit, honey notes)
- Body: 3–5 / 5 (medium to thick/syrupy — user strongly prefers a thick cup)

**Output format (use markdown headings):**
1. Brief overall assessment (2–3 sentences)
2. What went well
3. Main issues and why they happened
4. Specific changes to make next brew — prioritised by impact, with numbers where possible
5. Predicted outcome if they follow the advice

Be specific, honest, and encouraging. Keep the total under 400 words.`;

function buildUserMessage(entry) {
  const bar = v => '●'.repeat(v) + '○'.repeat(5 - v) + ` (${v}/5)`;
  const lines = [
    `**Date:** ${entry.date}`,
    `**Coffee:** ${entry.coffee}`,
    `**Roast level:** ${entry.roast}`,
    entry.dose   ? `**Dose:** ${entry.dose} g`         : null,
    entry.grind  ? `**Grind setting:** ${entry.grind}` : null,
    entry.boiler ? `**Boiler fill:** ${entry.boiler}`  : null,
    entry.yield  ? `**Yield:** ${entry.yield} ml`      : null,
    '',
    '**Taste ratings:**',
    `- Bitterness:        ${bar(entry.bitterness)}`,
    `- Sourness/Acidity:  ${bar(entry.sourness)}`,
    `- Sweetness:         ${bar(entry.sweetness)}`,
    `- Body:              ${bar(entry.body)}`,
    '',
    `**My notes:** ${entry.notes || 'None recorded.'}`,
    '',
    'Analyse this brew and tell me what to change next time to get closer to my target flavour profile.',
  ];
  return lines.filter(l => l !== null).join('\n');
}

// ---- SSE chunk extractors ----

function extractClaudeText(data) {
  try {
    const p = JSON.parse(data);
    if (p.type === 'content_block_delta' && p.delta?.type === 'text_delta') return p.delta.text;
  } catch {}
  return null;
}

function extractORText(data) {
  try {
    const p = JSON.parse(data);
    return p.choices?.[0]?.delta?.content || null;
  } catch {}
  return null;
}

// ---- Stream reader ----

async function readStream(response, provider, onText) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      const text = provider === 'claude' ? extractClaudeText(data) : extractORText(data);
      if (text) onText(text);
    }
  }
}

// ---- API fetch ----

async function fetchAnalysis(entry) {
  const provider = getProvider();
  const userMessage = buildUserMessage(entry);

  if (provider === 'claude') {
    const key = getClaudeKey();
    if (!key) throw new Error('no-key');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API error ${res.status}`);
    }
    return { response: res, provider: 'claude' };
  }

  // OpenRouter
  const key = getORKey();
  if (!key) throw new Error('no-key');
  const model = getORModel();

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${key}`,
      'http-referer': location.origin,
      'x-title': 'Moka Companion',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage   },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenRouter error ${res.status}`);
  }
  return { response: res, provider: 'openrouter' };
}

// ---- Card state helpers ----

function setCardLoading(details) {
  const prev = details.querySelector('.btn-analyse-brew, .ai-card-status');
  const el = document.createElement('div');
  el.className = 'ai-card-status ai-card-loading';
  el.innerHTML = `
    <div class="ai-progress-bar"><div class="ai-progress-fill"></div></div>
    <span class="ai-status-text">Analysing your brew…</span>
  `;
  if (prev) prev.replaceWith(el); else details.appendChild(el);
}

function makeAnalyseButton(entry, details) {
  const btn = document.createElement('button');
  btn.className = 'btn-analyse-brew';
  btn.textContent = 'Analyse Brew';
  btn.addEventListener('click', e => { e.stopPropagation(); startAnalysis(entry, details); });
  return btn;
}

function setCardDone(details, entry) {
  const prev = details.querySelector('.ai-card-status, .btn-analyse-brew, .ai-result-row');

  const row = document.createElement('div');
  row.className = 'ai-result-row';

  const view = document.createElement('button');
  view.className = 'btn-view-analysis';
  view.textContent = 'View Analysis';
  view.addEventListener('click', e => { e.stopPropagation(); openReportPanel(entry); });

  const clear = document.createElement('button');
  clear.className = 'btn-clear-analysis';
  clear.textContent = 'Clear';
  clear.setAttribute('aria-label', 'Clear analysis');
  clear.addEventListener('click', e => {
    e.stopPropagation();
    analysisCache.delete(entry.id);
    row.replaceWith(makeAnalyseButton(entry, details));
  });

  row.appendChild(view);
  row.appendChild(clear);
  if (prev) prev.replaceWith(row); else details.appendChild(row);
}

function setCardError(details, entry, msg) {
  const prev = details.querySelector('.ai-card-status, .btn-analyse-brew');
  const el = document.createElement('div');
  el.className = 'ai-card-status ai-card-error-inline';

  const txt = document.createElement('span');
  txt.textContent = msg;

  const retry = document.createElement('button');
  retry.className = 'btn-analyse-brew';
  retry.textContent = 'Try Again';
  retry.addEventListener('click', e => { e.stopPropagation(); startAnalysis(entry, details); });

  el.appendChild(txt);
  el.appendChild(retry);
  if (prev) prev.replaceWith(el); else details.appendChild(el);
}

// ---- Full-screen report panel ----

function buildBrewSummary(entry) {
  const bar = v => '●'.repeat(v) + '○'.repeat(5 - v);
  const facts = [
    entry.roast  ? ['Roast',  entry.roast]         : null,
    entry.dose   ? ['Dose',   `${entry.dose} g`]   : null,
    entry.grind  ? ['Grind',  entry.grind]         : null,
    entry.boiler ? ['Boiler', entry.boiler]        : null,
    entry.yield  ? ['Yield',  `${entry.yield} ml`] : null,
  ].filter(Boolean);

  const ratings = [
    ['Bitterness', entry.bitterness],
    ['Sourness',   entry.sourness],
    ['Sweetness',  entry.sweetness],
    ['Body',       entry.body],
  ];

  const factsHtml = facts.map(([k, v]) =>
    `<div class="ai-brew-fact"><span class="ai-brew-fact-label">${k}</span><span class="ai-brew-fact-value">${v}</span></div>`
  ).join('');

  const ratingsHtml = ratings.map(([k, v]) =>
    `<div class="ai-brew-rating"><span class="ai-brew-rating-label">${k}</span><span class="ai-brew-rating-bar">${bar(v)}</span></div>`
  ).join('');

  return `
    <div class="ai-brew-summary">
      ${factsHtml ? `<div class="ai-brew-facts">${factsHtml}</div>` : ''}
      <div class="ai-brew-ratings">${ratingsHtml}</div>
    </div>
  `;
}

function openReportPanel(entry) {
  const cached = analysisCache.get(entry.id);
  if (!cached) return;

  const existing = document.getElementById('ai-report-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ai-report-overlay';
  overlay.className = 'ai-report-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const popup = document.createElement('div');
  popup.className = 'ai-report-popup';

  const header = document.createElement('div');
  header.className = 'ai-report-popup-header';

  const meta = document.createElement('div');
  meta.className = 'ai-report-popup-meta';
  meta.innerHTML = `<span class="ai-report-coffee">${entry.coffee}</span><span class="ai-report-date">${entry.date}</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ai-report-close-btn';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => overlay.remove());

  header.appendChild(meta);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'ai-report-popup-body';

  const summary = document.createElement('div');
  summary.innerHTML = buildBrewSummary(entry);

  const content = document.createElement('div');
  content.className = 'ai-report markdown-body';
  content.innerHTML = typeof marked !== 'undefined'
    ? marked.parse(cached)
    : cached.replace(/\n/g, '<br>');

  body.appendChild(summary);
  body.appendChild(content);
  popup.appendChild(header);
  popup.appendChild(body);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

// ---- Main entry point called from brewlog.js ----

async function startAnalysis(entry, details) {
  setCardLoading(details);

  try {
    const { response, provider } = await fetchAnalysis(entry);

    let fullText = '';
    await readStream(response, provider, text => { fullText += text; });

    if (!fullText) throw new Error('No response received.');

    analysisCache.set(entry.id, fullText);
    setCardDone(details, entry);

  } catch (err) {
    let msg = err.message || 'Unknown error';
    if (msg === 'no-key') {
      msg = 'No API key saved — open AI Settings below.';
    } else if (/401|invalid.*key|api key/i.test(msg)) {
      msg = 'Invalid API key — check AI Settings.';
    }
    setCardError(details, entry, msg);
  }
}

// ---- AI Settings panel ----

function buildAISettings(container) {
  const section = document.createElement('div');
  section.className = 'ai-settings-section';

  const toggle = document.createElement('button');
  toggle.className = 'ai-settings-toggle';
  toggle.innerHTML = 'AI Settings <span class="chevron">&#9660;</span>';

  const body = document.createElement('div');
  body.className = 'ai-settings-body';

  // Provider selector
  const providerRow = document.createElement('div');
  providerRow.className = 'ai-provider-row';

  const providerLabel = document.createElement('p');
  providerLabel.className = 'ai-settings-label';
  providerLabel.textContent = 'Provider';

  const providerToggle = document.createElement('div');
  providerToggle.className = 'ai-provider-toggle';

  const currentProvider = getProvider();
  ['openrouter', 'claude'].forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-provider-btn' + (p === currentProvider ? ' active' : '');
    btn.textContent = p === 'openrouter' ? 'OpenRouter' : 'Claude API';
    btn.dataset.provider = p;
    btn.addEventListener('click', () => {
      saveProvider(p);
      providerToggle.querySelectorAll('.ai-provider-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.provider === p);
      });
      updateKeyPanels(p);
    });
    providerToggle.appendChild(btn);
  });

  providerRow.appendChild(providerLabel);
  providerRow.appendChild(providerToggle);
  body.appendChild(providerRow);

  // OpenRouter panel
  const orPanel = document.createElement('div');
  orPanel.className = 'ai-key-panel';

  const orDesc = document.createElement('p');
  orDesc.className = 'ai-settings-desc';
  orDesc.innerHTML = `Enter your <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">OpenRouter API key</a>. Gives access to many models from one key. Stored only in your browser's local storage.`;

  const orKeyRow = document.createElement('div');
  orKeyRow.className = 'ai-key-row';

  const orKeyInput = document.createElement('input');
  orKeyInput.type = 'password';
  orKeyInput.className = 'ai-key-input';
  orKeyInput.placeholder = 'sk-or-…';
  orKeyInput.value = getORKey();
  orKeyInput.autocomplete = 'off';
  orKeyInput.spellcheck = false;

  const orShowBtn = makeShowHideBtn(orKeyInput);

  const orModelRow = document.createElement('div');
  orModelRow.className = 'ai-key-row';

  const orModelLabel = document.createElement('span');
  orModelLabel.className = 'ai-model-label';
  orModelLabel.textContent = 'Model:';

  const orModelInput = document.createElement('input');
  orModelInput.type = 'text';
  orModelInput.className = 'ai-model-input';
  orModelInput.value = getORModel();
  orModelInput.placeholder = DEFAULT_OR_MODEL;
  orModelInput.spellcheck = false;

  orModelRow.appendChild(orModelLabel);
  orModelRow.appendChild(orModelInput);

  const orSaveBtn = document.createElement('button');
  orSaveBtn.type = 'button';
  orSaveBtn.className = 'ai-key-save';
  orSaveBtn.textContent = 'Save';
  orSaveBtn.addEventListener('click', () => {
    saveORKey(orKeyInput.value);
    saveORModel(orModelInput.value || DEFAULT_OR_MODEL);
    flashSaved(orSaveBtn);
  });

  orKeyRow.appendChild(orKeyInput);
  orKeyRow.appendChild(orShowBtn);
  orKeyRow.appendChild(orSaveBtn);

  orPanel.appendChild(orDesc);
  orPanel.appendChild(orKeyRow);
  orPanel.appendChild(orModelRow);

  // Claude panel
  const claudePanel = document.createElement('div');
  claudePanel.className = 'ai-key-panel';

  const claudeDesc = document.createElement('p');
  claudeDesc.className = 'ai-settings-desc';
  claudeDesc.innerHTML = `Enter your <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Anthropic API key</a> to call Claude directly. Stored only in your browser's local storage.`;

  const claudeKeyRow = document.createElement('div');
  claudeKeyRow.className = 'ai-key-row';

  const claudeKeyInput = document.createElement('input');
  claudeKeyInput.type = 'password';
  claudeKeyInput.className = 'ai-key-input';
  claudeKeyInput.placeholder = 'sk-ant-…';
  claudeKeyInput.value = getClaudeKey();
  claudeKeyInput.autocomplete = 'off';
  claudeKeyInput.spellcheck = false;

  const claudeShowBtn = makeShowHideBtn(claudeKeyInput);

  const claudeSaveBtn = document.createElement('button');
  claudeSaveBtn.type = 'button';
  claudeSaveBtn.className = 'ai-key-save';
  claudeSaveBtn.textContent = 'Save';
  claudeSaveBtn.addEventListener('click', () => {
    saveClaudeKey(claudeKeyInput.value);
    flashSaved(claudeSaveBtn);
  });

  claudeKeyRow.appendChild(claudeKeyInput);
  claudeKeyRow.appendChild(claudeShowBtn);
  claudeKeyRow.appendChild(claudeSaveBtn);

  claudePanel.appendChild(claudeDesc);
  claudePanel.appendChild(claudeKeyRow);

  body.appendChild(orPanel);
  body.appendChild(claudePanel);

  function updateKeyPanels(provider) {
    orPanel.style.display     = provider === 'openrouter' ? '' : 'none';
    claudePanel.style.display = provider === 'claude'     ? '' : 'none';
  }
  updateKeyPanels(currentProvider);

  toggle.addEventListener('click', () => {
    body.classList.toggle('open');
    toggle.classList.toggle('open');
  });

  section.appendChild(toggle);
  section.appendChild(body);
  container.appendChild(section);
}

// ---- Helpers ----

function makeShowHideBtn(input) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ai-key-show';
  btn.textContent = 'Show';
  btn.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    btn.textContent = hidden ? 'Hide' : 'Show';
  });
  return btn;
}

function flashSaved(btn) {
  const orig = btn.textContent;
  btn.textContent = 'Saved ✓';
  btn.style.background = '#4a7c4e';
  setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1800);
}
