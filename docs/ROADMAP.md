# Phase 1.1 roadmap

## Delivered

- GitHub-ready Vite application with a responsive dashboard.
- Full source register migrated from the supplied workbook.
- Evidence-led comparison for XMTD, HFM, Exness, Vantage Trading and XS.com.
- Source add, CSV export, PDF print, evidence chat and named workspaces.
- Safe allowlisted refresh worker and GitHub Pages deployment workflows.
- Codex handoff, data model, security and operating documentation.

## Next build increments

1. Add a reviewed JSON/CSV importer that maps exported source-register additions back to the 18-field schema.
2. Add a small backend or serverless function for search/API-assisted research; keep all secrets server-side.
3. Add HTML/PDF text extraction with provenance and evidence snippets.
4. Add a human review queue that compares old/new source hashes and requires approval before analysis updates.
5. Connect affiliate KPI data (activation, referred clients, volume, payout latency and churn) through a separate private data boundary.
6. Add scenario calculators for each competitor's commission, rebate and payout rules.
7. Add an authenticated internal deployment if the dashboard will contain private affiliate performance data.

