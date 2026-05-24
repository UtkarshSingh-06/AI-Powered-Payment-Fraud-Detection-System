import {
  runEnterpriseConsumer,
  createRedisIdempotencyStore,
  createMemoryIdempotencyStore
} from '@fraudshield/platform-kafka';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRedisClient } from '../config/redis.js';
import { readData } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.join(__dirname, '..', 'data', 'training');

export async function startLabelConsumer() {
  const redis = await getRedisClient();
  const idempotencyStore = redis
    ? createRedisIdempotencyStore(redis, { prefix: 'fraudshield:labels' })
    : createMemoryIdempotencyStore();

  return runEnterpriseConsumer({
    clientId: 'fraudshield-label-exporter',
    groupId: process.env.KAFKA_LABEL_GROUP || 'fraudshield-label-export',
    topics: [process.env['KAFKA_TOPIC_fraud.labels'] || 'fraud.labels'],
    idempotencyStore,
    handler: async ({ payload }) => {
      await exportLabelRow(payload);
    }
  });
}

async function exportLabelRow(payload) {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
  const filePath = path.join(EXPORT_DIR, 'labeled_transactions.jsonl');

  const transactions = await readData('transactions.json');
  const txn = transactions.find((t) => t.transactionId === payload.transactionId);

  const row = {
    transactionId: payload.transactionId,
    label: payload.label,
    labeledBy: payload.labeledBy,
    labeledAt: payload.timestamp || new Date().toISOString(),
    features: txn?.fraudStatus ? {
      amount: txn.amount,
      velocity_5m: txn.featureVector?.velocity_5m,
      velocity_1h: txn.featureVector?.velocity_1h,
      amount_ratio: txn.featureVector?.amount_ratio,
      device_known: txn.featureVector?.device_known,
      hour_of_day: txn.featureVector?.hour_of_day
    } : {},
    target: payload.label === 'fraud' ? 1 : 0
  };

  await fs.appendFile(filePath, `${JSON.stringify(row)}\n`, 'utf-8');
}
