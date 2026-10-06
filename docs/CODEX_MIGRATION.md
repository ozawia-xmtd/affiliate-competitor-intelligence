# Codex migration handoff

This file is the background note for continuing the project in Codex.

## Project intent

Build a reliable Japan affiliate competitor intelligence system that helps XMTrading (XMTD) improve affiliate retention and engagement. The system should compare competitors, identify opportunity and risk points, and support periodic evidence refreshes without overstating claims.

## Current state

- App root: this directory.
- Source of truth: `data/source-register.json`, migrated from the supplied workbook with 138 records and the original 18 fields.
- Gaps: `data/source-gaps.json`, currently includes `GAP-001` for the XS Japan-specific affiliate agreement.
- Latest analysis: `data/competitor-analyses.json`, snapshot as of 2 October 2026.
- UI: `src/main.js` and `src/styles.css`.
- Evidence logic: `src/lib/analysis-engine.js`.
- Research contract: `src/lib/research-connectors.js`.
- Scheduled collector: `scripts/refresh-research.mjs`.
- Deployment: `.github/workflows/deploy-pages.yml`.

## Established business rules

1. XMTD means XMTrading in the Japan market; do not collapse it with XM.com.
2. Current comparison set is XMTD, HFM, Exness, Vantage Trading and XS.com.
3. Do not assume Vantage Markets equals VantageTrading or global terms equal Japan terms.
4. Keep these evidence classes visible: verified fact, competitor claim, external affiliate opinion, analyst interpretation and unknown.
5. “Not found” is not “not offered”.
6. Show conflicts and cite source IDs and dates whenever available.
7. Do not create a single overall ranking when payout, revenue share, spread share and fixed-per-lot economics are not comparable.
8. Use the default analysis structure: executive summary, evidence findings, comparison, Japan implications, XMTD opportunities, risks/limitations, missing information, sources and next action.

## Latest evidence summary to preserve

- XMTD: up to USD 20/lot, unlimited commissions, 10% sub-affiliate; weekly payment and USD 500 threshold in the agreement; five-minute trade exclusion and written-approval issue for pass-through.
- HFM: official partner pages advertise up to USD 30/lot, 60% revenue share, daily payments and low withdrawal threshold; Japan/entity applicability remains unresolved.
- Exness: Japanese help centre documents account/tier commission formulas, up to 100% partner-reward sharing, instant/daily rewards, API/postback/reporting and restrictions; entity-specific Japan agreement remains open.
- Vantage Trading: Japan-facing rank matrix up to USD 12/lot, next-day credit, sub-affiliate structure and explicit exclusions; application/rank rules need confirmation.
- XS.com: Japan digital affiliate page states same-day wallet payment and real-time reporting; numeric rate and Japan-specific agreement were not identified; `GAP-001` remains open.

## Safe continuation sequence

1. Run `npm run validate:data`.
2. Run `npm install && npm run dev` and manually verify all five views, the add-source flow, PDF print, chat and workspace card save.
3. Use the scheduled refresh artifact to identify URL changes; do not auto-promote text.
4. Add a reviewed importer for browser-exported source-register additions.
5. Add a private backend/serverless connector for APIs and LLM-assisted extraction; keep keys server-side.
6. Add a human review queue with old/new snapshots, source IDs, evidence class, reviewer and approval status.
7. Only then connect private affiliate KPIs and authenticated access.

## Important implementation notes

- GitHub Pages is a static host; it is not the right place for secret-bearing APIs or server-side scraping.
- The app supports a no-build branch deployment now: `index.html` loads `src/main.js` and the JSON files under `data/` directly in the browser. Preserve that mode until npm/Vite access is available.
- `base: './'` in `vite.config.js` is intentional for project Pages URLs.
- The browser-bar refresh fallback is deterministic local evidence mode when no endpoint is configured.
- Browser-local source additions and workspaces are convenience features, not durable repository truth.
- The refresh worker uses built-in Node APIs to keep the first phase free of a runtime scraping dependency.

## Handoff checklist

- [ ] Confirm the final GitHub repository name and owner.
- [ ] Decide whether the repository can be public; if not, confirm Pages eligibility for the chosen GitHub plan.
- [ ] Decide where a private research API will run.
- [ ] Agree the source-review owner and cadence.
- [ ] Agree which affiliate KPIs may be connected and what data must remain private.
- [ ] Add the final XMTD logo asset if the supplied logo changes.
