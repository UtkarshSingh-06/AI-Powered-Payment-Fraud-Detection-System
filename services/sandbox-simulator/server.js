import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 5008;

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sandbox-simulator' }));

app.post('/simulate/fraud', (req, res) => {
  const count = Number(req.body.count || 10);
  const scenarios = Array.from({ length: count }).map((_, index) => ({
    transactionId: uuidv4(),
    amount: 50000 + index * 1000,
    merchantCategory: 'Gambling',
    velocity_5m: 8,
    expectedClassification: 'Fraudulent'
  }));
  res.json({ generated: scenarios.length, scenarios });
});

app.post('/simulate/adversarial', (_req, res) => {
  res.json({
    attacks: [
      { type: 'amount_splitting', evasionRisk: 0.42 },
      { type: 'device_spoofing', evasionRisk: 0.55 }
    ]
  });
});

app.listen(PORT, () => console.log(`Sandbox simulator on :${PORT}`));
