import { publishEvent as publishRabbitEvent } from '../config/rabbitmq.js';
import { publishKafkaEvent } from '../config/kafka.js';
import {
  validateTransactionIngestedEvent,
  validateFraudDecisionEvent
} from '@fraudshield/contracts';

const ROUTING_TO_KAFKA_TOPIC = {
  'transaction.ingested': 'transactions.ingested',
  'fraud.decision.made': 'fraud.decisions',
  'fraud.label.updated': 'fraud.labels'
};

function validateByRoutingKey(routingKey, payload) {
  if (routingKey === 'transaction.ingested') {
    return validateTransactionIngestedEvent(payload);
  }
  if (routingKey === 'fraud.decision.made') {
    return validateFraudDecisionEvent(payload);
  }
  return { valid: true, errors: [] };
}

export async function publishPlatformEvent(routingKey, payload) {
  const validation = validateByRoutingKey(routingKey, payload);
  if (!validation.valid) {
    const error = new Error(validation.errors.join('; '));
    error.status = 400;
    throw error;
  }

  const [rabbitOk, kafkaTopic] = await Promise.all([
    publishRabbitEvent(routingKey, payload),
    publishKafkaEvent(ROUTING_TO_KAFKA_TOPIC[routingKey] || routingKey, routingKey, payload)
  ]);

  return { rabbitmq: rabbitOk, kafka: kafkaTopic };
}
