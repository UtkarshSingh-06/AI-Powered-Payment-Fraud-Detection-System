import { describe, expect, it } from 'vitest';
import { computeConfidence } from '../../services/scamshield/confidence.js';

describe('ScamShield confidence', () => {
  it('returns zero without observations', () => {
    const result = computeConfidence([]);
    expect(result.confidence).toBe(0);
    expect(result.explanation.action).toBe('investigate_only');
  });

  it('boosts on multi-source corroboration and stays bounded', () => {
    const result = computeConfidence([
      { sourceId: 'urlhaus', confidenceReported: 0.72 },
      { sourceId: 'openphish_community', confidenceReported: 0.55 },
      { sourceId: 'urlhaus', confidenceReported: 0.72 }
    ]);
    expect(result.confidence).toBeGreaterThan(0.72);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.explanation.factors.some((f) => f.factor === 'multi_source_corroboration')).toBe(
      true
    );
    expect(result.explanation.summary).toMatch(/investigate only/i);
  });

  it('clamps invalid reported confidence', () => {
    const result = computeConfidence([{ sourceId: 'manual', confidenceReported: 9 }]);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
