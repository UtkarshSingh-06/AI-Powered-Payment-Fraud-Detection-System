import { describe, expect, it } from 'vitest';
import { correlateIndicators } from '../../services/scamshield/correlate.js';

describe('ScamShield correlation rules', () => {
  it('links URL to its domain indicator', () => {
    const indicators = [
      {
        indicatorId: 'u1',
        indicatorType: 'url',
        valueNormalized: 'https://evil.test/a',
        derivedDomain: 'evil.test'
      },
      {
        indicatorId: 'd1',
        indicatorType: 'domain',
        valueNormalized: 'evil.test',
        derivedDomain: 'evil.test'
      }
    ];
    const rels = correlateIndicators(indicators, []);
    expect(rels.some((r) => r.ruleId === 'rule.url_hosts_domain')).toBe(true);
  });

  it('correlates URLs sharing a domain', () => {
    const indicators = [
      {
        indicatorId: 'u1',
        indicatorType: 'url',
        valueNormalized: 'https://evil.test/a',
        derivedDomain: 'evil.test'
      },
      {
        indicatorId: 'u2',
        indicatorType: 'url',
        valueNormalized: 'https://evil.test/b',
        derivedDomain: 'evil.test'
      }
    ];
    const rels = correlateIndicators(indicators, []);
    expect(rels.some((r) => r.ruleId === 'rule.shared_domain')).toBe(true);
  });

  it('does not falsely correlate on generic tags only', () => {
    const indicators = [
      { indicatorId: 'a', indicatorType: 'url', valueNormalized: 'https://a.test/', derivedDomain: 'a.test' },
      { indicatorId: 'b', indicatorType: 'url', valueNormalized: 'https://b.test/', derivedDomain: 'b.test' }
    ];
    const observations = [
      { indicatorId: 'a', sourceId: 'urlhaus', tags: ['malware', 'c2'] },
      { indicatorId: 'b', sourceId: 'urlhaus', tags: ['malware', 'loader'] }
    ];
    const rels = correlateIndicators(indicators, observations);
    expect(rels.filter((r) => r.ruleId === 'rule.same_campaign_tag')).toHaveLength(0);
  });

  it('correlates on distinctive campaign tags', () => {
    const indicators = [
      { indicatorId: 'a', indicatorType: 'url', valueNormalized: 'https://a.test/', derivedDomain: 'a.test' },
      { indicatorId: 'b', indicatorType: 'url', valueNormalized: 'https://b.test/', derivedDomain: 'b.test' }
    ];
    const observations = [
      { indicatorId: 'a', sourceId: 'urlhaus', tags: ['emotet-campaign-x'] },
      { indicatorId: 'b', sourceId: 'urlhaus', tags: ['emotet-campaign-x'] }
    ];
    const rels = correlateIndicators(indicators, observations);
    expect(rels.some((r) => r.ruleId === 'rule.same_campaign_tag')).toBe(true);
  });
});
