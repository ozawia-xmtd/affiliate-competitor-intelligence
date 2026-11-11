# XMTD Competitor Intelligence

GitHub-ready, local-first competitor intelligence for XMTrading (XMTD) in the Japan affiliate market.

The app keeps the supplied `XMTD Competitor Source Register.xlsx` structure as its evidence index and turns the latest source-pack analysis into a maintainable application. It is designed to help the affiliate team improve partner retention and engagement by making competitor economics, cashback mechanics, payout friction, evidence gaps, opportunities and risks easy to review.

## Current data baseline

- 138 source-register records migrated from the supplied workbook.
- XMTD baseline plus HFM, Exness, Vantage Trading and XS.com.
- One registered high-priority open gap: `GAP-001`, XS Japan-specific affiliate agreement.
- Latest analysis snapshot: 2 October 2026, based on the supplied evidence pack.
- Evidence labels remain explicit: verified fact, competitor claim, external affiliate opinion, analyst interpretation and unknown.

## Run directly from GitHub Pages without npm

The application now supports a no-build browser mode. Keep the repository structure intact and publish the repository root through GitHub Pages. `index.html` loads the application modules and JSON data from the `src/` and `data/` folders using browser-native ES modules.

This is the correct temporary setup while npm and VS Code are unavailable. Do not upload only one HTML file.

## Run locally later with npm

```bash
cd xmtd-competitor-intelligence
npm install
npm run validate:data
npm run dev
```

Open the local URL shown by Vite. A production build is created with:

```bash
npm run build
npm run preview
```

The npm/Vite build remains available for the later VS Code workflow.

## App capabilities

- Browser bar: refresh, add a source-register record, and print/save the current analysis as PDF.
- Overview: comparison matrix, evidence footprint, opportunities and material risks.
- Economics: headline economics with a warning that models are not directly comparable.
- Rebate & payout: partner reward, client pass-through and payment speed are kept separate.
- Gaps & risks: open evidence gaps and linked analyst risks.
- Source register: search, inspect, export and locally append records while preserving the 18 workbook fields.
- Evidence analyst: answer questions such as “What is the current cashback offering of HFM?” with source IDs. Answers can be saved as cards in a named workspace stored in the browser.

## Research architecture

GitHub Pages is a static host, so it must not contain credentials or perform unrestricted scraping from the browser. The app therefore has three modes:

1. Local evidence mode: deterministic answers from the committed register and analysis JSON.
2. Optional research endpoint: set `VITE_XMTD_RESEARCH_ENDPOINT` or `window.XMTD_RESEARCH_ENDPOINT` to a backend that returns a validated analysis payload.
3. Scheduled snapshot mode: `.github/workflows/refresh-research.yml` fetches only allowlisted, public source-register URLs, respects a robots check, applies a timeout, stores hashes and uploads a review artifact. It does not silently rewrite analysis claims.

This separation keeps online research useful without letting an LLM or scraper silently promote an unverified claim into the dashboard.

## Repository map

```text
data/                         committed evidence and analysis inputs
docs/                         operating, security and Codex handoff documentation
scripts/                      validation and allowlisted research worker
src/lib/                      source register, analysis and connector logic
src/main.js                   application UI and interactions
src/styles.css                dashboard, responsive and print styling
.github/workflows/            Pages deploy, validation and research refresh
```

## GitHub Pages setup

Follow [docs/GITHUB_PAGES.md](docs/GITHUB_PAGES.md). The workflow is already included; after it is enabled, every push to `main` validates the data, builds `dist/`, and deploys it to Pages.

## Handoff to Codex

Start with [docs/CODEX_MIGRATION.md](docs/CODEX_MIGRATION.md). It records the source-of-truth rules, current assumptions, safe boundaries, commands, data contracts and the next implementation milestones.
