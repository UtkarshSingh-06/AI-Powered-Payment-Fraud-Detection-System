-- Rollback: 001_scamshield_schema
-- Drops ScamShield tables only; does not touch payment-fraud schema.

DROP TABLE IF EXISTS investigation_indicators;
DROP TABLE IF EXISTS scamshield_investigations;
DROP TABLE IF EXISTS indicator_relationships;
DROP TABLE IF EXISTS source_observations;
DROP TABLE IF EXISTS feed_ingest_runs;
DROP TABLE IF EXISTS threat_indicators;

DELETE FROM schema_migrations WHERE id = '001_scamshield_schema';
