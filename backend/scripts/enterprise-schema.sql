-- Enterprise fraud platform schema (PostgreSQL)
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'starter',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO tenants (tenant_id, name, plan)
VALUES ('default', 'Default Tenant', 'enterprise')
ON CONFLICT (tenant_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS device_fingerprints (
  fingerprint_hash TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id),
  payload JSONB NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_cases (
  case_id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(tenant_id),
  transaction_id TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assignee_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fraud_decisions (
  decision_id TEXT PRIMARY KEY,
  tenant_id TEXT,
  transaction_id TEXT NOT NULL,
  risk_score NUMERIC,
  decision TEXT,
  model_version TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_decisions_txn ON fraud_decisions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_status ON fraud_cases(status);

-- Partition-ready transactions metadata (payload remains in existing transactions table)
CREATE TABLE IF NOT EXISTS transaction_ingest_log (
  ingest_id TEXT PRIMARY KEY,
  tenant_id TEXT,
  correlation_id TEXT,
  transaction_id TEXT,
  ingested_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_ingest_correlation ON transaction_ingest_log(correlation_id);
