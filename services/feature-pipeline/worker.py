import json
import os
from datetime import datetime

import pika
import redis


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/%2F")


def update_features(transaction):
    client = redis.from_url(REDIS_URL, decode_responses=True)
    user_id = transaction.get("userId")
    key = f"features:user:{user_id}"
    now = datetime.utcnow().isoformat()
    pipe = client.pipeline()
    pipe.hincrby(key, "transaction_count", 1)
    pipe.hset(key, "last_seen_at", now)
    pipe.hset(key, "last_amount", float(transaction.get("amount", 0)))
    pipe.expire(key, 60 * 60 * 24 * 30)
    pipe.execute()


def callback(_ch, _method, _properties, body):
    payload = json.loads(body.decode())
    if payload.get("eventType") == "transaction.ingested":
        update_features(payload.get("transaction", {}))


def main():
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()
    channel.exchange_declare(exchange="fraud.events", exchange_type="topic", durable=True)
    channel.queue_declare(queue="feature_pipeline", durable=True)
    channel.queue_bind(exchange="fraud.events", queue="feature_pipeline", routing_key="transaction.ingested")
    channel.basic_consume(queue="feature_pipeline", on_message_callback=callback, auto_ack=True)
    channel.start_consuming()


if __name__ == "__main__":
    main()
