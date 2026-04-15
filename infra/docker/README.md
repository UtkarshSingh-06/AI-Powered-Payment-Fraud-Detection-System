# Container Topology

- `backend`: API gateway and orchestration.
- `frontend`: React app served by Nginx.
- `postgres`: persistent transaction + audit storage.
- `redis`: online feature store and counters.
- `rabbitmq`: event backbone.
- `inference`: FastAPI fraud scoring.
- `feature-pipeline`: event consumer to update feature store.
