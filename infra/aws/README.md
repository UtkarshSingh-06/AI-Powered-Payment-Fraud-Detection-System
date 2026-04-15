# AWS Deployment Blueprint

- Compute: ECS Fargate (or EKS) for `backend`, `inference`, `feature-pipeline`.
- Data: Amazon RDS PostgreSQL and ElastiCache Redis.
- Streaming: Amazon MQ (RabbitMQ) for event backbone.
- Artifacts: S3 for model artifacts and retraining outputs.
- Security: IAM roles, Secrets Manager for runtime secrets, TLS termination at ALB.
