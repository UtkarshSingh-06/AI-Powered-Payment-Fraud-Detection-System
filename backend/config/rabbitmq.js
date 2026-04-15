import amqp from 'amqplib';

let channel;

export async function getRabbitChannel() {
  if (channel) {
    return channel;
  }

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    return null;
  }

  const conn = await amqp.connect(rabbitUrl);
  channel = await conn.createChannel();
  await channel.assertExchange('fraud.events', 'topic', { durable: true });
  return channel;
}

export async function publishEvent(routingKey, payload) {
  const ch = await getRabbitChannel();
  if (!ch) {
    return false;
  }
  const data = Buffer.from(JSON.stringify(payload));
  return ch.publish('fraud.events', routingKey, data, { persistent: true });
}
