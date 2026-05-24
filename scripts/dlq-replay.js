#!/usr/bin/env node
/**
 * Replay messages from platform DLQ topic back to the original topic.
 * Usage: node scripts/dlq-replay.js --limit 50
 */
import { Kafka } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',').filter(Boolean);
const dlqTopic = process.env.KAFKA_DLQ_TOPIC || 'platform.dlq';
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 50);

const kafka = new Kafka({ clientId: 'fraudshield-dlq-replay', brokers });
const consumer = kafka.consumer({ groupId: `dlq-replay-${Date.now()}` });
const producer = kafka.producer();

await consumer.connect();
await producer.connect();
await consumer.subscribe({ topic: dlqTopic, fromBeginning: true });

let replayed = 0;
await consumer.run({
  eachMessage: async ({ message }) => {
    if (replayed >= limit) return;
    const payload = JSON.parse(message.value.toString());
    const targetTopic = payload.originalTopic || payload.topic;
    if (!targetTopic) return;

    await producer.send({
      topic: targetTopic,
      messages: [{ key: message.key?.toString(), value: message.value }]
    });
    replayed += 1;
    console.log(JSON.stringify({ replayed, targetTopic, offset: message.offset }));
  }
});

setTimeout(async () => {
  console.log(JSON.stringify({ status: 'done', replayed }));
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
}, 5000);
