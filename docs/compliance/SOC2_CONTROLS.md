# FraudShield SOC 2 Control Mapping (Type II readiness outline)

This document maps FraudShield platform controls to AICPA Trust Services Criteria (TSC) commonly assessed in SOC 2 Type II audits.

## CC1 — Control environment

| Control | Implementation |
|---------|----------------|
| Role-based access | `backend/middleware/rbac.js` with admin, analyst, api_client roles |
| Tenant isolation | `backend/utils/tenantFilter.js`, Postgres RLS in `backend/scripts/enterprise-schema.sql` |
| Gateway authentication | JWT/API key validation in `apps/api-gateway/server.js` |

## CC2 — Communication & information

| Control | Implementation |
|---------|----------------|
| Structured logging | `backend/middleware/structuredLog.js` JSON request logs |
| Audit trail | Hash-chained entries in `backend/services/auditLog.js` |
| SIEM export | `GET /api/audit/siem` NDJSON stream for downstream ingestion |

## CC3 — Risk assessment

| Control | Implementation |
|---------|----------------|
| Fraud scoring | Hybrid ML + rules in `backend/services/transactionScoring.js` |
| Drift monitoring | `ml/drift/detect.py` scheduled via `.github/workflows/drift-monitor.yml` |
| AML screening | `services/aml-service` with vendor adapter hook (`AML_VENDOR_URL`) |

## CC6 — Logical & physical access

| Control | Implementation |
|---------|----------------|
| Authentication | JWT + API keys (`backend/routes/apiKeys.js`) |
| Service auth | `packages/platform-auth` gateway + service middleware |
| WebSocket hardening | `WS_REQUIRE_AUTH=true` in production compose |
| Secrets | Terraform Secrets Manager module (`infra/terraform/modules/secrets`) |

## CC7 — System operations

| Control | Implementation |
|---------|----------------|
| Health checks | `/api/health`, `/api/health/deep` |
| Observability | Prometheus metrics, Grafana SLO dashboard, Alertmanager rules |
| CI/CD | `.github/workflows/ci-cd.yml` with Trivy scan and EKS deploy job |
| DR | `docs/runbooks/dr-failover.md`, `scripts/backup/postgres-backup.ps1` |

## CC8 — Change management

| Control | Implementation |
|---------|----------------|
| Contract tests | `packages/contracts` AJV validation |
| Model promotion | `ml/training/train.py` artifacts copied to inference image |
| Infrastructure as code | Terraform modules under `infra/terraform/` |

## P1 — Privacy (GDPR)

| Control | Implementation |
|---------|----------------|
| Data export | `GET /api/compliance/gdpr/export` |
| Erasure | `DELETE /api/compliance/gdpr/erase` with anonymization |
| Field encryption | AES-256-GCM via `backend/services/encryption.js` when `FIELD_ENCRYPTION_KEY` set |

## Evidence collection checklist

1. Export audit chain: `GET /api/audit/export` (admin/analyst token)
2. PCI scope report: `GET /api/compliance/pci/report`
3. Grafana SLO dashboard screenshots (p95 latency, error rate)
4. CI workflow runs showing test + security scan gates
5. Terraform plan output for production environment

## Gaps requiring organizational process (outside code)

- Formal penetration test report
- Vendor risk assessments for cloud provider and AML vendor
- Employee security training records
- Physical datacenter controls (delegated to AWS/Azure/GCP)
