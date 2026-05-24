import { getRedisClient } from '../config/redis.js';

const FEATURE_NAMES = ['amount', 'velocity_5m', 'velocity_1h', 'amount_ratio', 'device_known', 'hour_of_day'];

export async function buildFeatureVector(transaction, userHistory) {
  const redis = await getRedisClient();
  const userPrefix = `features:user:${transaction.userId}`;
  const now = Date.now();
  const history = userHistory || [];

  const recent5m = history.filter((tx) => now - new Date(tx.timestamp).getTime() <= 5 * 60 * 1000).length;
  const recent1h = history.filter((tx) => now - new Date(tx.timestamp).getTime() <= 60 * 60 * 1000).length;
  const avgAmount = history.length
    ? history.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) / history.length
    : Number(transaction.amount || 0);

  let hourOfDay = 12;
  try {
    hourOfDay = new Date(transaction.timestamp).getHours();
  } catch {
    hourOfDay = 12;
  }

  const vector = {
    velocity_5m: recent5m,
    velocity_1h: recent1h,
    avg_amount_30d: Number(avgAmount.toFixed(2)),
    amount_ratio: avgAmount ? Number((transaction.amount / avgAmount).toFixed(2)) : 1,
    device_known: history.some((tx) => tx.deviceId === transaction.deviceId) ? 1 : 0,
    amount: Number(transaction.amount || 0),
    hour_of_day: hourOfDay
  };

  for (const name of FEATURE_NAMES) {
    if (vector[name] === undefined) vector[name] = 0;
  }

  if (redis) {
    await redis.hSet(`${userPrefix}:latest`, vector);
    await redis.expire(`${userPrefix}:latest`, 3600);
  }

  return vector;
}
