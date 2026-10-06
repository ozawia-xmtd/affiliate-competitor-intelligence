import { answerQuestion, deriveAnalysis, getStatusLabel } from './lib/analysis-engine.js';
import { addSourceRecord, configureSourceRegisterData, downloadSourceRegister, loadSourceGaps, loadSourceRegister, sourceRegisterStats } from './lib/source-register.js';
import { readJson, writeJson } from './lib/storage.js';
import { configureResearchConfig, getResearchMode, refreshAnalysis } from './lib/research-connectors.js';

const WORKSPACES_KEY = 'xmtd.workspaces.v1';
const defaultWorkspace = { id: 'japan-affiliate-intelligence', name: 'Japan affiliate intelligence', cards: [] };
let analysisSeed;
let state;

async function loadAppData() {
  const json = path => fetch(new URL(path, import.meta.url)).then(response => {
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    return response.json();
  });
  const [analysisPayload, registerPayload, gapsPayload, researchPayload] = await Promise.all([
    json('../data/competitor-analyses.json'),
    json('../data/source-register.json'),
    json('../data/source-gaps.json'),
    json('../data/research-config.json')
  ]);
  analysisSeed = analysisPayload;
  configureSourceRegisterData(registerPayload, gapsPayload);
  configureResearchConfig(researchPayload);
  const records = loadSourceRegister();
  const gaps = loadSourceGaps();
  const workspaces = readJson(WORKSPACES_KEY, [defaultWorkspace]);
  state = {
    view: 'overview',
    filter: 'all',
    search: '',
    selected: null,
    modal: null,
    lastRefresh: null,
    records,
    gaps,
    analysis: deriveAnalysis(analysisSeed, records, gaps),
    chat: [{ role: 'assistant', text: 'Ask me about a competitor, commission, cashback, payout condition or evidence gap.', sources: [] }],
    workspaces,
    activeWorkspaceId: workspaces[0]?.id || defaultWorkspace.id
  };
}

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const shortDate = value => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const statusClass = status => ({ clear: 'clear', partial: 'partial', open: 'open', claim: 'claim', verified: 'clear' }[status] || 'neutral');

function metric(label, value, note, tone = '') {
  return `<article class="metric"><div class="metric-label"><span>${esc(label)}</span><span>•••</span></div><div class="metric-value">${esc(value)}</div><div class="metric-foot ${tone}">${esc(note)}</div></article>`;
}

function shell() {
  $('#app').innerHTML = `
    <div class="browser">
      <div class="browser-bar">
        <img class="browser-logo" src="./xmtd-logo.svg" alt="XMTD" />
        <div class="browser-actions" aria-label="Application actions">
          <button class="browser-action" id="refreshBtn" title="Refresh analysis from the source register and online research" aria-label="Refresh analysis"><span>↻</span></button>
          <button class="browser-action" id="addSourceBtn" title="Add a source register record" aria-label="Add source register record"><span>＋</span></button>
          <button class="browser-action" id="downloadPdfBtn" title="Download analysis as PDF" aria-label="Download PDF"><span>↓</span></button>
        </div>
      </div>
      <div class="app-shell">
        <aside class="rail">
          <div class="rail-mark">X</div>
          <button class="rail-btn active" data-view="overview" title="Overview">⌂</button>
          <button class="rail-btn" data-view="economics" title="Economics">◒</button>
          <button class="rail-btn" data-view="rebate" title="Rebate and payout">↗</button>
          <button class="rail-btn" data-view="gaps" title="Gaps and risks">!</button>
          <div class="rail-spacer"></div>
          <button class="rail-btn" id="chatToggle" title="Evidence analyst">✦</button>
        </aside>
        <aside class="sidebar">
          <div class="sidebar-heading">WORKSPACE</div>
          <button class="nav-item active" data-view="overview"><span class="nav-icon">⌂</span>Overview</button>
          <button class="nav-item" data-view="economics"><span class="nav-icon">◒</span>Economics</button>
          <button class="nav-item" data-view="rebate"><span class="nav-icon">↗</span>Rebate & payout</button>
          <button class="nav-item" data-view="gaps"><span class="nav-icon">!</span>Gaps & risks<span class="nav-count">${state.analysis.derived.openGaps}</span></button>
          <div class="side-divider"></div>
          <div class="sidebar-heading">EVIDENCE</div>
          <button class="nav-item" data-view="sources"><span class="nav-icon">▤</span>Source register<span class="nav-count">${state.analysis.derived.sourceRecords}</span></button>
          <button class="nav-item" id="downloadRegisterBtn"><span class="nav-icon">↓</span>Export register</button>
          <div class="side-note"><strong>Local-first by design</strong>Evidence is loaded from the supplied register. Live research runs through an explicit connector or a scheduled GitHub Action.</div>
        </aside>
        <main class="main"><div id="viewRoot"></div></main>
      </div>
    </div>
    <div id="modalRoot"></div>
    <section class="chat-panel" id="chatPanel" aria-label="Evidence analyst">
      <div class="chat-head"><div><h2>Evidence analyst</h2><p>Answers are grounded in the current analysis and source IDs.</p><span class="chat-status">${esc(getResearchMode())}</span></div><button class="close" id="closeChat" aria-label="Close analyst chat">×</button></div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-suggestions"><button class="chat-suggestion">What is the current cashback offering of HFM?</button><button class="chat-suggestion">Which competitor pays fastest?</button><button class="chat-suggestion">What is missing for Japan?</button></div>
      <form class="chat-input-row" id="chatForm"><input class="chat-input" id="chatInput" placeholder="Ask a question…" autocomplete="off" /><button class="chat-send" aria-label="Send question">↗</button></form>
    </section>
    <div class="toast" id="toast" role="status"></div>`;
  bindShellEvents();
  renderView();
  renderChat();
}

function bindShellEvents() {
  document.querySelectorAll('[data-view]').forEach(element => element.addEventListener('click', () => {
    state.view = element.dataset.view;
    document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === state.view));
    renderView();
  }));
  $('#refreshBtn').addEventListener('click', runRefresh);
  $('#addSourceBtn').addEventListener('click', () => openModal('source'));
  $('#downloadPdfBtn').addEventListener('click', downloadPdf);
  $('#downloadRegisterBtn').addEventListener('click', () => { downloadSourceRegister(state.records); toast('Source register exported as CSV'); });
  $('#chatToggle').addEventListener('click', () => $('#chatPanel').classList.add('open'));
  $('#closeChat').addEventListener('click', () => $('#chatPanel').classList.remove('open'));
  $('#chatForm').addEventListener('submit', submitChat);
  document.querySelectorAll('.chat-suggestion').forEach(button => button.addEventListener('click', () => { $('#chatInput').value = button.textContent; $('#chatForm').requestSubmit(); }));
}

function renderView() {
  const { derived } = state.analysis;
  const subtitle = {
    overview: 'Primary-source comparison · XMTD, HFM, Exness, Vantage Trading and XS.com',
    economics: 'Economics lens · headline figures are not directly comparable',
    rebate: 'Rebate mechanics lens · partner economics and client pass-through are separated',
    gaps: 'Evidence lens · unresolved Japan scope and missing agreements are surfaced',
    sources: 'Evidence index · the source register remains the system of record'
  }[state.view];
  $('#viewRoot').innerHTML = `
    <div class="topline"><div class="crumbs">Workspace / <b>Japan affiliate intelligence</b></div><div class="top-actions"><span class="mode-pill">${esc(getResearchMode())}</span><button class="small-btn" id="chatOpenTop">Ask analyst</button></div></div>
    <div class="headline"><div><h1>Competitor intelligence</h1><p class="subtitle">${esc(subtitle)}</p></div><div class="last-verified">Analysis as of <strong>${esc(shortDate(state.analysis.asOf))}</strong><br/>${state.lastRefresh ? `Last refresh ${esc(shortDate(state.lastRefresh))}` : 'Register refresh not yet run'}</div></div>
    <div class="metrics">
      ${metric('BRANDS IN SCOPE', derived.brandsInScope, 'XMTD + 4 competitors')}
      ${metric('SOURCE REGISTER', derived.sourceRecords, `${derived.primaryRecords} primary records`, 'neutral')}
      ${metric('OPEN GAPS', derived.openGaps, 'needs evidence closure', derived.openGaps ? 'warning' : '')}
      ${metric('RESEARCH MODE', getResearchMode(), state.lastRefresh ? 'refresh completed' : 'safe local fallback', 'neutral')}
    </div>
    <div class="tabs"><button class="tab ${state.view === 'overview' ? 'active' : ''}" data-view="overview">Overview</button><button class="tab ${state.view === 'economics' ? 'active' : ''}" data-view="economics">Economics</button><button class="tab ${state.view === 'rebate' ? 'active' : ''}" data-view="rebate">Rebate & payout</button><button class="tab ${state.view === 'gaps' ? 'active' : ''}" data-view="gaps">Gaps & risks</button><button class="tab ${state.view === 'sources' ? 'active' : ''}" data-view="sources">Source register</button></div>
    ${viewContent()}`;
  document.querySelectorAll('[data-view]').forEach(element => element.addEventListener('click', () => { state.view = element.dataset.view; document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === state.view)); renderView(); }));
  $('#chatOpenTop')?.addEventListener('click', () => $('#chatPanel').classList.add('open'));
  $('#sourceExportBtn')?.addEventListener('click', () => { downloadSourceRegister(state.records); toast('Source register exported as CSV'); });
  $('#chatTestBtn')?.addEventListener('click', () => { $('#chatPanel').classList.add('open'); $('#chatInput').value = 'Give me test cases for a Japan affiliate value calculator'; $('#chatForm').requestSubmit(); });
  $('#matrixSearch')?.addEventListener('input', event => { state.search = event.target.value; renderView(); });
  $('#matrixFilter')?.addEventListener('change', event => { state.filter = event.target.value; renderView(); });
  document.querySelectorAll('[data-competitor]').forEach(element => element.addEventListener('click', () => { state.selected = element.dataset.competitor; openModal('detail'); }));
  document.querySelectorAll('[data-open-source]').forEach(element => element.addEventListener('click', () => { state.selectedSource = element.dataset.openSource; openModal('sourceDetail'); }));
}

function viewContent() {
  if (state.view === 'sources') return renderSources();
  if (state.view === 'economics') return renderEconomics();
  if (state.view === 'rebate') return renderRebate();
  if (state.view === 'gaps') return renderGaps();
  return renderOverview();
}

function renderOverview() {
  const rows = filteredCompetitors();
  const max = Math.max(...state.analysis.competitors.map(item => item.sourceCount));
  return `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot purple"></span>Competitive evidence matrix</div><div class="panel-copy">${rows.length} rows · select a competitor for the full evidence record</div></div><div class="table-controls"><input class="input" id="matrixSearch" value="${esc(state.search)}" placeholder="Search evidence…"/><select class="select" id="matrixFilter"><option value="all" ${state.filter === 'all' ? 'selected' : ''}>All states</option><option value="clear" ${state.filter === 'clear' ? 'selected' : ''}>Japan clear</option><option value="partial" ${state.filter === 'partial' ? 'selected' : ''}>Partial</option><option value="open" ${state.filter === 'open' ? 'selected' : ''}>Open</option></select></div></div><div class="table-wrap"><table><thead><tr><th>Competitor</th><th>Headline economics</th><th>Cashback / rebate</th><th>Japan evidence</th><th>Source IDs</th></tr></thead><tbody>${rows.map(row => `<tr data-competitor="${esc(row.id)}"><td><div class="brand-cell"><span class="brand-dot" style="background:${row.color}"></span><div><strong>${esc(row.label)}</strong><small>${esc(row.role)}</small></div></div></td><td><strong>${esc(row.headline)}</strong><small>${esc(row.basis)}</small></td><td>${esc(row.rebate)}<span class="tag ${statusClass(row.rebateStatus)}">${esc(row.rebateStatus)}</span></td><td>${esc(row.japan)}<span class="tag ${statusClass(row.japanStatus)}">${esc(getStatusLabel(row.japanStatus))}</span></td><td><span class="source-count">${row.sourceCount}</span> <span class="muted">${row.sources.slice(0, 2).join(' · ')}${row.sources.length > 2 ? ' · …' : ''}</span></td></tr>`).join('')}</tbody></table></div></section><section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot orange"></span>Evidence footprint</div><div class="panel-copy">Record volume is coverage, not confidence</div></div></div><div class="footprint">${state.analysis.competitors.map(row => `<div class="footprint-row"><div class="footprint-label"><span>${esc(row.label)}</span><strong>${row.sourceCount}</strong></div><div class="bar"><span style="width:${Math.max(8, Math.round(row.sourceCount / max * 100))}%;background:${row.color}"></span></div></div>`).join('')}</div><div class="callout"><strong>Decision rule</strong><p>No overall competitor ranking is shown because payout speed, revenue share, spread share and fixed per-lot figures are not directly comparable.</p></div></section></div><section class="insight-grid"><div class="panel insight-panel"><div class="panel-head"><div><div class="panel-title"><span class="dot green"></span>Immediate opportunities for XMTD</div><div class="panel-copy">Actions linked to registered evidence</div></div></div>${state.analysis.opportunities.slice(0, 3).map(item => `<div class="insight-row"><span class="priority ${item.priority.toLowerCase()}">${esc(item.priority)}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><small>Sources ${item.evidence.join(' · ')}</small></div></div>`).join('')}</div><div class="panel insight-panel"><div class="panel-head"><div><div class="panel-title"><span class="dot red"></span>Material risks</div><div class="panel-copy">Monitor before making commercial claims</div></div></div>${state.analysis.risks.slice(0, 3).map(item => `<div class="insight-row"><span class="severity ${item.severity.toLowerCase()}">${esc(item.severity)}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><small>Sources ${item.evidence.join(' · ')}</small></div></div>`).join('')}</div></section>`;
}

function renderEconomics() {
  return `<section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot blue"></span>Headline economics comparison</div><div class="panel-copy">Treat these as different commercial models, not a league table.</div></div></div><div class="economics-grid">${state.analysis.competitors.map(item => `<article class="economics-card" data-competitor="${esc(item.id)}"><div class="card-top"><span class="brand-dot" style="background:${item.color}"></span><strong>${esc(item.label)}</strong><span class="tag ${statusClass(item.japanStatus)}">${esc(getStatusLabel(item.japanStatus))}</span></div><div class="big-number">${esc(item.headline)}</div><div class="muted">${esc(item.basis)}</div><p>${esc(item.economics)}</p><div class="card-footer">Sources ${item.sources.slice(0, 4).join(' · ')}${item.sources.length > 4 ? ' · …' : ''}</div></article>`).join('')}</div></section><section class="panel section-gap"><div class="panel-head"><div><div class="panel-title"><span class="dot purple"></span>What needs to be made comparable</div></div></div><div class="check-grid">${['Account type and instrument','Volume or partner tier','Client pass-through rule','Eligibility and exclusions','Payout currency, threshold and cadence','Japan entity and agreement'].map((item, index) => `<div class="check-item"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(item)}</strong><small>Required before a commercial comparison</small></div>`).join('')}</div></section>`;
}

function renderRebate() {
  const signals = state.analysis.signals;
  return `<section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot green"></span>Rebate and payout signals</div><div class="panel-copy">Partner-to-client mechanics are separated from partner remuneration.</div></div></div><div class="signal-grid"><div class="signal-spacer"></div>${state.analysis.competitors.map(item => `<div class="signal-head">${esc(item.label)}</div>`).join('')}${signals.map(signal => `<div class="signal-label">${esc(signal.label)}</div>${state.analysis.competitors.map(item => { const pair = signal.values[item.id] || ['—', 'open']; return `<div class="signal-cell"><strong>${esc(pair[0])}</strong><span class="tag ${statusClass(pair[1])}">${esc(pair[1])}</span></div>`; }).join('')}`).join('')}</div></section><div class="two-col section-gap"><section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot orange"></span>Operational reading</div></div></div><div class="reading-list"><p><strong>Fastest documented flow:</strong> Exness states an instant partner reward may arrive within about 20 minutes, while other sources describe daily, next-day or same-day flows.</p><p><strong>XMTD friction:</strong> the written agreement describes weekly payment and a USD 500 threshold. This is a retention risk for smaller or newer affiliates.</p><p><strong>Evidence boundary:</strong> “not found” means the reviewed source set did not identify the term. It does not mean the competitor does not offer it.</p></div></section><section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot red"></span>Recommended next test</div></div></div><div class="test-card"><strong>Design a compliant Japan partner value calculator</strong><p>Show expected partner reward, eligible client rebate, payout timing and restrictions for a selected account/instrument scenario.</p><button class="small-btn blue" id="chatTestBtn">Ask analyst for test cases</button></div></section></div>`;
}

function renderGaps() {
  return `<div class="two-col"><section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot red"></span>Open evidence gaps</div><div class="panel-copy">Gaps are tracked separately from competitor claims.</div></div></div>${state.analysis.derived.openGaps.map(gap => `<div class="gap-row"><div class="gap-id">${esc(gap['Gap ID'])}</div><div><strong>${esc(gap['Missing Information'])}</strong><p>${esc(gap['Reason for Gap'])}</p><small>${esc(gap.Competitor)} · ${esc(gap.Priority)} priority · ${esc(gap.Status)}</small></div></div>`).join('') || '<div class="empty">No open gaps in the current register.</div>'}</section><section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot orange"></span>Risk register</div><div class="panel-copy">Analyst interpretation, linked back to source IDs.</div></div></div>${state.analysis.risks.map(item => `<div class="risk-row"><span class="severity ${item.severity.toLowerCase()}">${esc(item.severity)}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><small>Evidence ${item.evidence.join(' · ')}</small></div></div>`).join('')}</section></div><section class="panel section-gap"><div class="panel-head"><div><div class="panel-title"><span class="dot purple"></span>Next evidence collection queue</div></div></div><div class="queue-grid">${['XS Japan-specific affiliate agreement','HFM Japan/entity eligibility','Exness entity-specific Japan agreement','XMTD client pass-through policy','Current rate and payout verification'].map((item, index) => `<div class="queue-card"><span>0${index + 1}</span><strong>${esc(item)}</strong><small>Owner: intelligence workflow · status: open</small></div>`).join('')}</div></section>`;
}

function renderSources() {
  const visible = state.records.filter(record => {
    const query = state.search.toLowerCase();
    return !query || Object.values(record).join(' ').toLowerCase().includes(query);
  }).slice(0, 160);
  return `<section class="panel"><div class="panel-head"><div><div class="panel-title"><span class="dot purple"></span>Source register</div><div class="panel-copy">${state.records.length} records loaded from the supplied workbook${sourceRegisterStats(state.records).additions ? ` · ${sourceRegisterStats(state.records).additions} local addition(s)` : ''}</div></div><div class="table-controls"><input class="input" id="matrixSearch" value="${esc(state.search)}" placeholder="Search source ID, title, competitor…"/><button class="small-btn" id="sourceExportBtn">Export CSV</button></div></div><div class="table-wrap source-table"><table><thead><tr><th>Source ID</th><th>Competitor</th><th>Source / title</th><th>Geographic scope</th><th>Reliability</th><th>Status</th></tr></thead><tbody>${visible.map(record => `<tr data-open-source="${esc(record['Source ID'])}"><td><strong>${esc(record['Source ID'])}</strong></td><td>${esc(record.Competitor)}</td><td>${esc(record['Page / Document Title'])}<small>${esc(record['Source Category'])} · ${esc(record['Source Subcategory'])}</small></td><td>${esc(record['Geographic Scope'])}</td><td><span class="tag ${record.Reliability === 'Primary' ? 'clear' : 'claim'}">${esc(record.Reliability || 'Unclassified')}</span></td><td>${esc(record['Source Status'])}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderChat() {
  const container = $('#chatMessages');
  if (!container) return;
  container.innerHTML = state.chat.map(message => `<div class="chat-msg ${message.role}">${esc(message.text)}${message.sources?.length ? `<small>Sources ${message.sources.map(source => `<span class="chat-source">${esc(source)}</span>`).join('')}</small>` : ''}${message.card ? `<div class="chat-card"><span>Save this evidence answer as a workspace card</span><button data-save-answer="true">＋ Add card</button></div>` : ''}</div>`).join('');
  container.querySelectorAll('[data-save-answer]').forEach(button => button.addEventListener('click', () => openModal('workspace')));
  container.scrollTop = container.scrollHeight;
}

function filteredCompetitors() {
  const search = state.search.toLowerCase();
  return state.analysis.competitors.filter(item => {
    const matchesText = !search || [item.id, item.label, item.role, item.headline, item.economics, item.rebate, item.gap, ...item.sources].join(' ').toLowerCase().includes(search);
    const matchesFilter = state.filter === 'all' || item.japanStatus === state.filter || item.rebateStatus === state.filter;
    return matchesText && matchesFilter;
  });
}

async function runRefresh() {
  const button = $('#refreshBtn');
  button?.classList.add('busy');
  button?.setAttribute('disabled', 'disabled');
  try {
    state.records = loadSourceRegister();
    state.analysis = await refreshAnalysis({ sourceRegister: state.records, sourceGaps: state.gaps, analysis: analysisSeed });
    state.lastRefresh = new Date().toISOString();
    renderView();
    toast(`Analysis refreshed · ${state.analysis.mode}`);
  } catch (error) {
    toast(`Refresh failed · local evidence preserved`);
    console.error(error);
  } finally {
    button?.classList.remove('busy');
    button?.removeAttribute('disabled');
  }
}

function downloadPdf() {
  toast('Print dialog opened · choose “Save as PDF”');
  setTimeout(() => window.print(), 220);
}

function submitChat(event) {
  event.preventDefault();
  const input = $('#chatInput');
  const question = input.value.trim();
  if (!question) return;
  const response = answerQuestion(question, state.analysis);
  state.chat.push({ role: 'user', text: question, sources: [] }, { role: 'assistant', text: response.answer, sources: response.sources, card: true });
  input.value = '';
  renderChat();
}

function openModal(type) {
  state.modal = type;
  const root = $('#modalRoot');
  if (type === 'source') root.innerHTML = sourceModal();
  if (type === 'detail') root.innerHTML = detailModal();
  if (type === 'sourceDetail') root.innerHTML = sourceDetailModal();
  if (type === 'workspace') root.innerHTML = workspaceModal();
  root.querySelector('.modal-backdrop')?.addEventListener('click', event => { if (event.target.classList.contains('modal-backdrop')) closeModal(); });
  root.querySelector('[data-close-modal]')?.addEventListener('click', closeModal);
  root.querySelector('#sourceForm')?.addEventListener('submit', submitSource);
  root.querySelector('#createWorkspaceBtn')?.addEventListener('click', createWorkspace);
  root.querySelector('#saveWorkspaceCardBtn')?.addEventListener('click', saveWorkspaceCard);
  root.querySelector('#workspaceSelector')?.addEventListener('change', event => { state.activeWorkspaceId = event.target.value; });
  root.querySelector('#sourceDetailLink')?.addEventListener('click', () => { const source = state.records.find(record => record['Source ID'] === state.selectedSource); if (source?.URL) window.open(source.URL, '_blank', 'noopener'); });
}

function closeModal() { state.modal = null; $('#modalRoot').innerHTML = ''; }

function sourceModal() {
  return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h2>Add source register record</h2><p>Add an evidence record to this browser workspace. Export it and merge it back into the workbook or repository data after review.</p></div><button class="close" data-close-modal>×</button></div><form id="sourceForm" class="form-grid"><label>Source ID<input name="Source ID" placeholder="e.g. HFM-026"/></label><label>Competitor<select name="Competitor"><option>XMTD</option><option>HFM</option><option>Exness</option><option>Vantage</option><option>XS</option></select></label><label class="span-2">Page / Document Title<input name="Page / Document Title" required placeholder="Official partner page or document title"/></label><label class="span-2">URL<input name="URL" type="url" placeholder="https://…"/></label><label>Source Category<input name="Source Category" value="Online research"/></label><label>Source Subcategory<input name="Source Subcategory" value="Manual addition"/></label><label>Language<input name="Language" value="Japanese / English"/></label><label>Geographic Scope<input name="Geographic Scope" value="Japan"/></label><label>Reliability<select name="Reliability"><option>Primary</option><option>Secondary – Market</option><option>Secondary – Review</option><option>Unclassified</option></select></label><label>Source Status<select name="Source Status"><option>Collected</option><option>Active</option><option>Needs review</option></select></label><label class="span-2">Notes<textarea name="Notes" rows="3" placeholder="Evidence boundary, conflict, or verification note"></textarea></label><div class="form-actions span-2"><button type="button" class="small-btn" data-close-modal>Cancel</button><button type="submit" class="small-btn blue">Add record</button></div></form></div></div>`;
}

function detailModal() {
  const competitor = state.analysis.competitors.find(item => item.id === state.selected) || state.analysis.competitors[0];
  return `<div class="modal-backdrop"><div class="modal wide"><div class="modal-head"><div><h2>${esc(competitor.label)} · evidence record</h2><p>${esc(competitor.classification)} · ${competitor.sourceCount} linked source IDs</p></div><button class="close" data-close-modal>×</button></div><div class="detail-grid"><div><h3>Economics</h3><p>${esc(competitor.economics)}</p><h3>Cashback / rebate</h3><p>${esc(competitor.rebate)}</p><h3>Payout</h3><p>${esc(competitor.payout)}</p></div><div><h3>Japan applicability</h3><p>${esc(competitor.japan)}</p><h3>Restrictions</h3><p>${esc(competitor.restrictions)}</p><h3>Open issue</h3><p>${esc(competitor.gap)}</p></div></div><div class="source-chip-row">${competitor.sources.map(source => `<span class="source-chip">${esc(source)}</span>`).join('')}</div></div></div>`;
}

function sourceDetailModal() {
  const source = state.records.find(record => record['Source ID'] === state.selectedSource);
  return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h2>${esc(source?.['Source ID'] || 'Source')}</h2><p>${esc(source?.['Page / Document Title'] || 'Record not found')}</p></div><button class="close" data-close-modal>×</button></div><dl class="source-detail">${source ? SOURCE_DETAIL_FIELDS.map(field => `<div><dt>${esc(field)}</dt><dd>${esc(source[field] || '—')}</dd></div>`).join('') : '<div class="empty">Source record not found.</div>'}</dl><div class="form-actions"><button class="small-btn" data-close-modal>Close</button>${source?.URL ? '<button class="small-btn blue" id="sourceDetailLink">Open source</button>' : ''}</div></div></div>`;
}

const SOURCE_DETAIL_FIELDS = ['Competitor', 'Source Category', 'Source Subcategory', 'URL', 'Language', 'Geographic Scope', 'Programme Type', 'Date Accessed', 'Last Verified', 'Reliability', 'Source Status', 'Notes'];

function workspaceModal() {
  const active = state.workspaces.find(workspace => workspace.id === state.activeWorkspaceId) || state.workspaces[0];
  return `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h2>Save to a workspace</h2><p>Keep an evidence answer as a reusable card for follow-up analysis.</p></div><button class="close" data-close-modal>×</button></div><label>Workspace<select id="workspaceSelector">${state.workspaces.map(workspace => `<option value="${esc(workspace.id)}" ${workspace.id === active?.id ? 'selected' : ''}>${esc(workspace.name)}</option>`).join('')}</select></label><div class="workspace-new"><input id="workspaceName" placeholder="New workspace name"/><button class="small-btn" id="createWorkspaceBtn">＋ New</button></div><div class="form-actions"><button class="small-btn" data-close-modal>Cancel</button><button class="small-btn blue" id="saveWorkspaceCardBtn">Save answer card</button></div></div></div>`;
}

function submitSource(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const input = Object.fromEntries(form.entries());
  try {
    addSourceRecord(input);
    state.records = loadSourceRegister();
    state.analysis = deriveAnalysis(analysisSeed, state.records, state.gaps);
    closeModal();
    renderView();
    toast('Source register record added locally');
  } catch (error) { toast(error.message); }
}

function createWorkspace() {
  const input = $('#workspaceName');
  const name = input?.value.trim();
  if (!name) return toast('Enter a workspace name first');
  const id = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const workspace = { id, name, cards: [] };
  state.workspaces.push(workspace);
  state.activeWorkspaceId = id;
  writeJson(WORKSPACES_KEY, state.workspaces);
  toast(`Workspace created: ${name}`);
  openModal('workspace');
}

function saveWorkspaceCard() {
  const question = [...state.chat].reverse().find(message => message.role === 'user');
  const answer = [...state.chat].reverse().find(message => message.role === 'assistant' && message.card);
  if (!answer) return toast('Ask a question first');
  const workspace = state.workspaces.find(item => item.id === state.activeWorkspaceId) || state.workspaces[0];
  workspace.cards.push({ question: question?.text || 'Evidence answer', answer: answer.text, sources: answer.sources, savedAt: new Date().toISOString() });
  writeJson(WORKSPACES_KEY, state.workspaces);
  closeModal();
  toast(`Answer saved to ${workspace.name}`);
}

function toast(message) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(window.__xmtdToast);
  window.__xmtdToast = setTimeout(() => node.classList.remove('show'), 2800);
}

loadAppData().then(shell).catch(error => {
  console.error(error);
  document.querySelector('#app').innerHTML = `<main class="load-error"><img src="./xmtd-logo.svg" alt="XMTD"/><h1>Competitor intelligence could not load</h1><p>${esc(error.message)}</p><small>Check that the repository contains the complete <code>data/</code> and <code>src/</code> folders.</small></main>`;
});
