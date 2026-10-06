import { createId, readJson, writeJson } from './storage.js';

let registerData = { fields: [], records: [] };
let gapsData = { fields: [], records: [] };
let SOURCE_REGISTER_FIELDS = [];
let SOURCE_GAPS_FIELDS = [];
const ADDITIONS_KEY = 'xmtd.source-register.additions.v1';

const empty = value => value == null ? '' : String(value);

export function configureSourceRegisterData(registerPayload, gapsPayload) {
  registerData = registerPayload || { fields: [], records: [] };
  gapsData = gapsPayload || { fields: [], records: [] };
}

export function loadSourceRegister() {
  const additions = readJson(ADDITIONS_KEY, []);
  return [...registerData.records, ...additions].map(record => normalizeRecord(record));
}

export function loadSourceGaps() {
  return gapsData.records.map(gap => ({ ...gap }));
}

export function normalizeRecord(record = {}) {
  const normalized = {};
  SOURCE_REGISTER_FIELDS.forEach(field => {
    normalized[field] = empty(record[field]);
  });
  return normalized;
}

export function addSourceRecord(input) {
  const record = normalizeRecord({
    'Source ID': input['Source ID']?.trim() || createId('LOCAL').toUpperCase(),
    'Competitor': input['Competitor']?.trim() || 'XMTD',
    'Source Category': input['Source Category']?.trim() || 'Online research',
    'Source Subcategory': input['Source Subcategory']?.trim() || 'Manual addition',
    'Page / Document Title': input['Page / Document Title']?.trim() || 'Untitled source',
    'URL': input.URL?.trim() || '',
    'Language': input.Language?.trim() || 'English',
    'Geographic Scope': input['Geographic Scope']?.trim() || 'Japan',
    'Programme Type': input['Programme Type']?.trim() || 'Affiliate / partner',
    'Effective Date': input['Effective Date']?.trim() || 'N/A',
    'Date Accessed': input['Date Accessed']?.trim() || new Date().toISOString().slice(0, 10),
    'Last Verified': input['Last Verified']?.trim() || 'N/A',
    'Source Owner': input['Source Owner']?.trim() || 'Local user',
    'File Location': input['File Location']?.trim() || 'N/A',
    'Source Status': input['Source Status']?.trim() || 'Collected',
    'Reliability': input.Reliability?.trim() || 'Unclassified',
    'Notes': input.Notes?.trim() || 'Added from the local app; verify before using in a report.',
    'Next Review Date': input['Next Review Date']?.trim() || 'N/A'
  });
  const additions = readJson(ADDITIONS_KEY, []);
  if (additions.some(item => item['Source ID'] === record['Source ID'])) {
    throw new Error(`Source ID ${record['Source ID']} already exists.`);
  }
  additions.push(record);
  writeJson(ADDITIONS_KEY, additions);
  return record;
}

function csvCell(value) {
  return `"${empty(value).replaceAll('"', '""')}"`;
}

export function downloadSourceRegister(records = loadSourceRegister()) {
  const rows = [SOURCE_REGISTER_FIELDS, ...records.map(record => SOURCE_REGISTER_FIELDS.map(field => record[field]))];
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'XMTD_source_register_updated.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function sourceRegisterStats(records = loadSourceRegister()) {
  const byCompetitor = records.reduce((acc, record) => {
    const competitor = record.Competitor || 'Unknown';
    acc[competitor] = (acc[competitor] || 0) + 1;
    return acc;
  }, {});
  return { total: records.length, byCompetitor, additions: Math.max(0, records.length - registerData.records.length) };
}
