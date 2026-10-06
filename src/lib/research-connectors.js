import { deriveAnalysis } from './analysis-engine.js';

let researchConfig = { allowlistedDomains: [] };

export function configureResearchConfig(config) {
  researchConfig = config || { allowlistedDomains: [] };
}

export function getResearchEndpoint() {
  return window.XMTD_RESEARCH_ENDPOINT || import.meta.env?.VITE_XMTD_RESEARCH_ENDPOINT || '';
}

export function buildRefreshPayload(sourceRegister, analysis) {
  return {
    requestedAt: new Date().toISOString(),
    market: analysis.market,
    baseline: analysis.baseline,
    sourceRegister,
    allowlistedDomains: researchConfig.allowlistedDomains,
    currentAnalysis: analysis
  };
}

export async function refreshAnalysis({ sourceRegister, sourceGaps, analysis }) {
  const endpoint = getResearchEndpoint();
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRefreshPayload(sourceRegister, analysis))
    });
    if (!response.ok) throw new Error(`Research endpoint returned ${response.status}.`);
    const payload = await response.json();
    if (!payload?.analysis?.competitors) throw new Error('Research endpoint did not return a valid analysis payload.');
    return { ...deriveAnalysis(payload.analysis, sourceRegister, sourceGaps), mode: 'online endpoint' };
  }
  // GitHub Pages cannot safely run server-side scraping. The fallback remains deterministic and evidence-led.
  return { ...deriveAnalysis(analysis, sourceRegister, sourceGaps), mode: 'local evidence' };
}

export function getResearchMode() {
  return getResearchEndpoint() ? 'Online connector configured' : 'Local evidence mode';
}
