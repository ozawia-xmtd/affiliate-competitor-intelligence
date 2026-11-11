import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const fail = message => { console.error(`DATA VALIDATION FAILED: ${message}`); process.exitCode = 1; };

const register = readJson('data/source-register.json');
const gaps = readJson('data/source-gaps.json');
const analysis = readJson('data/competitor-analyses.json');
const config = readJson('data/research-config.json');

if (register.recordCount !== register.records.length) fail(`source register recordCount ${register.recordCount} does not match ${register.records.length}`);
if (register.fields.length !== 18) fail(`source register must preserve 18 fields, found ${register.fields.length}`);
if (gaps.recordCount !== gaps.records.length) fail(`source gap recordCount ${gaps.recordCount} does not match ${gaps.records.length}`);
if (!analysis.competitors?.length) fail('competitor analysis is empty');
if (analysis.baseline !== 'XMTD') fail('analysis baseline must be XMTD');

const sourceIds = new Set(register.records.map(record => record['Source ID']).filter(Boolean));
const duplicateIds = register.records.map(record => record['Source ID']).filter((id, index, ids) => id && ids.indexOf(id) !== index);
if (duplicateIds.length) fail(`duplicate source IDs: ${[...new Set(duplicateIds)].join(', ')}`);
for (const competitor of analysis.competitors) {
  for (const source of competitor.sources) {
    if (!sourceIds.has(source)) fail(`${competitor.id} references missing source ${source}`);
  }
}
for (const domain of config.allowlistedDomains) {
  if (domain.includes('http') || domain.includes('/')) fail(`allowlisted domain must be a hostname: ${domain}`);
}

if (!process.exitCode) {
  console.log(`Validated ${register.records.length} source records, ${gaps.records.length} gap records and ${analysis.competitors.length} competitor analyses.`);
}

