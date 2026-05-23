# FraudShield Enterprise Platform

Production-grade financial risk intelligence platform — monorepo layout with microservices, Kafka streaming, ML inference, and AWS Terraform.

## Quick start (Docker)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:8080 |
| Backend API | http://localhost:5000 |
| Next.js dashboard | http://localhost:3002 (`cd apps/web && npm run dev`) |
| Vite legacy UI | http://localhost:3002 (`cd frontend && npm run dev`) |
| Inference | http://localhost:8000 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

## Monorepo structure

- `apps/api-gateway` — routing, rate limits
- `apps/web` — Next.js enterprise dashboard
- `backend` — core API + WebSocket
- `services/*` — auth, ingestion, scoring, cases, rules, notifications, inference
- `packages/contracts` — JSON Schema validation (AJV)
- `packages/sdk-node` — Node SDK
- `ml/training` — MLflow training pipeline
- `infra/terraform/aws` — AWS infrastructure
- `infra/k8s/helm` — Kubernetes deployment

## Tests

```bash
cd packages/contracts && npm test
cd backend && npm test
cd services/inference-fastapi && pip install -r requirements.txt && pytest -q
```

## Default credentials

Run `npm run seed` in `backend` for demo users (`admin@frauddetection.com` / `admin123`).
