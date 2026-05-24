import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { validateTransactionIngestedEvent } from '@fraudshield/contracts';
import { Kafka } from 'kafkajs';
import { createServiceAuthMiddleware } from '@fraudshield/platform-auth';

const app = express();
const PORT = process.env.PORT || 5002;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const brokers = (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean);
const requireAuth = createServiceAuthMiddleware();

let producer;
async function getProducer() {
  if (!brokers.length) return null;
  if (!producer) {
    const kafka = new Kafka({ clientId: 'ingestion-service', brokers });
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
}

function decodeUser(req) {
  if (req.user?.userId) return req.user;
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ') || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ingestion-service' }));

app.post('/ingest', requireAuth, async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const user = decodeUser(req);

  if (!user?.userId) {
    return res.status(401).json({ message: 'Valid JWT required — userId in body is not accepted' });
  }

  const tenantId = user.tenantId || req.headers['x-tenant-id'] || 'default';

  const transaction = {
    ...req.body,
    correlationId,
    tenantId,
    userId: user.userId,
    ingestSource: 'ingestion-api'
  };

  delete transaction.userIdOverride;

  const event = {
    eventId: uuidv4(),
    eventType: 'transaction.ingested',
    timestamp: new Date().toISOString(),
    transaction
  };
  const validation = validateTransactionIngestedEvent(event);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const kafkaProducer = await getProducer();
  if (kafkaProducer) {
    await kafkaProducer.send({
      topic: process.env.KAFKA_TOPIC_TRANSACTIONS || 'transactions.ingested',
      messages: [{ key: correlationId, value: JSON.stringify(event) }]
    });
  }

  if (req.query.sync === 'true' && req.headers.authorization) {
    const response = await fetch(`${BACKEND_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization,
        'x-tenant-id': tenantId,
        'x-correlation-id': correlationId
      },
      body: JSON.stringify(req.body)
    });
    const body = await response.json();
    return res.status(response.status).json(body);
  }

  res.status(202).json({ correlationId, status: 'accepted', eventId: event.eventId, tenantId });
});

app.listen(PORT, () => console.log(`Ingestion service on :${PORT}`));
