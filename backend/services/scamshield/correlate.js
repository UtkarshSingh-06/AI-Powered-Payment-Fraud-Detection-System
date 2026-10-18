/**
 * Deterministic, testable correlation rules.
 * No ML/LLM — explainable relationships only.
 */

import { createHash } from 'crypto';
import { extractDomainFromNormalized } from './normalize.js';

export const CORRELATION_RULES = {
  SHARED_DOMAIN: {
    id: 'rule.shared_domain',
    type: 'shares_domain',
    confidence: 0.7,
    explanation: (domain) => `Both indicators resolve to the same registrable host "${domain}".`
  },
  URL_TO_DOMAIN: {
    id: 'rule.url_hosts_domain',
    type: 'url_hosts_domain',
    confidence: 0.85,
    explanation: (domain) => `URL indicator hosts domain "${domain}".`
  },
  SHARED_HASH_TAG: {
    id: 'rule.shared_payload_hash',
    type: 'shared_payload_hash',
    confidence: 0.8,
    explanation: (hash) => `Observations reference the same payload hash "${hash}".`
  },
  SAME_SOURCE_REF_CLUSTER: {
    id: 'rule.same_campaign_tag',
    type: 'shared_campaign_tag',
    confidence: 0.55,
    explanation: (tag) => `Indicators share campaign/malware tag "${tag}".`
  }
};

function relationshipId(a, b, ruleId) {
  const [left, right] = [a, b].sort();
  return createHash('sha256').update(`${left}|${right}|${ruleId}`).digest('hex').slice(0, 32);
}

function pairKey(a, b) {
  return [a, b].sort().join('|');
}

/**
 * Build relationships for a set of indicators + observations.
 * Conservative: avoids correlating common/generic tags.
 */
export function correlateIndicators(indicators = [], observations = []) {
  const relationships = [];
  const seen = new Set();

  const byId = new Map(indicators.map((i) => [i.indicatorId, i]));
  const domainBuckets = new Map();
  const tagBuckets = new Map();
  const hashBuckets = new Map();

  const GENERIC_TAGS = new Set([
    'malware',
    'phishing',
    'url',
    'none',
    'unknown',
    'c2',
    'loader',
    'stealer'
  ]);

  for (const ind of indicators) {
    const domain =
      ind.derivedDomain ||
      extractDomainFromNormalized({
        indicatorType: ind.indicatorType,
        valueNormalized: ind.valueNormalized,
        derivedDomain: ind.derivedDomain
      });
    if (domain) {
      if (!domainBuckets.has(domain)) domainBuckets.set(domain, []);
      domainBuckets.get(domain).push(ind);
    }
  }

  // URL → domain edges
  for (const ind of indicators) {
    if (ind.indicatorType !== 'url') continue;
    const domain =
      ind.derivedDomain ||
      extractDomainFromNormalized({
        indicatorType: 'url',
        valueNormalized: ind.valueNormalized
      });
    if (!domain) continue;
    const domainInd = indicators.find(
      (d) => d.indicatorType === 'domain' && d.valueNormalized === domain
    );
    if (!domainInd) continue;
    const rule = CORRELATION_RULES.URL_TO_DOMAIN;
    const id = relationshipId(ind.indicatorId, domainInd.indicatorId, rule.id);
    const key = `${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    relationships.push({
      relationshipId: id,
      sourceIndicatorId: ind.indicatorId,
      targetIndicatorId: domainInd.indicatorId,
      relationshipType: rule.type,
      ruleId: rule.id,
      explanation: rule.explanation(domain),
      confidence: rule.confidence
    });
  }

  // Shared domain among URLs (and domains)
  for (const [domain, group] of domainBuckets) {
    if (group.length < 2) continue;
    // Skip extremely common false-correlation risk: single-label hosts without a dot (except IPs handled elsewhere)
    if (!domain.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(domain)) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        // Do not correlate a domain with itself via URL_TO_DOMAIN duplicate
        if (a.indicatorId === b.indicatorId) continue;
        const rule = CORRELATION_RULES.SHARED_DOMAIN;
        const id = relationshipId(a.indicatorId, b.indicatorId, rule.id);
        if (seen.has(id)) continue;
        seen.add(id);
        relationships.push({
          relationshipId: id,
          sourceIndicatorId: a.indicatorId,
          targetIndicatorId: b.indicatorId,
          relationshipType: rule.type,
          ruleId: rule.id,
          explanation: rule.explanation(domain),
          confidence: rule.confidence
        });
      }
    }
  }

  // Hash indicators + tags that look like hashes
  for (const ind of indicators) {
    if (ind.indicatorType?.startsWith('hash_')) {
      const h = ind.valueNormalized;
      if (!hashBuckets.has(h)) hashBuckets.set(h, []);
      hashBuckets.get(h).push(ind);
    }
  }

  for (const obs of observations) {
    const tags = obs.tags || [];
    for (const tag of tags) {
      const t = String(tag).toLowerCase().trim();
      if (!t || GENERIC_TAGS.has(t)) continue;
      if (/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(t)) {
        if (!hashBuckets.has(t)) hashBuckets.set(t, []);
        const ind = byId.get(obs.indicatorId);
        if (ind) hashBuckets.get(t).push(ind);
        continue;
      }
      if (!tagBuckets.has(t)) tagBuckets.set(t, new Set());
      tagBuckets.get(t).add(obs.indicatorId);
    }
  }

  for (const [hash, group] of hashBuckets) {
    const unique = [...new Map(group.map((g) => [g.indicatorId, g])).values()];
    if (unique.length < 2) continue;
    const rule = CORRELATION_RULES.SHARED_HASH_TAG;
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const id = relationshipId(unique[i].indicatorId, unique[j].indicatorId, rule.id);
        if (seen.has(id)) continue;
        seen.add(id);
        relationships.push({
          relationshipId: id,
          sourceIndicatorId: unique[i].indicatorId,
          targetIndicatorId: unique[j].indicatorId,
          relationshipType: rule.type,
          ruleId: rule.id,
          explanation: rule.explanation(hash),
          confidence: rule.confidence
        });
      }
    }
  }

  for (const [tag, idSet] of tagBuckets) {
    const ids = [...idSet];
    if (ids.length < 2 || ids.length > 50) continue; // avoid megaclusters / false campaigns
    const rule = CORRELATION_RULES.SAME_SOURCE_REF_CLUSTER;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (!byId.has(ids[i]) || !byId.has(ids[j])) continue;
        const id = relationshipId(ids[i], ids[j], rule.id);
        if (seen.has(id)) continue;
        seen.add(id);
        relationships.push({
          relationshipId: id,
          sourceIndicatorId: ids[i],
          targetIndicatorId: ids[j],
          relationshipType: rule.type,
          ruleId: rule.id,
          explanation: rule.explanation(tag),
          confidence: rule.confidence
        });
      }
    }
  }

  return relationships;
}

export function wouldFalselyCorrelate(indicators, observations) {
  // Helper for tests: detect if only generic tags would create edges
  const rels = correlateIndicators(indicators, observations);
  return rels.length;
}

export { pairKey };
