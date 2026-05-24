import { v4 as uuidv4 } from 'uuid';
import { appendData } from '../config/database.js';

const CASE_SERVICE_URL = process.env.CASE_SERVICE_URL;
const INTERNAL_SECRET = process.env.GATEWAY_INTERNAL_SECRET || process.env.JWT_SECRET;

async function createLocalCase({ tenantId, transactionId, title, priority, userId }) {
  const caseId = uuidv4();
  const record = {
    caseId,
    case_id: caseId,
    tenantId: tenantId || 'default',
    transactionId,
    status: 'open',
    priority,
    title,
    payload: {
      caseId,
      transactionId,
      tenantId,
      title,
      priority,
      notes: [{ at: new Date().toISOString(), text: 'Auto-created from high-risk score' }]
    },
    createdAt: new Date().toISOString()
  };
  await appendData('cases.json', record);
  return record;
}

export async function createFraudCase({ tenantId, transactionId, title, priority = 'high', userId }) {
  if (!transactionId) return null;

  if (CASE_SERVICE_URL) {
    try {
      const response = await fetch(`${CASE_SERVICE_URL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-auth': INTERNAL_SECRET || '',
          'x-tenant-id': tenantId || 'default',
          'x-user-id': userId || 'system',
          'x-user-role': 'analyst'
        },
        body: JSON.stringify({
          transactionId,
          tenantId,
          title,
          priority,
          notes: [{ at: new Date().toISOString(), text: 'Auto-created from high-risk score' }]
        })
      });
      if (response.ok) return response.json();
    } catch {
      // fall through to local store
    }
  }

  return createLocalCase({ tenantId, transactionId, title, priority, userId });
}
