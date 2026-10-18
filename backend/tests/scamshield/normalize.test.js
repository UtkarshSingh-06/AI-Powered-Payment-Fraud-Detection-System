import { describe, expect, it } from 'vitest';
import {
  normalizeUrl,
  normalizeDomain,
  normalizeIp,
  normalizeHash,
  normalizeIndicator,
  NormalizationError
} from '../../services/scamshield/normalize.js';

describe('ScamShield normalization', () => {
  it('normalizes URLs without fetching', () => {
    const n = normalizeUrl('HTTPS://Evil.Example.COM/Path/?q=1#frag');
    expect(n.indicatorType).toBe('url');
    expect(n.valueNormalized.startsWith('https://evil.example.com/Path')).toBe(true);
    expect(n.valueNormalized).toContain('q=1');
    expect(n.valueNormalized).not.toContain('#');
    expect(n.derivedDomain).toBe('evil.example.com');
  });

  it('rejects private IPs and credentials', () => {
    expect(() => normalizeUrl('http://127.0.0.1/malware')).toThrow(NormalizationError);
    expect(() => normalizeUrl('http://192.168.1.10/x')).toThrow(NormalizationError);
    expect(() => normalizeUrl('http://user:pass@evil.com/')).toThrow(NormalizationError);
    expect(() => normalizeUrl('ftp://evil.com/file')).toThrow(NormalizationError);
  });

  it('rejects control characters and oversized input', () => {
    expect(() => normalizeUrl('http://evil.com/\u0000')).toThrow(NormalizationError);
    expect(() => normalizeUrl(`http://evil.com/${'a'.repeat(3000)}`)).toThrow(NormalizationError);
  });

  it('normalizes domains and hashes', () => {
    expect(normalizeDomain('WWW.Example.COM.').valueNormalized).toBe('www.example.com');
    expect(normalizeHash('A'.repeat(32)).indicatorType).toBe('hash_md5');
    expect(normalizeHash('b'.repeat(40)).indicatorType).toBe('hash_sha1');
    expect(normalizeHash('c'.repeat(64)).indicatorType).toBe('hash_sha256');
  });

  it('rejects private IPs for ip type', () => {
    expect(() => normalizeIp('10.0.0.5')).toThrow(NormalizationError);
    expect(normalizeIp('8.8.8.8').valueNormalized).toBe('8.8.8.8');
  });

  it('auto-detects type', () => {
    expect(normalizeIndicator('https://phish.test/login').indicatorType).toBe('url');
    expect(normalizeIndicator('phish.test').indicatorType).toBe('domain');
    expect(normalizeIndicator('d'.repeat(64)).indicatorType).toBe('hash_sha256');
  });
});
