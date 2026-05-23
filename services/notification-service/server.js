import express from 'express';
import { Kafka } from 'kafkajs';

const app = express();
const PORT = process.env.PORT || 5006;
const brokers = (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean);

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

app.post('/notify', async (req, res) => {
  const { channel = 'webhook', payload } = req.body;
  const result = await dispatch(channel, payload);
  res.json(result);
});

async function dispatch(channel, payload) {
  if (channel === 'slack' && process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: payload?.message || 'Fraud alert' })
    });
    return { delivered: true, channel: 'slack' };
  }
  if (channel === 'email') {
    console.log('[email]', payload);
    return { delivered: true, channel: 'email', provider: 'ses-stub' };
  }
  if (channel === 'sms') {
    console.log('[sms]', payload);
    return { delivered: true, channel: 'sms', provider: 'twilio-stub' };
  }
  console.log('[webhook]', payload);
  return { delivered: true, channel: 'webhook' };
}

async function startKafkaConsumer() {
  if (!brokers.length) return;
  const kafka = new Kafka({ clientId: 'notification-service', brokers });
  const consumer = kafka.consumer({ groupId: 'fraudshield-notifications' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'fraud.decisions', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      if ((payload.riskScore || 0) >= 40) {
        await dispatch('slack', {
          message: `Fraud alert txn=${payload.transactionId} score=${payload.riskScore} decision=${payload.decision}`
        });
      }
    }
  });
  console.log('Notification consumer listening on fraud.decisions');
}

app.listen(PORT, async () => {
  console.log(`Notification service on :${PORT}`);
  await startKafkaConsumer().catch((err) => console.warn('Kafka consumer:', err.message));
});
