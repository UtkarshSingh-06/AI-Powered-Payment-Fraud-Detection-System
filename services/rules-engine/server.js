import express from 'express';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createServiceAuthMiddleware } from '@fraudshield/platform-auth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5005;
const requireAuth = createServiceAuthMiddleware();

const policies = JSON.parse(
  readFileSync(join(__dirname, 'policies', 'default.json'), 'utf-8')
);

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'rules-engine' }));

app.get('/policies', requireAuth, (_req, res) => res.json({ policies }));

app.post('/evaluate', requireAuth, (req, res) => {
  const { transaction = {}, modelOutput = {} } = req.body;
  const riskScore = modelOutput.riskScore ?? 0;
  const hits = [];
  let decision = modelOutput.decision || 'allow';

  for (const rule of policies.rules) {
    if (evaluateRule(rule, transaction, riskScore)) {
      hits.push(rule.id);
      if (rule.decision === 'block') decision = 'block';
      else if (decision !== 'block' && rule.decision) decision = rule.decision;
    }
  }

  res.json({ decision, hits, policyVersion: policies.version, shadowMode: policies.shadowMode });
});

function evaluateRule(rule, transaction, riskScore) {
  if (rule.type === 'amount_threshold') {
    return transaction.amount >= rule.threshold && riskScore >= (rule.minRisk || 0);
  }
  if (rule.type === 'velocity') {
    return (transaction.featureVector?.velocity_5m || 0) >= rule.threshold;
  }
  return false;
}

app.listen(PORT, () => console.log(`Rules engine on :${PORT}`));
