// Snapshot rendering: campaign dates take precedence over marketing status labels.
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const statuses = { running: 'Running', closed: 'Closed', upcoming: 'Upcoming', unknown: 'Dates / status unconfirmed' };
export function safePublicUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function bannerPath(value) {
  if (typeof value !== 'string' || !/^\.\/evidence\/banners\/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp)$/.test(value) || value.includes('..')) return null;
  // Native ES modules on repository-root GitHub Pages retain public/; Vite
  // serves/copies that directory at the site root in development and builds.
  return import.meta.env ? value : value.replace('./evidence/', './public/evidence/');
}
export function getPromotionStatus(item, asOf) {
  const snapshot = Date.parse(asOf?.length === 10 ? `${asOf}T12:00:00Z` : asOf);
  const end = item.end ? Date.parse(item.end) : NaN;
  const start = item.start ? Date.parse(item.start) : NaN;
  if (Number.isFinite(snapshot)) {
    const day = new Date(snapshot).toISOString().slice(0, 10);
    const dateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
    const ended = dateOnly(item.end) ? item.end < day : end < snapshot;
    const notStarted = dateOnly(item.start) ? item.start > day : start > snapshot;
    if (Number.isFinite(end) && ended) return 'closed';
    if (Number.isFinite(start) && notStarted) return 'upcoming';
    if (Number.isFinite(start) && Number.isFinite(end) && !notStarted && !ended) return 'running';
  }
  return Object.hasOwn(statuses, item.status) ? item.status : 'unknown';
}
export function qualifiesHoldingTime(rule, seconds) {
  if (rule.ruleType !== 'Affiliate commission' || !Number.isFinite(rule.thresholdSeconds) || !Number.isFinite(seconds) || seconds < 0) return null;
  if (rule.operator === '>') return seconds > rule.thresholdSeconds;
  if (rule.operator === '>=') return seconds >= rule.thresholdSeconds;
  return null;
}
const sourceLinks = ids => (ids || []).map(id => `<button type="button" class="source-chip evidence-source" data-open-source="${esc(id)}" aria-label="Open source ${esc(id)}">${esc(id)}</button>`).join(' ');
const external = (url, label) => { const safe = safePublicUrl(url); return safe ? `<a class="campaign-link" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>` : ''; };
const display = value => Array.isArray(value) ? value.join(' · ') : value || 'Not established in the reviewed evidence';
const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(display(value))}</dd></div>`;
const tag = (text, tone = '') => `<span class="tag ${tone}">${esc(text)}</span>`;
const statusTag = status => tag(statuses[status], { running: 'clear', closed: 'neutral', upcoming: 'claim', unknown: 'partial' }[status]);
function selectFilter(key, label, values, selected) {
  return `<label class="campaign-filter">${esc(label)}<select class="select" data-campaign-filter="${key}">${[['all', `All ${label.toLowerCase()}`], ...values].map(([value, text]) => `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
}
function intro(data, type) {
  return `<div class="campaign-review" role="note"><strong>${esc(data.reviewStatus || 'Draft — human review pending')}</strong><p>Evidence snapshot: ${esc(data.asOf)}. ${type === 'promotions' ? 'Dates and explicit campaign wording determine status. An undated offer remains unconfirmed unless the source expressly identifies it as ongoing. Partner incentives and client offers are labelled separately.' : 'These records concern eligibility for affiliate commission. A client promotion’s trading-time condition does not establish an affiliate commission rule. Unknown means unverified in the reviewed evidence.'} Global or entity-specific terms require Japan confirmation where flagged.</p></div>`;
}
function coverage(data, competitor) {
  const rows = (data.coverage || []).filter(row => competitor === 'all' || competitor === row.competitor);
  return `<details class="panel campaign-coverage"><summary>Research coverage and portal access · ${rows.length} competitors</summary><div class="coverage-grid">${rows.map(row => `<article><h3>${esc(row.competitor)}</h3><dl>${fact('Portal access', row.portalAccess)}${fact('Reviewed scope', row.scope)}${fact('Limits / next action', row.notes)}</dl><div class="source-chip-row">${sourceLinks(row.sourceIds)}</div></article>`).join('')}</div></details>`;
}
function evidence(item, data) {
  return `<footer class="campaign-evidence"><div>${tag(item.evidenceClass || 'Unknown', 'claim')} ${tag(`${item.confidence || 'Unspecified'} confidence`)} ${tag(item.reviewStatus || data.reviewStatus || 'Review pending', 'partial')}</div><p><strong>Japan applicability:</strong> ${esc(item.japanApplicability || 'Unconfirmed')}<br/>Last verified: ${esc(item.lastVerified || 'Not recorded')}</p><div class="source-chip-row">${sourceLinks(item.sourceIds)}</div></footer>`;
}
export function renderPromotions(data, filters) {
  const promotions = data.promotions || [];
  const brands = [...new Set([...(data.coverage || []).map(item => item.competitor), ...promotions.map(item => item.competitor)])].sort();
  const scope = promotions.filter(item => filters.competitor === 'all' || item.competitor === filters.competitor);
  const rows = scope.filter(item => (filters.status === 'all' || getPromotionStatus(item, data.asOf) === filters.status) && (filters.recipient === 'all' || item.recipient === filters.recipient));
  return `${intro(data, 'promotions')}<section class="panel campaign-toolbar"><div><h2>Promotions</h2><p>${rows.length} of ${scope.length} researched records shown · snapshot ${esc(data.asOf)}</p></div><div class="campaign-filters">${selectFilter('competitor', 'Competitors', brands.map(x => [x, x]), filters.competitor)}${selectFilter('status', 'Statuses', Object.entries(statuses), filters.status)}${selectFilter('recipient', 'Recipients', [['Partner', 'Partner / IB'], ['Client', 'Client']], filters.recipient)}</div></section><div class="campaign-counts" aria-label="Promotion status counts for the selected competitor">${Object.entries(statuses).map(([key, label]) => `<div><strong>${scope.filter(item => getPromotionStatus(item, data.asOf) === key).length}</strong><span>${esc(label)}</span></div>`).join('')}</div>${coverage(data, filters.competitor)}<div class="campaign-grid">${rows.map(item => {
    const status = getPromotionStatus(item, data.asOf);
    const path = bannerPath(item.banner?.path);
    return `<article class="panel campaign-card" id="promotion-${esc(item.id)}"><header><div class="campaign-kicker">${esc(item.competitor)} · ${esc(item.recipient)} offer</div><h3>${esc(item.title)}</h3><div class="campaign-tags">${statusTag(status)}</div></header>${path ? `<figure class="campaign-banner"><a href="${esc(path)}" target="_blank" rel="noopener noreferrer" aria-label="Open banner screenshot for ${esc(item.title)}"><img src="${esc(path)}" alt="${esc(item.banner.caption || `${item.title} promotion banner`)}" loading="lazy"/></a><figcaption>${esc(item.banner.caption || 'Captured promotion banner')} ${item.banner.sourceId ? sourceLinks([item.banner.sourceId]) : ''}</figcaption></figure>` : `<div class="campaign-banner-missing"><strong>Banner screenshot unavailable</strong><p>${esc(item.banner?.reason || 'No verified banner was captured in the reviewed source set.')}</p></div>`}<div class="campaign-body"><dl class="campaign-facts">${fact('Dates / timezone', item.dateText || `${item.start || 'Start not published'} — ${item.end || 'End not published'} (${item.timezone || 'Timezone not stated'})`)}${fact('Status basis', item.statusBasis)}${fact('Prizes / benefit', item.prizes)}${fact('Who qualifies', item.eligibility)}</dl>${status !== item.status ? '<p class="campaign-caution">The dated period takes precedence over the recorded status label.</p>' : ''}<details class="campaign-conditions"><summary>Conditions, instruments and evidence</summary><dl class="campaign-facts">${fact('Instruments / pairs', item.instruments)}</dl><ul>${(item.conditions || []).map(condition => `<li>${esc(condition)}</li>`).join('') || '<li>No additional conditions established in the reviewed source.</li>'}</ul>${evidence(item, data)}</details><div class="campaign-links">${external(item.publicUrl, 'Public promotion page')}${item.termsUrl && item.termsUrl !== item.publicUrl ? external(item.termsUrl, 'Full terms') : ''}</div></div></article>`;
  }).join('') || '<div class="panel empty">No researched promotions match these filters. This does not establish that no promotion is offered.</div>'}</div>`;
}
export function renderMinuteRules(data, filters) {
  const all = data.minuteRules || [];
  const brands = [...new Set(all.map(item => item.competitor))].sort();
  const selected = brands.includes(filters.competitor) ? filters.competitor : 'all';
  const rows = all.filter(item => selected === 'all' || item.competitor === selected);
  return `${intro(data, 'minute-rules')}<section class="panel campaign-toolbar"><div><h2>Minute Rules</h2><p>Minimum holding period is one eligibility condition; other exclusions can still prevent commission.</p></div>${selectFilter('competitor', 'Competitors', brands.map(x => [x, x]), selected)}</section><section class="panel minute-overview"><div class="table-wrap"><table><caption>Affiliate commission holding-time evidence · ${esc(data.asOf)}</caption><thead><tr><th>Competitor / scope</th><th>Commission rule</th><th>Evidence status</th><th>Sources</th></tr></thead><tbody>${rows.map(item => `<tr><td><strong>${esc(item.competitor)}</strong><small>${esc(item.scope)}</small></td><td>${esc(item.rule)}<small>${item.thresholdSeconds != null && item.ruleType === 'Affiliate commission' ? `Duration test: ${esc(item.operator)} ${esc(item.thresholdSeconds / 60)} minutes` : 'No confirmed numeric affiliate threshold'}</small></td><td>${esc(item.ruleType)}<small>${esc(item.japanApplicability)}</small></td><td>${sourceLinks(item.sourceIds)}</td></tr>`).join('')}</tbody></table></div></section><div class="minute-grid">${rows.map(item => `<article class="panel minute-card"><header><div class="campaign-kicker">${esc(item.ruleType)}</div><h3>${esc(item.competitor)}</h3><p>${esc(item.rule)}</p></header><dl class="campaign-facts">${fact('Real-world example', item.example)}${fact('Entity / geographic scope', `${display(item.entity)} · ${display(item.scope)}`)}${fact('Accounts', item.accounts)}${fact('Instruments', item.instruments)}</dl><details class="campaign-conditions"><summary>Exceptions and exact source location</summary><dl class="campaign-facts">${fact('Exceptions / additional restrictions', item.exceptions)}${fact('Source location', item.locator)}</dl></details>${evidence(item, data)}<div class="campaign-links">${external(item.publicUrl, 'Read source')}</div></article>`).join('') || '<div class="panel empty">No matching holding-time evidence.</div>'}</div>${coverage(data, selected)}`;
}
