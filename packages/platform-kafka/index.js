import { Kafka, logLevel } from 'kafkajs';

/**
 * Enterprise Kafka consumer with retries, DLQ publishing, and optional idempotency store.
 */
export function createKafkaClient({ clientId, brokers, ssl, sasl } = {}) {
  const brokerList = (brokers || process.env.KAFKA_BROKERS || '')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  if (!brokerList.length) {
    return null;
  }
  return new Kafka({
    clientId: clientId || 'fraudshield-consumer',
    brokers: brokerList,
    ssl: ssl ?? process.env.KAFKA_SSL === 'true',
    sasl: sasl || undefined,
    logLevel: logLevel.ERROR
  });
}

export async function runEnterpriseConsumer({
  clientId,
  groupId,
  brokers,
  topics,
  handler,
  idempotencyStore,
  dlqTopic = process.env.KAFKA_DLQ_TOPIC || 'platform.dlq',
  maxRetries = Number(process.env.KAFKA_MAX_RETRIES || 3)
}) {
  const kafka = createKafkaClient({ clientId, brokers });
  if (!kafka) {
    console.warn(`[${clientId}] Kafka brokers not configured — consumer disabled`);
    return { stop: async () => {} };
  }

  const consumer = kafka.consumer({ groupId });
  const producer = kafka.producer();
  await consumer.connect();
  await producer.connect();

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key?.toString() || '';
      const raw = message.value?.toString() || '{}';
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (parseError) {
        await publishDlq(producer, dlqTopic, {
          topic,
          partition,
          offset: message.offset,
          key,
          error: 'invalid_json',
          raw
        });
        return;
      }

      const idempotencyKey =
        payload.eventId || payload.correlationId || `${topic}:${partition}:${message.offset}`;

      if (idempotencyStore) {
        const seen = await idempotencyStore.has(idempotencyKey);
        if (seen) {
          return;
        }
      }

      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          await handler({ topic, partition, message, payload, key });
          if (idempotencyStore) {
            await idempotencyStore.set(idempotencyKey, { processedAt: new Date().toISOString() });
          }
          return;
        } catch (error) {
          attempt += 1;
          if (attempt > maxRetries) {
            await publishDlq(producer, dlqTopic, {
              topic,
              partition,
              offset: message.offset,
              key,
              idempotencyKey,
              error: error.message,
              payload
            });
            console.error(`[${clientId}] DLQ after ${maxRetries} retries:`, error.message);
            return;
          }
          await sleep(Math.min(1000 * 2 ** attempt, 10000));
        }
      }
    }
  });

  console.log(`[${clientId}] consuming ${topics.join(', ')} as ${groupId}`);

  return {
    stop: async () => {
      await consumer.disconnect();
      await producer.disconnect();
    }
  };
}

async function publishDlq(producer, topic, record) {
  await producer.send({
    topic,
    messages: [
      {
        key: record.idempotencyKey || record.key || 'dlq',
        value: JSON.stringify({ ...record, dlqAt: new Date().toISOString() })
      }
    ]
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Redis-backed idempotency store (TTL in seconds). */
export function createRedisIdempotencyStore(redisClient, { prefix = 'kafka:idempotency', ttlSeconds = 86400 } = {}) {
  return {
    async has(key) {
      if (!redisClient) return false;
      return Boolean(await redisClient.get(`${prefix}:${key}`));
    },
    async set(key, meta) {
      if (!redisClient) return;
      await redisClient.set(`${prefix}:${key}`, JSON.stringify(meta), { EX: ttlSeconds });
    }
  };
}

/** In-memory fallback idempotency store for dev without Redis. */
export function createMemoryIdempotencyStore() {
  const seen = new Map();
  return {
    async has(key) {
      return seen.has(key);
    },
    async set(key, meta) {
      seen.set(key, meta);
    }
  };
}
