import {
  runEnterpriseConsumer,
  createRedisIdempotencyStore,
  createMemoryIdempotencyStore
} from '@fraudshield/platform-kafka';
import { getRedisClient } from '../config/redis.js';
import { scoreAndPersistTransaction } from '../services/transactionScoring.js';

const TOPIC = process.env['KAFKA_TOPIC_transactions.ingested'] || 'transactions.ingested';
const ASYNC_ONLY = process.env.KAFKA_CONSUMER_ASYNC_ONLY !== 'false';

export async function startScoringConsumer() {
  const redis = await getRedisClient();
  const idempotencyStore = redis
    ? createRedisIdempotencyStore(redis, { prefix: 'fraudshield:ingest' })
    : createMemoryIdempotencyStore();

  return runEnterpriseConsumer({
    clientId: 'fraudshield-backend-scoring',
    groupId: process.env.KAFKA_SCORING_GROUP || 'fraudshield-scoring-workers',
    topics: [TOPIC],
    idempotencyStore,
    handler: async ({ payload }) => {
      const txn = payload.transaction || payload;
      if (!txn?.amount || !txn?.merchantName) {
        return;
      }
      if (ASYNC_ONLY && txn.fraudStatus) {
        return;
      }
      if (ASYNC_ONLY && txn.ingestSource === 'api') {
        return;
      }

      const userId = txn.userId || process.env.DEFAULT_INGEST_USER_ID || 'system_ingest';
      const tenantId = txn.tenantId || payload.tenantId || 'default';

      await scoreAndPersistTransaction({
        userId,
        tenantId,
        body: txn,
        userAgent: txn.userAgent,
        clientIp: txn.ipAddress,
        actorUserId: userId,
        source: 'kafka'
      });
    }
  });
}
