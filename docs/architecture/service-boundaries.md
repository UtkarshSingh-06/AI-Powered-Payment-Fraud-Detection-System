# Service Boundaries and Contracts

## Core Services

- `backend` (Node.js): API gateway, auth, case management, transaction orchestration.
- `services/inference-fastapi`: low-latency scoring endpoint and ensemble inference.
- `services/feature-pipeline`: feature extraction and online/offline feature sync.
- `services/model-training`: retraining orchestration and model artifact generation.

## Event Contracts

- `transaction.ingested`: emitted when transactions are created.
- `fraud.decision.made`: emitted after ML + rules produce a decision.
- `fraud.label.updated`: emitted after analyst/admin labeling.

Schema files live in `shared/schemas`.

## Data Ownership

- PostgreSQL (`backend`): users, transactions, fraud logs, labels, model_versions, audit logs.
- Redis (`feature-pipeline`/`backend`): online feature vectors, velocity counters, short-lived risk context.
- RabbitMQ: async event fan-out between gateway, inference, and training workflows.

## SLO Targets

- p95 `/score` latency: < 50ms under warm cache path.
- API availability: 99.9% monthly.
- Inference timeout budget from gateway: 40ms before fallback.
