import { getPostgresPool } from '../config/postgres.js';
import { getRedisClient } from '../config/redis.js';
import { getRabbitChannel } from '../config/rabbitmq.js';
import { getKafkaProducer } from '../config/kafka.js';

const INFERENCE_URL = process.env.INFERENCE_URL;

async function checkPostgres() {
  const pool = getPostgresPool();
  if (!pool) {
    return { status: 'skipped', message: 'DATABASE_URL not configured' };
  }
  try {
    await pool.query('SELECT 1');
    return { status: 'up' };
  } catch (error) {
    return { status: 'down', message: error.message };
  }
}

async function checkRedis() {
  if (!process.env.REDIS_URL) {
    return { status: 'skipped', message: 'REDIS_URL not configured' };
  }
  try {
    const client = await getRedisClient();
    if (!client) {
      return { status: 'skipped' };
    }
    await client.ping();
    return { status: 'up' };
  } catch (error) {
    return { status: 'down', message: error.message };
  }
}

async function checkRabbitMQ() {
  if (!process.env.RABBITMQ_URL) {
    return { status: 'skipped', message: 'RABBITMQ_URL not configured' };
  }
  try {
    const channel = await getRabbitChannel();
    return { status: channel ? 'up' : 'down' };
  } catch (error) {
    return { status: 'down', message: error.message };
  }
}

async function checkKafka() {
  if (!process.env.KAFKA_BROKERS) {
    return { status: 'skipped', message: 'KAFKA_BROKERS not configured' };
  }
  try {
    const producer = await getKafkaProducer();
    return { status: producer ? 'up' : 'down' };
  } catch (error) {
    return { status: 'down', message: error.message };
  }
}

async function checkInference() {
  if (!INFERENCE_URL) {
    return { status: 'skipped', message: 'INFERENCE_URL not configured' };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${INFERENCE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return { status: 'down', message: `HTTP ${response.status}` };
    }
    return { status: 'up' };
  } catch (error) {
    return { status: 'down', message: error.message };
  }
}

export async function runDeepHealthCheck() {
  const [postgres, redis, rabbitmq, kafka, inference] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkRabbitMQ(),
    checkKafka(),
    checkInference()
  ]);

  const components = { postgres, redis, rabbitmq, kafka, inference };
  const requiredDown = Object.entries(components).filter(
    ([, value]) => value.status === 'down'
  );

  const overall =
    requiredDown.length === 0 ? 'healthy' : 'degraded';

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    components
  };
}
