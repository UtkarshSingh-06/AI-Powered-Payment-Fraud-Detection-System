-- ScamShield threat intelligence schema (append-preserving, idempotent)
-- Migration: 001_scamshield_schema

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS threat_indicators (
  indicator_id TEXT PRIMARY KEY,
  indicator_type TEXT NOT NULL
    CHECK (indicator_type IN ('url', 'domain', 'ip', 'hash_md5', 'hash_sha1', 'hash_sha256')),
  value_normalized TEXT NOT NULL,
  value_raw TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0
    CHECK (confidence >= 0 AND confidence <= 1),
  confidence_explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (indicator_type, value_normalized)
);

CREATE INDEX IF NOT EXISTS idx_threat_indicators_type ON threat_indicators (indicator_type);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_value ON threat_indicators (value_normalized);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_last_seen ON threat_indicators (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_confidence ON threat_indicators (confidence DESC);

CREATE TABLE IF NOT EXISTS source_observations (
  observation_id TEXT PRIMARY KEY,
  indicator_id TEXT NOT NULL REFERENCES threat_indicators (indicator_id),
  source_id TEXT NOT NULL,
  source_ref TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_record JSONB NOT NULL,
  threat_type TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  confidence_reported NUMERIC(4, 3)
    CHECK (confidence_reported IS NULL OR (confidence_reported >= 0 AND confidence_reported <= 1)),
  UNIQUE (source_id, source_ref, indicator_id)
);

CREATE INDEX IF NOT EXISTS idx_source_observations_indicator ON source_observations (indicator_id);
CREATE INDEX IF NOT EXISTS idx_source_observations_source ON source_observations (source_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_observations_observed ON source_observations (observed_at DESC);

CREATE TABLE IF NOT EXISTS indicator_relationships (
  relationship_id TEXT PRIMARY KEY,
  source_indicator_id TEXT NOT NULL REFERENCES threat_indicators (indicator_id),
  target_indicator_id TEXT NOT NULL REFERENCES threat_indicators (indicator_id),
  relationship_type TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  explanation TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL
    CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_indicator_id <> target_indicator_id),
  UNIQUE (source_indicator_id, target_indicator_id, relationship_type, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_indicator_relationships_source ON indicator_relationships (source_indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_relationships_target ON indicator_relationships (target_indicator_id);

CREATE TABLE IF NOT EXISTS scamshield_investigations (
  investigation_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'closed')),
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scamshield_investigations_status ON scamshield_investigations (status);

CREATE TABLE IF NOT EXISTS investigation_indicators (
  investigation_id TEXT NOT NULL
    REFERENCES scamshield_investigations (investigation_id) ON DELETE CASCADE,
  indicator_id TEXT NOT NULL REFERENCES threat_indicators (indicator_id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  PRIMARY KEY (investigation_id, indicator_id)
);

CREATE TABLE IF NOT EXISTS feed_ingest_runs (
  run_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL
    CHECK (status IN ('running', 'success', 'partial', 'failed', 'skipped')),
  records_fetched INTEGER NOT NULL DEFAULT 0,
  records_upserted INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  idempotency_key TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_feed_ingest_runs_source ON feed_ingest_runs (source_id, started_at DESC);
