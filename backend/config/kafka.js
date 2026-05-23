import { Kafka, logLevel } from 'kafkajs';

let kafka;
let producer;

function getKafka() {
  if (kafka) {
    return kafka;
  }
  const brokers = (process.env.KAFKA_BROKERS || '').split(',').map((b) => b.trim()).filter(Boolean);
  if (!brokers.length) {
    return null;
  }
  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'fraudshield-backend',
    brokers,
    logLevel: logLevel.ERROR
  });
  return kafka;
}

export async function getKafkaProducer() {
  const client = getKafka();
  if (!client) {
    return null;
  }
  if (!producer) {
    producer = client.producer();
    await producer.connect();
  }
  return producer;
}

export async function publishKafkaEvent(topic, key, payload) {
  const kafkaProducer = await getKafkaProducer();
  if (!kafkaProducer) {
    return false;
  }
  const topicName = process.env[`KAFKA_TOPIC_${topic}`] || topic;
  await kafkaProducer.send({
    topic: topicName,
    messages: [
      {
        key: key || payload.eventId || payload.transactionId || 'event',
        value: JSON.stringify(payload)
      }
    ]
  });
  return true;
}

export async function disconnectKafka() {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
