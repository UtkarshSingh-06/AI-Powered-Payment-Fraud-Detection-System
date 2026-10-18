import { beforeEach, describe, expect, it } from 'vitest';
import { resetMemoryStore } from '../../services/scamshield/store.js';
import { ingestBatch, ingestMappedRecord, ingestFromFeed } from '../../services/scamshield/ingest.js';
import { parseUrlhausCsv, mapUrlhausRecord } from '../../services/scamshield/feeds/urlhaus.js';
import { parseOpenPhishFeed, mapOpenPhishUrl } from '../../services/scamshield/feeds/openphish.js';
import * as store from '../../services/scamshield/store.js';

const SAMPLE_CSV = `# URLhaus CSV
id,dateadded,url,url_status,last_online,threat,tags,urlhaus_link,reporter
123,"2024-01-01 12:00:00","https://evil-scamshield-test.example/payload",online,,"malware_download","emotet,exe","https://urlhaus.abuse.ch/url/123/","researcher"
124,"2024-01-01 13:00:00","https://evil-scamshield-test.example/other",online,,"malware_download","emotet","https://urlhaus.abuse.ch/url/124/","researcher"
`;

describe('ScamShield ingestion', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it('parses URLhaus CSV and OpenPhish feed', () => {
    const rows = parseUrlhausCsv(SAMPLE_CSV);
    expect(rows).toHaveLength(2);
    expect(mapUrlhausRecord(rows[0]).normalized.derivedDomain).toBe('evil-scamshield-test.example');

    const urls = parseOpenPhishFeed('https://phish.example/login\n# comment\nnot-a-url\n');
    expect(urls).toHaveLength(1);
    expect(mapOpenPhishUrl(urls[0]).normalized.indicatorType).toBe('url');
  });

  it('deduplicates observations while preserving provenance on first write', async () => {
    const mapped = mapUrlhausRecord(parseUrlhausCsv(SAMPLE_CSV)[0]);
    const first = await ingestMappedRecord(mapped);
    const second = await ingestMappedRecord(mapped);
    expect(first.status).toBe('upserted');
    expect(second.status).toBe('duplicate');

    const observations = await store.getObservationsForIndicator(first.indicatorId);
    expect(observations).toHaveLength(1);
    expect(observations[0].rawRecord.url).toContain('evil-scamshield-test.example');
    expect(observations[0].sourceId).toBe('urlhaus');
  });

  it('skips malformed / private / malicious inputs', async () => {
    const bad = [
      mapUrlhausRecord({ id: '1', url: 'http://127.0.0.1/x', tags: '' }),
      mapUrlhausRecord({ id: '2', url: 'javascript:alert(1)', tags: '' }),
      mapUrlhausRecord({ id: '3', url: 'http://user:pass@evil.com/', tags: '' })
    ];
    for (const m of bad) {
      expect(m.skip).toBe(true);
    }
    const result = await ingestBatch(bad, { sourceId: 'urlhaus', runKey: 'test-bad-1' });
    expect(result.status).toBe('success');
    expect(result.run.recordsUpserted).toBe(0);
  });

  it('ingests feed via mock payload without live network', async () => {
    const result = await ingestFromFeed('urlhaus', { csvText: SAMPLE_CSV, skipRateLimit: true });
    expect(result.status).toBe('success');
    expect(result.run.recordsUpserted).toBeGreaterThan(0);
    expect(result.correlation.relationships).toBeGreaterThan(0);

    const search = await store.searchIndicators({ q: 'evil-scamshield-test.example' });
    expect(search.total).toBeGreaterThan(0);

    // idempotent replay
    const replay = await ingestFromFeed('urlhaus', { csvText: SAMPLE_CSV, skipRateLimit: true });
    expect(replay.status).toBe('skipped');
  });

  it('handles feed auth failure without crashing', async () => {
    const prev = process.env.URLHAUS_AUTH_KEY;
    delete process.env.URLHAUS_AUTH_KEY;
    const result = await ingestFromFeed('urlhaus', {});
    expect(['failed', 'skipped']).toContain(result.status);
    expect(result.code).toBe('MISSING_AUTH');
    if (prev) process.env.URLHAUS_AUTH_KEY = prev;
  });
});
