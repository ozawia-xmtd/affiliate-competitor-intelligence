# Operating procedure

## Weekly evidence cycle

1. Run or dispatch `Refresh allowlisted competitor sources`.
2. Download the research artifact from the workflow run.
3. Review URLs with changed hashes, HTTP errors and robots blocks.
4. Open the source in a browser and verify the exact wording, jurisdiction, entity, effective date and eligibility conditions.
5. Add or update the source-register record with the URL, access date, owner, reliability, notes and next review date.
6. Update `data/competitor-analyses.json` only where evidence supports a changed conclusion.
7. Keep the evidence class visible and link source IDs in opportunities and risks.
8. Run `npm run validate:data`, review the UI locally, then open a pull request.

## Monthly retention review

- Compare affiliate activation, payout latency, active referred clients, partner churn and campaign engagement against the competitor evidence signals.
- Test one retention improvement at a time: payout friction, clarity of pass-through mechanics, rate calculators, reporting alerts or partner enablement.
- Record outcome and decision context in a new workspace card or a project issue.

## Source additions

Use the browser-bar plus button for quick capture. Export the register, review the row, then merge it into `data/source-register.json` through a pull request. Do not rely on browser local storage as the durable source of truth.

