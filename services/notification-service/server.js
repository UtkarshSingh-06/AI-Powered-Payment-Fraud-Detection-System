import express from 'express';
import { Kafka } from 'kafkajs';
import {
  runEnterpriseConsumer,
  createMemoryIdempotencyStore
} from '@fraudshield/platform-kafka';
import { createServiceAuthMiddleware } from '@fraudshield/platform-auth';

const app = express();
const PORT = process.env.PORT || 5006;
const brokers = (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean);
const requireAuth = createServiceAuthMiddleware();

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

app.post('/notify', requireAuth, async (req, res) => {
  const { channel = 'webhook', payload } = req.body;
  try {
    const result = await dispatch(channel, payload);
    res.json(result);
  } catch (error) {
    res.status(502).json({ delivered: false, error: error.message });
  }
});

async function dispatch(channel, payload) {
  const message = payload?.message || payload?.text || 'FraudShield alert';

  if (channel === 'slack' && process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, blocks: payload?.blocks })
    });
    return { delivered: true, channel: 'slack' };
  }

  if (channel === 'telegram' && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message })
      }
    );
    return { delivered: true, channel: 'telegram' };
  }

  if (channel === 'sms' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const to = payload?.to || process.env.TWILIO_TO_NUMBER;
    const from = process.env.TWILIO_FROM_NUMBER;
    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64');
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ To: to, From: from, Body: message })
      }
    );
    return { delivered: true, channel: 'sms', provider: 'twilio' };
  }

  if (channel === 'email' && process.env.SMTP_HOST) {
    await sendSmtpEmail({ to: payload?.to, subject: payload?.subject || 'Fraud Alert', text: message });
    return { delivered: true, channel: 'email', provider: 'smtp' };
  }

  if (channel === 'webhook' && process.env.ALERT_WEBHOOK_URL) {
    await fetch(process.env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || { message })
    });
    return { delivered: true, channel: 'webhook' };
  }

  if (channel === 'discord' && process.env.DISCORD_WEBHOOK_URL) {
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
    return { delivered: true, channel: 'discord' };
  }

  console.log(`[notify:${channel}]`, message);
  return { delivered: false, channel, reason: 'channel_not_configured' };
}

async function sendSmtpEmail({ to, subject, text }) {
  const nodemailer = await import('nodemailer').catch(() => null);
  if (!nodemailer) {
    throw new Error('Install nodemailer for SMTP delivery');
  }
  const transport = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'alerts@frauddetection.com',
    to: to || process.env.ALERT_EMAIL_TO,
    subject,
    text
  });
}

async function startKafkaConsumer() {
  if (!brokers.length) return;

  await runEnterpriseConsumer({
    clientId: 'notification-service',
    groupId: 'fraudshield-notifications',
    brokers: brokers.join(','),
    topics: ['fraud.decisions'],
    idempotencyStore: createMemoryIdempotencyStore(),
    handler: async ({ payload }) => {
      if ((payload.riskScore || 0) < Number(process.env.ALERT_RISK_THRESHOLD || 40)) {
        return;
      }
      const text = `Fraud alert txn=${payload.transactionId} score=${payload.riskScore} decision=${payload.decision}`;
      await dispatch(process.env.DEFAULT_ALERT_CHANNEL || 'slack', { message: text, ...payload });
    }
  });
}

app.listen(PORT, async () => {
  console.log(`Notification service on :${PORT}`);
  await startKafkaConsumer().catch((err) => console.warn('Kafka consumer:', err.message));
});
