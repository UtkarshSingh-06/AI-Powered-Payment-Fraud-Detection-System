import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { readData, appendData } from '../config/database.js';

let lastAuditHash = 'genesis';

export async function writeAuditLog(eventType, actorId, payload = {}) {
  const entry = {
    auditId: uuidv4(),
    eventType,
    actorId: actorId || 'system',
    payload,
    timestamp: new Date().toISOString(),
    prevHash: lastAuditHash
  };
  entry.hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ ...entry, hash: undefined }))
    .digest('hex');
  lastAuditHash = entry.hash;

  const logs = await readData('auditLogs.json');
  if (logs.length) {
    const prev = logs[logs.length - 1];
    entry.prevHash = prev.hash || lastAuditHash;
    entry.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...entry, hash: undefined }))
      .digest('hex');
    lastAuditHash = entry.hash;
  }

  await appendData('auditLogs.json', entry);
  return entry;
}

export function exportAuditChain(logs = []) {
  return logs.map((entry, index) => ({
    ...entry,
    chainIndex: index,
    verified: index === 0 || entry.prevHash === logs[index - 1]?.hash
  }));
}
