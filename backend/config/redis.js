import { createClient } from 'redis';

let redisClient;

export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  redisClient = createClient({ url: redisUrl });
  redisClient.on('error', (error) => {
    console.error('Redis client error:', error.message);
  });

  await redisClient.connect();
  return redisClient;
}
