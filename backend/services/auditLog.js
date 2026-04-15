import { v4 as uuidv4 } from 'uuid';
import { appendData } from '../config/database.js';

export async function writeAuditLog(eventType, actorId, payload = {}) {
  await appendData('auditLogs.json', {
    auditId: uuidv4(),
    eventType,
    actorId: actorId || 'system',
    payload,
    timestamp: new Date().toISOString()
  });
}
