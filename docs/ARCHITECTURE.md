# Architecture

## Design goal

Provide a durable evidence workflow for Japan affiliate competitor intelligence while keeping the user interface fast, local-first and safe to publish as a static GitHub Pages site.

## Layers

| Layer | Files | Responsibility |
| --- | --- | --- |
| Evidence index | `data/source-register.json`, `data/source-gaps.json` | Preserve the supplied workbook structure and gap register. |
| Analysis snapshot | `data/competitor-analyses.json` | Store the latest human-reviewed comparison, opportunities and risks. |
| Domain logic | `src/lib/source-register.js`, `src/lib/analysis-engine.js` | Normalize register rows, derive counts, classify evidence and answer grounded questions. |
| Research connector | `src/lib/research-connectors.js`, `scripts/refresh-research.mjs` | Route optional online research through an explicit endpoint or a scheduled, allowlisted snapshot worker. |
| Presentation | `src/main.js`, `src/styles.css` | Render comparison views, source modals, chat and workspaces. |
| Deployment | `.github/workflows/` | Validate, build and deploy the static site; create reviewable research artifacts. |

## Refresh flow

1. A user clicks the browser-bar refresh button or dispatches the scheduled workflow.
2. The app reloads the full source register, including local additions.
3. If a research endpoint is configured, the endpoint receives the source register, allowlist and current analysis. It must return a full validated analysis payload.
4. If no endpoint is configured, the app recomputes deterministic local evidence and clearly labels the mode.
5. The scheduled worker fetches only unique URLs in the register, after a domain and robots check. It stores response metadata and content hashes.
6. A human reviews changes and updates the analysis JSON. The system does not auto-promote scraped text into a claim.

## Deliberate non-goals in Phase 1.1

- No credentials, partner login automation or bypassing of anti-bot controls.
- No hidden browser scraping from GitHub Pages.
- No automatic overall competitor ranking when commercial bases are not comparable.
- No autonomous write-back to the source register or analysis JSON from an LLM.

