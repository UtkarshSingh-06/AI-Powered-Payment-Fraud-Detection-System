/**
 * ScamShield persistence: PostgreSQL when available, otherwise in-memory
 * (used for tests when DATABASE_URL is unset).
 * Append-preserving: never truncates tables; upserts by natural keys.
 */

import { randomUUID } from 'crypto';
import { getPostgresPool, runQuery } from '../../config/postgres.js';

function memoryState() {
  if (!globalThis.__scamshieldMemory) {
    globalThis.__scamshieldMemory = {
      indicators: new Map(),
      observations: new Map(),
      relationships: new Map(),
      investigations: new Map(),
      investigationLinks: new Map(),
      ingestRuns: new Map()
    };
  }
  return globalThis.__scamshieldMemory;
}

export function resetMemoryStore() {
  globalThis.__scamshieldMemory = {
    indicators: new Map(),
    observations: new Map(),
    relationships: new Map(),
    investigations: new Map(),
    investigationLinks: new Map(),
    ingestRuns: new Map()
  };
}

export function usePostgres() {
  return Boolean(getPostgresPool());
}

function rowToIndicator(row) {
  return {
    indicatorId: row.indicator_id,
    indicatorType: row.indicator_type,
    valueNormalized: row.value_normalized,
    valueRaw: row.value_raw,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    confidence: Number(row.confidence),
    confidenceExplanation: row.confidence_explanation,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    derivedDomain: row.derived_domain || null
  };
}

export async function upsertIndicator(indicator) {
  const now = new Date().toISOString();
  if (!usePostgres()) {
    const mem = memoryState();
    const key = `${indicator.indicatorType}|${indicator.valueNormalized}`;
    let existing = [...mem.indicators.values()].find(
      (i) => i.indicatorType === indicator.indicatorType && i.valueNormalized === indicator.valueNormalized
    );
    if (existing) {
      existing.lastSeenAt = indicator.lastSeenAt || now;
      existing.confidence = indicator.confidence ?? existing.confidence;
      existing.confidenceExplanation =
        indicator.confidenceExplanation ?? existing.confidenceExplanation;
      existing.tags = [...new Set([...(existing.tags || []), ...(indicator.tags || [])])];
      existing.updatedAt = now;
      if (indicator.derivedDomain) existing.derivedDomain = indicator.derivedDomain;
      mem.indicators.set(existing.indicatorId, existing);
      return { indicator: existing, created: false };
    }
    const record = {
      indicatorId: indicator.indicatorId || randomUUID(),
      indicatorType: indicator.indicatorType,
      valueNormalized: indicator.valueNormalized,
      valueRaw: indicator.valueRaw,
      firstSeenAt: indicator.firstSeenAt || now,
      lastSeenAt: indicator.lastSeenAt || now,
      confidence: indicator.confidence ?? 0,
      confidenceExplanation: indicator.confidenceExplanation || {},
      tags: indicator.tags || [],
      derivedDomain: indicator.derivedDomain || null,
      createdAt: now,
      updatedAt: now
    };
    mem.indicators.set(record.indicatorId, record);
    return { indicator: record, created: true };
  }

  const existing = await runQuery(
    `SELECT * FROM threat_indicators WHERE indicator_type = $1 AND value_normalized = $2`,
    [indicator.indicatorType, indicator.valueNormalized]
  );
  if (existing.rows.length) {
    const row = existing.rows[0];
    const tags = [...new Set([...(row.tags || []), ...(indicator.tags || [])])];
    const updated = await runQuery(
      `UPDATE threat_indicators
       SET last_seen_at = GREATEST(last_seen_at, $2::timestamptz),
           confidence = COALESCE($3, confidence),
           confidence_explanation = COALESCE($4::jsonb, confidence_explanation),
           tags = $5::text[],
           updated_at = now()
       WHERE indicator_id = $1
       RETURNING *`,
      [
        row.indicator_id,
        indicator.lastSeenAt || now,
        indicator.confidence ?? null,
        indicator.confidenceExplanation
          ? JSON.stringify(indicator.confidenceExplanation)
          : null,
        tags
      ]
    );
    return { indicator: rowToIndicator(updated.rows[0]), created: false };
  }

  const id = indicator.indicatorId || randomUUID();
  const inserted = await runQuery(
    `INSERT INTO threat_indicators (
       indicator_id, indicator_type, value_normalized, value_raw,
       first_seen_at, last_seen_at, confidence, confidence_explanation, tags
     ) VALUES ($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,$7,$8::jsonb,$9::text[])
     RETURNING *`,
    [
      id,
      indicator.indicatorType,
      indicator.valueNormalized,
      indicator.valueRaw,
      indicator.firstSeenAt || now,
      indicator.lastSeenAt || now,
      indicator.confidence ?? 0,
      JSON.stringify(indicator.confidenceExplanation || {}),
      indicator.tags || []
    ]
  );
  const result = rowToIndicator(inserted.rows[0]);
  result.derivedDomain = indicator.derivedDomain || null;
  return { indicator: result, created: true };
}

export async function appendObservation(observation) {
  const now = new Date().toISOString();
  const sourceRef = observation.sourceRef || 'unknown';

  if (!usePostgres()) {
    const mem = memoryState();
    const dedupeKey = `${observation.sourceId}|${sourceRef}|${observation.indicatorId}`;
    for (const obs of mem.observations.values()) {
      if (
        obs.sourceId === observation.sourceId &&
        obs.sourceRef === sourceRef &&
        obs.indicatorId === observation.indicatorId
      ) {
        return { observation: obs, created: false };
      }
    }
    const record = {
      observationId: observation.observationId || randomUUID(),
      indicatorId: observation.indicatorId,
      sourceId: observation.sourceId,
      sourceRef,
      observedAt: observation.observedAt || now,
      ingestedAt: now,
      rawRecord: observation.rawRecord || {},
      threatType: observation.threatType || null,
      tags: observation.tags || [],
      confidenceReported: observation.confidenceReported ?? null
    };
    mem.observations.set(record.observationId, record);
    return { observation: record, created: true };
  }

  const existing = await runQuery(
    `SELECT * FROM source_observations
     WHERE source_id = $1 AND source_ref = $2 AND indicator_id = $3`,
    [observation.sourceId, sourceRef, observation.indicatorId]
  );
  if (existing.rows.length) {
    const row = existing.rows[0];
    return {
      observation: {
        observationId: row.observation_id,
        indicatorId: row.indicator_id,
        sourceId: row.source_id,
        sourceRef: row.source_ref,
        observedAt: row.observed_at,
        ingestedAt: row.ingested_at,
        rawRecord: row.raw_record,
        threatType: row.threat_type,
        tags: row.tags || [],
        confidenceReported:
          row.confidence_reported != null ? Number(row.confidence_reported) : null
      },
      created: false
    };
  }

  const id = observation.observationId || randomUUID();
  const inserted = await runQuery(
    `INSERT INTO source_observations (
       observation_id, indicator_id, source_id, source_ref, observed_at,
       raw_record, threat_type, tags, confidence_reported
     ) VALUES ($1,$2,$3,$4,$5::timestamptz,$6::jsonb,$7,$8::text[],$9)
     RETURNING *`,
    [
      id,
      observation.indicatorId,
      observation.sourceId,
      sourceRef,
      observation.observedAt || now,
      JSON.stringify(observation.rawRecord || {}),
      observation.threatType || null,
      observation.tags || [],
      observation.confidenceReported ?? null
    ]
  );
  const row = inserted.rows[0];
  return {
    observation: {
      observationId: row.observation_id,
      indicatorId: row.indicator_id,
      sourceId: row.source_id,
      sourceRef: row.source_ref,
      observedAt: row.observed_at,
      ingestedAt: row.ingested_at,
      rawRecord: row.raw_record,
      threatType: row.threat_type,
      tags: row.tags || [],
      confidenceReported:
        row.confidence_reported != null ? Number(row.confidence_reported) : null
    },
    created: true
  };
}

export async function getObservationsForIndicator(indicatorId) {
  if (!usePostgres()) {
    return [...memoryState().observations.values()].filter((o) => o.indicatorId === indicatorId);
  }
  const res = await runQuery(
    `SELECT * FROM source_observations WHERE indicator_id = $1 ORDER BY observed_at ASC`,
    [indicatorId]
  );
  return res.rows.map((row) => ({
    observationId: row.observation_id,
    indicatorId: row.indicator_id,
    sourceId: row.source_id,
    sourceRef: row.source_ref,
    observedAt: row.observed_at,
    ingestedAt: row.ingested_at,
    rawRecord: row.raw_record,
    threatType: row.threat_type,
    tags: row.tags || [],
    confidenceReported:
      row.confidence_reported != null ? Number(row.confidence_reported) : null
  }));
}

export async function updateIndicatorConfidence(indicatorId, confidence, explanation) {
  if (!usePostgres()) {
    const ind = memoryState().indicators.get(indicatorId);
    if (!ind) return null;
    ind.confidence = confidence;
    ind.confidenceExplanation = explanation;
    ind.updatedAt = new Date().toISOString();
    return ind;
  }
  const res = await runQuery(
    `UPDATE threat_indicators
     SET confidence = $2, confidence_explanation = $3::jsonb, updated_at = now()
     WHERE indicator_id = $1 RETURNING *`,
    [indicatorId, confidence, JSON.stringify(explanation || {})]
  );
  return res.rows[0] ? rowToIndicator(res.rows[0]) : null;
}

export async function upsertRelationship(rel) {
  if (!usePostgres()) {
    const mem = memoryState();
    const key = `${rel.sourceIndicatorId}|${rel.targetIndicatorId}|${rel.relationshipType}|${rel.ruleId}`;
    for (const existing of mem.relationships.values()) {
      if (
        existing.sourceIndicatorId === rel.sourceIndicatorId &&
        existing.targetIndicatorId === rel.targetIndicatorId &&
        existing.relationshipType === rel.relationshipType &&
        existing.ruleId === rel.ruleId
      ) {
        return { relationship: existing, created: false };
      }
    }
    const record = {
      ...rel,
      relationshipId: rel.relationshipId || randomUUID(),
      createdAt: new Date().toISOString()
    };
    mem.relationships.set(record.relationshipId, record);
    return { relationship: record, created: true };
  }

  const existing = await runQuery(
    `SELECT * FROM indicator_relationships
     WHERE source_indicator_id = $1 AND target_indicator_id = $2
       AND relationship_type = $3 AND rule_id = $4`,
    [rel.sourceIndicatorId, rel.targetIndicatorId, rel.relationshipType, rel.ruleId]
  );
  if (existing.rows.length) {
    const row = existing.rows[0];
    return {
      relationship: {
        relationshipId: row.relationship_id,
        sourceIndicatorId: row.source_indicator_id,
        targetIndicatorId: row.target_indicator_id,
        relationshipType: row.relationship_type,
        ruleId: row.rule_id,
        explanation: row.explanation,
        confidence: Number(row.confidence),
        createdAt: row.created_at
      },
      created: false
    };
  }

  const id = rel.relationshipId || randomUUID();
  const inserted = await runQuery(
    `INSERT INTO indicator_relationships (
       relationship_id, source_indicator_id, target_indicator_id,
       relationship_type, rule_id, explanation, confidence
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      id,
      rel.sourceIndicatorId,
      rel.targetIndicatorId,
      rel.relationshipType,
      rel.ruleId,
      rel.explanation,
      rel.confidence
    ]
  );
  const row = inserted.rows[0];
  return {
    relationship: {
      relationshipId: row.relationship_id,
      sourceIndicatorId: row.source_indicator_id,
      targetIndicatorId: row.target_indicator_id,
      relationshipType: row.relationship_type,
      ruleId: row.rule_id,
      explanation: row.explanation,
      confidence: Number(row.confidence),
      createdAt: row.created_at
    },
    created: true
  };
}

export async function searchIndicators({
  q = '',
  type = null,
  sourceId = null,
  minConfidence = null,
  limit = 50,
  offset = 0
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  if (!usePostgres()) {
    let items = [...memoryState().indicators.values()];
    if (type) items = items.filter((i) => i.indicatorType === type);
    if (minConfidence != null) {
      items = items.filter((i) => i.confidence >= Number(minConfidence));
    }
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (i) =>
          i.valueNormalized.toLowerCase().includes(needle) ||
          i.valueRaw.toLowerCase().includes(needle) ||
          (i.tags || []).some((t) => String(t).toLowerCase().includes(needle))
      );
    }
    if (sourceId) {
      const obsIds = new Set(
        [...memoryState().observations.values()]
          .filter((o) => o.sourceId === sourceId)
          .map((o) => o.indicatorId)
      );
      items = items.filter((i) => obsIds.has(i.indicatorId));
    }
    items.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
    const total = items.length;
    return { items: items.slice(safeOffset, safeOffset + safeLimit), total, limit: safeLimit, offset: safeOffset };
  }

  const clauses = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    clauses.push(
      `(value_normalized ILIKE $${params.length} OR value_raw ILIKE $${params.length})`
    );
  }
  if (type) {
    params.push(type);
    clauses.push(`indicator_type = $${params.length}`);
  }
  if (minConfidence != null) {
    params.push(Number(minConfidence));
    clauses.push(`confidence >= $${params.length}`);
  }
  if (sourceId) {
    params.push(sourceId);
    clauses.push(
      `indicator_id IN (SELECT indicator_id FROM source_observations WHERE source_id = $${params.length})`
    );
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const countRes = await runQuery(
    `SELECT COUNT(*)::int AS total FROM threat_indicators ${where}`,
    params
  );
  params.push(safeLimit);
  params.push(safeOffset);
  const res = await runQuery(
    `SELECT * FROM threat_indicators ${where}
     ORDER BY last_seen_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    items: res.rows.map(rowToIndicator),
    total: countRes.rows[0].total,
    limit: safeLimit,
    offset: safeOffset
  };
}

export async function getIndicatorById(indicatorId) {
  if (!usePostgres()) {
    return memoryState().indicators.get(indicatorId) || null;
  }
  const res = await runQuery(`SELECT * FROM threat_indicators WHERE indicator_id = $1`, [
    indicatorId
  ]);
  return res.rows[0] ? rowToIndicator(res.rows[0]) : null;
}

export async function getRelationshipsForIndicator(indicatorId) {
  if (!usePostgres()) {
    return [...memoryState().relationships.values()].filter(
      (r) =>
        r.sourceIndicatorId === indicatorId || r.targetIndicatorId === indicatorId
    );
  }
  const res = await runQuery(
    `SELECT * FROM indicator_relationships
     WHERE source_indicator_id = $1 OR target_indicator_id = $1
     ORDER BY created_at DESC`,
    [indicatorId]
  );
  return res.rows.map((row) => ({
    relationshipId: row.relationship_id,
    sourceIndicatorId: row.source_indicator_id,
    targetIndicatorId: row.target_indicator_id,
    relationshipType: row.relationship_type,
    ruleId: row.rule_id,
    explanation: row.explanation,
    confidence: Number(row.confidence),
    createdAt: row.created_at
  }));
}

export async function listAllIndicators() {
  if (!usePostgres()) {
    return [...memoryState().indicators.values()];
  }
  const res = await runQuery(`SELECT * FROM threat_indicators ORDER BY last_seen_at DESC LIMIT 5000`);
  return res.rows.map(rowToIndicator);
}

export async function listAllObservations() {
  if (!usePostgres()) {
    return [...memoryState().observations.values()];
  }
  const res = await runQuery(`SELECT * FROM source_observations ORDER BY observed_at DESC LIMIT 20000`);
  return res.rows.map((row) => ({
    observationId: row.observation_id,
    indicatorId: row.indicator_id,
    sourceId: row.source_id,
    sourceRef: row.source_ref,
    observedAt: row.observed_at,
    ingestedAt: row.ingested_at,
    rawRecord: row.raw_record,
    threatType: row.threat_type,
    tags: row.tags || [],
    confidenceReported:
      row.confidence_reported != null ? Number(row.confidence_reported) : null
  }));
}

export async function createInvestigation({ title, createdBy, notes = '' }) {
  const now = new Date().toISOString();
  const record = {
    investigationId: randomUUID(),
    title,
    status: 'open',
    createdBy: createdBy || null,
    notes,
    createdAt: now,
    updatedAt: now
  };
  if (!usePostgres()) {
    memoryState().investigations.set(record.investigationId, record);
    return record;
  }
  await runQuery(
    `INSERT INTO scamshield_investigations (
       investigation_id, title, status, created_by, notes
     ) VALUES ($1,$2,'open',$3,$4)`,
    [record.investigationId, title, createdBy || null, notes]
  );
  return record;
}

export async function listInvestigations({ limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  if (!usePostgres()) {
    const items = [...memoryState().investigations.values()].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    return {
      items: items.slice(safeOffset, safeOffset + safeLimit),
      total: items.length,
      limit: safeLimit,
      offset: safeOffset
    };
  }
  const count = await runQuery(`SELECT COUNT(*)::int AS total FROM scamshield_investigations`);
  const res = await runQuery(
    `SELECT * FROM scamshield_investigations ORDER BY updated_at DESC LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset]
  );
  return {
    items: res.rows.map((row) => ({
      investigationId: row.investigation_id,
      title: row.title,
      status: row.status,
      createdBy: row.created_by,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    total: count.rows[0].total,
    limit: safeLimit,
    offset: safeOffset
  };
}

export async function getInvestigation(investigationId) {
  if (!usePostgres()) {
    return memoryState().investigations.get(investigationId) || null;
  }
  const res = await runQuery(
    `SELECT * FROM scamshield_investigations WHERE investigation_id = $1`,
    [investigationId]
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    investigationId: row.investigation_id,
    title: row.title,
    status: row.status,
    createdBy: row.created_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function updateInvestigation(investigationId, patch) {
  if (!usePostgres()) {
    const inv = memoryState().investigations.get(investigationId);
    if (!inv) return null;
    if (patch.status) inv.status = patch.status;
    if (patch.notes != null) inv.notes = patch.notes;
    if (patch.title) inv.title = patch.title;
    inv.updatedAt = new Date().toISOString();
    return inv;
  }
  const res = await runQuery(
    `UPDATE scamshield_investigations
     SET status = COALESCE($2, status),
         notes = COALESCE($3, notes),
         title = COALESCE($4, title),
         updated_at = now()
     WHERE investigation_id = $1
     RETURNING *`,
    [investigationId, patch.status || null, patch.notes ?? null, patch.title || null]
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    investigationId: row.investigation_id,
    title: row.title,
    status: row.status,
    createdBy: row.created_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function linkIndicatorToInvestigation(investigationId, indicatorId, notes = null) {
  if (!usePostgres()) {
    const key = `${investigationId}|${indicatorId}`;
    const mem = memoryState();
    if (mem.investigationLinks.has(key)) {
      return { created: false };
    }
    mem.investigationLinks.set(key, {
      investigationId,
      indicatorId,
      addedAt: new Date().toISOString(),
      notes
    });
    return { created: true };
  }
  try {
    await runQuery(
      `INSERT INTO investigation_indicators (investigation_id, indicator_id, notes)
       VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [investigationId, indicatorId, notes]
    );
    return { created: true };
  } catch {
    return { created: false };
  }
}

export async function getInvestigationIndicators(investigationId) {
  if (!usePostgres()) {
    const links = [...memoryState().investigationLinks.values()].filter(
      (l) => l.investigationId === investigationId
    );
    return links
      .map((l) => memoryState().indicators.get(l.indicatorId))
      .filter(Boolean);
  }
  const res = await runQuery(
    `SELECT ti.* FROM threat_indicators ti
     JOIN investigation_indicators ii ON ii.indicator_id = ti.indicator_id
     WHERE ii.investigation_id = $1`,
    [investigationId]
  );
  return res.rows.map(rowToIndicator);
}

export async function findIngestRunByIdempotencyKey(key) {
  if (!usePostgres()) {
    return [...memoryState().ingestRuns.values()].find((r) => r.idempotencyKey === key) || null;
  }
  const res = await runQuery(
    `SELECT * FROM feed_ingest_runs WHERE idempotency_key = $1`,
    [key]
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    runId: row.run_id,
    sourceId: row.source_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    recordsFetched: row.records_fetched,
    recordsUpserted: row.records_upserted,
    recordsSkipped: row.records_skipped,
    errorMessage: row.error_message,
    idempotencyKey: row.idempotency_key
  };
}

export async function saveIngestRun(run) {
  if (!usePostgres()) {
    memoryState().ingestRuns.set(run.runId, run);
    return run;
  }
  await runQuery(
    `INSERT INTO feed_ingest_runs (
       run_id, source_id, started_at, finished_at, status,
       records_fetched, records_upserted, records_skipped, error_message, idempotency_key
     ) VALUES ($1,$2,$3::timestamptz,$4::timestamptz,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (run_id) DO UPDATE SET
       finished_at = EXCLUDED.finished_at,
       status = EXCLUDED.status,
       records_fetched = EXCLUDED.records_fetched,
       records_upserted = EXCLUDED.records_upserted,
       records_skipped = EXCLUDED.records_skipped,
       error_message = EXCLUDED.error_message`,
    [
      run.runId,
      run.sourceId,
      run.startedAt,
      run.finishedAt || null,
      run.status,
      run.recordsFetched || 0,
      run.recordsUpserted || 0,
      run.recordsSkipped || 0,
      run.errorMessage || null,
      run.idempotencyKey || null
    ]
  );
  return run;
}
