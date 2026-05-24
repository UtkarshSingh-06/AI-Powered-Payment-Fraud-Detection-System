import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createServiceAuthMiddleware } from '@fraudshield/platform-auth';

const app = express();
const PORT = process.env.PORT || 5008;
const INGESTION_URL = process.env.INGESTION_URL || 'http://localhost:5002';
const requireAuth = createServiceAuthMiddleware();

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sandbox-simulator' }));

app.post('/simulate/fraud', requireAuth, async (req, res) => {
  const count = Math.min(Number(req.body.count || 10), 100);
  const authHeader = req.headers.authorization;
  const scenarios = Array.from({ length: count }).map((_, index) => ({
    amount: 50000 + index * 1000,
    merchantName: `Sandbox Merchant ${index + 1}`,
    merchantCategory: 'Gambling',
    paymentMethod: 'Digital Wallet',
    deviceId: `sandbox-device-${index}`,
    clientFingerprint: `fp-${uuidv4()}`,
    velocityHint: 8
  }));

  const results = [];
  for (const txn of scenarios) {
    try {
      const response = await fetch(`${INGESTION_URL}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
          'x-correlation-id': uuidv4()
        },
        body: JSON.stringify(txn)
      });
      results.push({ status: response.status, body: await response.json() });
    } catch (error) {
      results.push({ error: error.message });
    }
  }

  res.json({ generated: count, ingested: results.filter((r) => r.status === 202).length, results });
});

app.post('/simulate/adversarial', (_req, res) => {
  res.json({
    attacks: [
      { type: 'amount_splitting', description: 'Split large txn into micro-payments', evasionRisk: 0.42 },
      { type: 'device_spoofing', description: 'Rotate device fingerprints per session', evasionRisk: 0.55 },
      { type: 'velocity_burst', description: 'Burst traffic under threshold windows', evasionRisk: 0.61 }
    ],
    recommendation: 'Enable velocity rules + graph analysis for adversarial resilience'
  });
});

app.listen(PORT, () => console.log(`Sandbox simulator on :${PORT}`));
