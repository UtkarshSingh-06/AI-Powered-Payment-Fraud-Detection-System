# Service Boundaries and Contracts (v2)

## Platform services

| Service | Port | Responsibility |
|---------|------|----------------|
| api-gateway | 8080 | TLS, rate limits, routing |
| backend | 5000 | BFF orchestration, WebSocket, legacy routes |
| auth-service | 5001 | OAuth2/MFA stubs + auth proxy |
| ingestion-service | 5002 | High-throughput Kafka ingest |
| scoring-service | 5003 | ML + rules orchestration |
| case-service | 5004 | Analyst case management |
| rules-engine | 5005 | Versioned policy evaluation |
| notification-service | 5006 | Alerts (email/SMS/Slack/webhook) |
| inference-fastapi | 8000 | Ensemble ML scoring + XAI |
| feature-pipeline | — | Kafka consumer → Redis features |

## Event topics (Kafka)

- `transactions.ingested`
- `fraud.decisions`
- `fraud.labels`

Contracts enforced via `@fraudshield/contracts` (JSON Schema + AJV).

## SLO targets

- p95 `/score` latency: < 100ms (warm path)
- API availability: 99.9% monthly
- Inference timeout budget from gateway: 40ms before rules fallback

## Health endpoints

- Liveness: `GET /api/health`
- Readiness: `GET /api/health/deep`
