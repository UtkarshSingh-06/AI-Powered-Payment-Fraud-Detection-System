import json
import os
import time
from datetime import datetime, timezone

import redis
from kafka import KafkaConsumer

BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092").split(",")
TOPIC = os.getenv("KAFKA_TOPIC_TRANSACTIONS", "transactions.ingested")
GROUP = os.getenv("KAFKA_CONSUMER_GROUP", "fraudshield-feature-pipeline")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


def process_message(payload: dict, redis_client: redis.Redis):
    transaction = payload.get("transaction", {})
    user_id = transaction.get("userId", "unknown")
    tenant_id = transaction.get("tenantId", "default")
    device = transaction.get("deviceFingerprint", {})
    geo = transaction.get("geoIntelligence", {})

    key = f"features:tenant:{tenant_id}:user:{user_id}"
    pipe = redis_client.pipeline()
    pipe.hincrby(key, "transaction_count", 1)
    pipe.hset(
        key,
        mapping={
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
            "last_amount": transaction.get("amount", 0),
            "velocity_region": geo.get("velocityRegion", "unknown"),
            "device_hash": device.get("fingerprintHash", "unknown"),
            "country": geo.get("country", "Unknown"),
        },
    )
    pipe.expire(key, 86400)
    pipe.execute()


def main():
    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=BROKERS,
        group_id=GROUP,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    print(f"Feature pipeline listening on {TOPIC}")
    for message in consumer:
        try:
            process_message(message.value, redis_client)
        except Exception as exc:
            print(f"Failed to process message: {exc}")
            time.sleep(0.1)


if __name__ == "__main__":
    main()
