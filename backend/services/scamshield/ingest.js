/**
 * ScamShield ingestion pipeline: normalize → upsert indicator → append observation
 * → recompute confidence → correlate.
 * Idempotent via source_id + source_ref + indicator_id and ingest run keys.
 */

import { createHash, randomUUID } from 'crypto';
import { normalizeIndicator, NormalizationError } from './normalize.js';
import { computeConfidence } from './confidence.js';
import { correlateIndicators } from './correlate.js';
import * as store from './store.js';
import { fetchUrlhausRecords, SOURCE_ID as URLHAUS } from './feeds/urlhaus.js';
import { fetchOpenPhishRecords, SOURCE_ID as OPENPHISH } from './feeds/openphish.js';

const MAX_BATCH = Number(process.env.SCAMSHIELD_INGEST_MAX_BATCH) || 500;

/**
 * Ingest a single mapped feed record (already normalized or skip-marked).
 */
export async function ingestMappedRecord(mapped) {
  if (!mapped || mapped.skip) {
    return { status: 'skipped', reason: mapped?.reason || 'invalid' };
  }

  const { normalized } = mapped;
  const observedAt = mapped.observedAt || new Date().toISOString();

  const { indicator, created: indicatorCreated } = await store.upsertIndicator({
    indicatorType: normalized.indicatorType,
    valueNormalized: normalized.valueNormalized,
    valueRaw: normalized.valueRaw,
    firstSeenAt: observedAt,
    lastSeenAt: observedAt,
    tags: mapped.tags || [],
    derivedDomain: normalized.derivedDomain || null,
    confidence: 0,
    confidenceExplanation: {}
  });

  // Also upsert derived domain as a separate indicator (explainable link later)
  let domainIndicator = null;
  if (normalized.derivedDomain && normalized.indicatorType === 'url') {
    try {
      const domainNorm = normalizeIndicator(normalized.derivedDomain, 'domain');
      const upserted = await store.upsertIndicator({
        indicatorType: 'domain',
        valueNormalized: domainNorm.valueNormalized,
        valueRaw: domainNorm.valueRaw,
        firstSeenAt: observedAt,
        lastSeenAt: observedAt,
        tags: mapped.tags || [],
        derivedDomain: domainNorm.valueNormalized,
        confidence: 0,
        confidenceExplanation: {}
      });
      domainIndicator = upserted.indicator;
    } catch (error) {
      if (!(error instanceof NormalizationError)) throw error;
    }
  }

  const { observation, created: observationCreated } = await store.appendObservation({
    indicatorId: indicator.indicatorId,
    sourceId: mapped.sourceId,
    sourceRef: mapped.sourceRef,
    observedAt,
    rawRecord: mapped.rawRecord || {},
    threatType: mapped.threatType || null,
    tags: mapped.tags || [],
    confidenceReported: mapped.confidenceReported ?? null
  });

  const observations = await store.getObservationsForIndicator(indicator.indicatorId);
  const { confidence, explanation } = computeConfidence(
    observations.map((o) => ({
      sourceId: o.sourceId,
      confidenceReported: o.confidenceReported,
      observedAt: o.observedAt
    }))
  );
  await store.updateIndicatorConfidence(indicator.indicatorId, confidence, explanation);

  if (domainIndicator) {
    const domainObs = await store.getObservationsForIndicator(domainIndicator.indicatorId);
    // Attribute domain sighting to same source without duplicating raw URL payload
    if (observationCreated) {
      await store.appendObservation({
        indicatorId: domainIndicator.indicatorId,
        sourceId: mapped.sourceId,
        sourceRef: `domain:${mapped.sourceRef}`,
        observedAt,
        rawRecord: { derived_from: mapped.rawRecord?.url || normalized.valueRaw },
        threatType: mapped.threatType || null,
        tags: mapped.tags || [],
        confidenceReported: mapped.confidenceReported ?? null
      });
    }
    const refreshed = domainObs.length
      ? await store.getObservationsForIndicator(domainIndicator.indicatorId)
      : await store.getObservationsForIndicator(domainIndicator.indicatorId);
    const domainConf = computeConfidence(
      refreshed.map((o) => ({
        sourceId: o.sourceId,
        confidenceReported: o.confidenceReported,
        observedAt: o.observedAt
      }))
    );
    await store.updateIndicatorConfidence(
      domainIndicator.indicatorId,
      domainConf.confidence,
      domainConf.explanation
    );
  }

  return {
    status: observationCreated ? 'upserted' : 'duplicate',
    indicatorId: indicator.indicatorId,
    indicatorCreated,
    observationId: observation.observationId,
    confidence
  };
}

/**
 * Run correlation across current store snapshot for recently touched indicators.
 */
export async function runCorrelation(limit = 1000) {
  const indicators = (await store.listAllIndicators()).slice(0, limit);
  const observations = await store.listAllObservations();
  const relationships = correlateIndicators(indicators, observations);
  let created = 0;
  for (const rel of relationships) {
    const result = await store.upsertRelationship(rel);
    if (result.created) created += 1;
  }
  return { evaluated: indicators.length, relationships: relationships.length, created };
}

function idempotencyKey(sourceId, payloadFingerprint) {
  return createHash('sha256').update(`${sourceId}|${payloadFingerprint}`).digest('hex');
}

/**
 * Ingest a batch of mapped records with optional idempotent run tracking.
 */
export async function ingestBatch(mappedRecords, { sourceId, runKey = null } = {}) {
  const startedAt = new Date().toISOString();
  const batch = mappedRecords.slice(0, MAX_BATCH);
  const fingerprint = createHash('sha256')
    .update(batch.map((r) => r.sourceRef || r.normalized?.valueNormalized || '').join('|'))
    .digest('hex')
    .slice(0, 32);
  const key = runKey || idempotencyKey(sourceId || 'batch', fingerprint);

  const existing = await store.findIngestRunByIdempotencyKey(key);
  if (existing && existing.status === 'success') {
    return {
      status: 'skipped',
      reason: 'idempotent_replay',
      run: existing
    };
  }

  const runId = randomUUID();
  const run = {
    runId,
    sourceId: sourceId || 'batch',
    startedAt,
    finishedAt: null,
    status: 'running',
    recordsFetched: batch.length,
    recordsUpserted: 0,
    recordsSkipped: 0,
    errorMessage: null,
    idempotencyKey: key
  };
  await store.saveIngestRun(run);

  try {
    for (const mapped of batch) {
      const result = await ingestMappedRecord(mapped);
      if (result.status === 'upserted') run.recordsUpserted += 1;
      else run.recordsSkipped += 1;
    }
    const correlation = await runCorrelation();
    run.status = 'success';
    run.finishedAt = new Date().toISOString();
    await store.saveIngestRun(run);
    return { status: 'success', run, correlation };
  } catch (error) {
    run.status = 'failed';
    run.errorMessage = error.message;
    run.finishedAt = new Date().toISOString();
    await store.saveIngestRun(run);
    throw error;
  }
}

/**
 * Pull from a named feed and ingest.
 * @param {'urlhaus'|'openphish'} feed
 */
export async function ingestFromFeed(feed, options = {}) {
  let records;
  let sourceId;
  try {
    if (feed === 'urlhaus') {
      sourceId = URLHAUS;
      records = await fetchUrlhausRecords(options);
    } else if (feed === 'openphish') {
      sourceId = OPENPHISH;
      records = await fetchOpenPhishRecords(options);
    } else {
      const err = new Error(`Unknown feed: ${feed}`);
      err.code = 'UNKNOWN_FEED';
      throw err;
    }
  } catch (error) {
    const run = {
      runId: randomUUID(),
      sourceId: feed,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: error.code === 'RATE_LIMITED' || error.code === 'FEED_DISABLED' ? 'skipped' : 'failed',
      recordsFetched: 0,
      recordsUpserted: 0,
      recordsSkipped: 0,
      errorMessage: error.message,
      idempotencyKey: `fail:${feed}:${Date.now()}`
    };
    await store.saveIngestRun(run);
    return { status: run.status, error: error.message, code: error.code, run };
  }

  return ingestBatch(records, { sourceId });
}

/**
 * Manual analyst submission — stores indicator metadata only.
 * NEVER fetches the submitted URL.
 */
export async function ingestManualIndicator({ value, type = null, tags = [], createdBy = null }) {
  const normalized = normalizeIndicator(value, type);
  const mapped = {
    normalized,
    sourceId: 'manual',
    sourceRef: `manual:${createdBy || 'anon'}:${normalized.valueNormalized}`,
    observedAt: new Date().toISOString(),
    threatType: 'manual_report',
    tags: [...tags, 'manual'],
    confidenceReported: 0.4,
    rawRecord: {
      submitted_value: value,
      submitted_by: createdBy,
      note: 'Manual submission — URL was not fetched'
    }
  };
  return ingestMappedRecord(mapped);
}
