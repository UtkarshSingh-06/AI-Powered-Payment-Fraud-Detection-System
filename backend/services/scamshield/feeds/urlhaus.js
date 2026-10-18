/**
 * URLhaus (abuse.ch) community feed adapter.
 *
 * Access (verified 2026): Auth-Key required via https://auth.abuse.ch/
 * Fair use: dumps regenerate every 5 minutes — do not fetch more often.
 * License: community API free under fair-use; commercial use may need paid API.
 * Docs: https://urlhaus.abuse.ch/api/
 *
 * We never submit URLs or auto-fetch indicator targets (SSRF prevention).
 */

import { fetchText } from '../httpClient.js';
import { normalizeIndicator, NormalizationError, clampConfidence } from '../normalize.js';

export const SOURCE_ID = 'urlhaus';

/**
 * Parse URLhaus CSV (comment lines start with #).
 * Columns historically: id, dateadded, url, url_status, last_online, threat, tags, urlhaus_link, reporter
 */
export function parseUrlhausCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (!lines.length) return [];

  let headers = null;
  const records = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    if (!headers) {
      // Detect header row
      if (cols.some((c) => /^(id|url|dateadded)$/i.test(c.replace(/"/g, '')))) {
        headers = cols.map((c) => c.replace(/"/g, '').toLowerCase());
        continue;
      }
      // Fallback fixed schema
      headers = [
        'id',
        'dateadded',
        'url',
        'url_status',
        'last_online',
        'threat',
        'tags',
        'urlhaus_link',
        'reporter'
      ];
    }
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || '').replace(/^"|"$/g, '').trim();
    });
    if (!obj.url) continue;
    records.push(obj);
  }
  return records;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

export function mapUrlhausRecord(raw) {
  try {
    const normalized = normalizeIndicator(raw.url, 'url');
    const tags = String(raw.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const observedAt = raw.dateadded
      ? new Date(raw.dateadded.replace(' ', 'T') + 'Z').toISOString()
      : new Date().toISOString();
    return {
      normalized,
      sourceId: SOURCE_ID,
      sourceRef: String(raw.id || raw.urlhaus_link || normalized.valueNormalized),
      observedAt: Number.isNaN(Date.parse(observedAt)) ? new Date().toISOString() : observedAt,
      threatType: raw.threat || 'malware_download',
      tags,
      confidenceReported: clampConfidence(0.72),
      rawRecord: {
        id: raw.id || null,
        url: raw.url,
        url_status: raw.url_status || null,
        threat: raw.threat || null,
        tags,
        reporter: raw.reporter || null,
        urlhaus_link: raw.urlhaus_link || null
      }
    };
  } catch (error) {
    if (error instanceof NormalizationError) {
      return { skip: true, reason: error.message, raw };
    }
    throw error;
  }
}

/**
 * @param {object} options
 * @param {string} [options.authKey]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {string} [options.csvText] - inject parsed body for tests (skips network)
 */
export async function fetchUrlhausRecords(options = {}) {
  if (options.csvText != null) {
    const parsed = parseUrlhausCsv(options.csvText);
    return parsed.map(mapUrlhausRecord);
  }

  const authKey = options.authKey || process.env.URLHAUS_AUTH_KEY || '';
  if (!authKey) {
    const err = new Error(
      'URLHAUS_AUTH_KEY is not configured. Obtain a free Auth-Key at https://auth.abuse.ch/'
    );
    err.code = 'MISSING_AUTH';
    throw err;
  }

  // Community export pattern (auth embedded in path per abuse.ch docs)
  const base =
    process.env.URLHAUS_EXPORT_URL ||
    `https://urlhaus-api.abuse.ch/v1/urls/recent/`;
  // Prefer Auth-Key header (works with API v1 recent) and path-style v2 exports when configured
  const url = process.env.URLHAUS_EXPORT_URL
    ? base
    : `https://urlhaus-api.abuse.ch/v1/urls/recent/`;

  const { text } = await fetchText(url, {
    fetchImpl: options.fetchImpl,
    skipRateLimit: options.skipRateLimit,
    headers: {
      'Auth-Key': authKey
    },
    minIntervalMs: options.minIntervalMs
  });

  // Recent API may return JSON; CSV dumps return CSV
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    return parseUrlhausJson(text).map(mapUrlhausRecord);
  }
  return parseUrlhausCsv(text).map(mapUrlhausRecord);
}

export function parseUrlhausJson(text) {
  const data = JSON.parse(text);
  let urls = [];
  if (Array.isArray(data)) {
    urls = data;
  } else if (Array.isArray(data.urls)) {
    urls = data.urls;
  }
  return urls.map((u) => ({
    id: String(u.id || u.url_id || ''),
    dateadded: u.dateadded || u.date_added || '',
    url: u.url,
    url_status: u.url_status || u.urlstatus || '',
    last_online: u.last_online || '',
    threat: u.threat || 'malware_download',
    tags: Array.isArray(u.tags) ? u.tags.join(',') : u.tags || '',
    urlhaus_link: u.urlhaus_reference || u.urlhaus_link || '',
    reporter: u.reporter || ''
  }));
}
