# Feature Pipeline Service

This service owns:

- online feature updates into Redis
- streaming feature aggregation from `transaction.ingested` events
- offline feature export for training

## Planned runtime

- Consumer: RabbitMQ topic `fraud.events`
- Store: Redis hashes + PostgreSQL feature snapshots
