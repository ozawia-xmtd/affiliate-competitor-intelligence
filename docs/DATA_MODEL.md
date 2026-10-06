# Data model

## Source register

`data/source-register.json` preserves the 18 workbook fields exactly:

`Source ID`, `Competitor`, `Source Category`, `Source Subcategory`, `Page / Document Title`, `URL`, `Language`, `Geographic Scope`, `Programme Type`, `Effective Date`, `Date Accessed`, `Last Verified`, `Source Owner`, `File Location`, `Source Status`, `Reliability`, `Notes`, `Next Review Date`.

The UI can add browser-local records with the same fields. Use the export button to create a CSV for review and merge it into the committed JSON only after verification.

## Analysis snapshot

Each competitor record contains:

- headline economics and the basis of comparison;
- Japan applicability and a status (`clear`, `partial`, `open`);
- cashback/rebate mechanics and a separate rebate status;
- payout, restrictions and reporting observations;
- open issue, source IDs and evidence classification;
- analyst opportunities and risks.

`not found` means the reviewed source set did not identify a term. It never means the term is not offered.

## Research snapshots

`data/refresh/last-run.json` stores fetch metadata, response status, title, ETag/Last-Modified headers and SHA-256 hashes. `data/refresh/changes.json` is a review queue, not an analysis source. A future promotion step should require a human reviewer, source ID, last-verified date and a classification.

