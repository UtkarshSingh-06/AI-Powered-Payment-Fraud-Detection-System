/**
 * Deterministic confidence scoring with machine-readable explanations.
 * Does not take automated blocking actions.
 */

import { clampConfidence } from './normalize.js';

const SOURCE_BASE = {
  urlhaus: 0.72,
  openphish_community: 0.55,
  threatfox: 0.75,
  manual: 0.4,
  unknown: 0.35
};

/**
 * Compute confidence from source observations.
 * @param {Array<{sourceId: string, confidenceReported?: number|null, observedAt?: string|Date}>} observations
 */
export function computeConfidence(observations = []) {
  if (!observations.length) {
    return {
      confidence: 0,
      explanation: {
        summary: 'No source observations; confidence is zero.',
        factors: [],
        action: 'investigate_only'
      }
    };
  }

  const factors = [];
  const sourceIds = [...new Set(observations.map((o) => o.sourceId))];
  let score = 0;

  for (const sourceId of sourceIds) {
    const base = SOURCE_BASE[sourceId] ?? SOURCE_BASE.unknown;
    const fromSource = observations.filter((o) => o.sourceId === sourceId);
    const reported = fromSource
      .map((o) => o.confidenceReported)
      .filter((v) => v != null && Number.isFinite(Number(v)))
      .map((v) => clampConfidence(v, base));
    const sourceScore = reported.length
      ? reported.reduce((a, b) => a + b, 0) / reported.length
      : base;
    factors.push({
      factor: 'source_base',
      sourceId,
      weight: sourceScore,
      detail: `Base trust for ${sourceId}: ${sourceScore}`
    });
    score = Math.max(score, sourceScore);
  }

  if (sourceIds.length >= 2) {
    const boost = Math.min(0.15, 0.05 * (sourceIds.length - 1));
    score = Math.min(1, score + boost);
    factors.push({
      factor: 'multi_source_corroboration',
      weight: boost,
      detail: `Corroborated by ${sourceIds.length} distinct sources (+${boost})`
    });
  }

  if (observations.length >= 3) {
    const boost = 0.05;
    score = Math.min(1, score + boost);
    factors.push({
      factor: 'repeat_observations',
      weight: boost,
      detail: `${observations.length} observations increase confidence (+${boost})`
    });
  }

  const confidence = clampConfidence(score, 0);
  return {
    confidence,
    explanation: {
      summary: `Confidence ${confidence} from ${observations.length} observation(s) across ${sourceIds.length} source(s). Unverified intelligence — investigate only; do not auto-block.`,
      factors,
      sources: sourceIds,
      action: 'investigate_only'
    }
  };
}
