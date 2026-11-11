import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const config = await readJson('data/research-config.json');
const register = await readJson('data/source-register.json');
const requestedMax = Number(process.argv.find(arg => arg.startsWith('--max='))?.split('=')[1] || config.maxFetchesPerRun);
const maxFetches = Math.min(Math.max(requestedMax, 1), config.maxFetchesPerRun);
const allowed = new Set(config.allowlistedDomains);
const uniqueRecords = [...new Map(register.records.filter(record => record.URL).map(record => [record.URL, record])).values()].slice(0, maxFetches);
const snapshots = [];
const robotsCache = new Map();

function hostnameOf(value) {
  try { return new URL(value).hostname; } catch { return ''; }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': 'XMTD-Competitor-Intelligence/1.1 (research; contact project owner)', ...(options.headers || {}) } }); }
  finally { clearTimeout(timeout); }
}

async function robotsAllowed(url) {
  if (!config.respectRobotsTxt) return true;
  const origin = new URL(url).origin;
  if (!robotsCache.has(origin)) {
    try {
      const response = await fetchWithTimeout(`${origin}/robots.txt`);
      robotsCache.set(origin, response.ok ? await response.text() : '');
    } catch { robotsCache.set(origin, ''); }
  }
  const robots = robotsCache.get(origin);
  // Conservative baseline: if a disallow line names the exact path, skip it.
  const pathName = new URL(url).pathname;
  return !robots.split(/\r?\n/).some(line => /^\s*disallow:\s*(\S+)/i.test(line) && pathName.startsWith(line.match(/^\s*disallow:\s*(\S+)/i)[1]));
}

function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

for (const record of uniqueRecords) {
  const url = record.URL;
  const domain = hostnameOf(url);
  const snapshot = { sourceId: record['Source ID'], competitor: record.Competitor, url, fetchedAt: new Date().toISOString(), status: 'not-fetched' };
  if (!allowed.has(domain)) { snapshot.status = 'blocked-domain'; snapshots.push(snapshot); continue; }
  if (!(await robotsAllowed(url))) { snapshot.status = 'blocked-robots'; snapshots.push(snapshot); continue; }
  try {
    const response = await fetchWithTimeout(url);
    const body = await response.text();
    snapshot.status = response.ok ? 'fetched' : `http-${response.status}`;
    snapshot.finalUrl = response.url;
    snapshot.httpStatus = response.status;
    snapshot.contentType = response.headers.get('content-type') || '';
    snapshot.lastModified = response.headers.get('last-modified') || '';
    snapshot.etag = response.headers.get('etag') || '';
    snapshot.title = extractTitle(body);
    snapshot.sha256 = crypto.createHash('sha256').update(body).digest('hex');
    snapshot.bytes = Buffer.byteLength(body);
  } catch (error) {
    snapshot.status = error.name === 'AbortError' ? 'timeout' : 'error';
    snapshot.error = error.message;
  }
  snapshots.push(snapshot);
}

const outputDir = path.join(root, 'data/refresh');
await fs.mkdir(outputDir, { recursive: true });
const run = { schemaVersion: '1.1', generatedAt: new Date().toISOString(), maxFetches, allowlistedDomains: config.allowlistedDomains, snapshots };
await fs.writeFile(path.join(outputDir, 'last-run.json'), JSON.stringify(run, null, 2));
await fs.writeFile(path.join(outputDir, 'changes.json'), JSON.stringify({ schemaVersion: '1.1', generatedAt: run.generatedAt, note: 'Hash-level snapshots only. Human review is required before changing competitor analysis claims.', changes: snapshots.filter(item => item.status === 'fetched') }, null, 2));
console.log(`Fetched ${snapshots.filter(item => item.status === 'fetched').length}/${snapshots.length} allowlisted source URL(s). Review data/refresh before promoting any change into analysis JSON.`);

