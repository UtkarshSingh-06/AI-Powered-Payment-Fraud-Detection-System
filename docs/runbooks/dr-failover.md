# Disaster Recovery Runbook — FraudShield

## Objectives

| Metric | Target |
|--------|--------|
| RPO (Recovery Point Objective) | 15 minutes (Postgres PITR + Kafka retention) |
| RTO (Recovery Time Objective) | 60 minutes (EKS Helm redeploy + DB restore) |

## Components

- **Postgres** — primary transactional store (`DATABASE_URL`)
- **Redis** — feature cache / idempotency (rebuildable)
- **Redpanda/Kafka** — event bus with DLQ (`platform.dlq`)
- **Inference** — stateless; model artifact in image/volume
- **Backend + microservices** — stateless containers

## Backup procedures

### Postgres

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fraudshield"
.\scripts\backup\postgres-backup.ps1
```

Production: enable RDS automated backups + Multi-AZ (`infra/terraform/modules/rds`).

### Model artifacts

Artifacts produced by `ml/training/train.py` are baked into the inference Docker image. Retain MLflow artifacts when `MLFLOW_TRACKING_URI` is configured.

## Failover steps

1. **Detect** — Grafana alerts on SLO burn (p95 latency, 5xx rate) or `/api/health/deep` failing.
2. **Isolate** — Scale down affected deployment in EKS or stop compose service.
3. **Restore database** — Restore latest `pg_dump` or RDS snapshot to standby instance; update `DATABASE_URL` in Secrets Manager.
4. **Redeploy** — `helm upgrade fraudshield infra/k8s/helm/fraudshield` or `docker compose up -d`.
5. **Replay DLQ** — `node scripts/dlq-replay.js --limit=500` with `KAFKA_BROKERS` pointed at cluster.
6. **Validate** — Run smoke tests: login, score transaction, verify case/alert creation.
7. **Communicate** — Post incident summary; export audit SIEM stream for timeline.

## Kafka DLQ replay

```bash
export KAFKA_BROKERS=localhost:9092
export KAFKA_DLQ_TOPIC=platform.dlq
node scripts/dlq-replay.js --limit=100
```

## Post-incident

- Export hash-chained audit log via `GET /api/audit/export`
- Review drift monitor output from `ml/drift/detect.py`
- Update this runbook with lessons learned
