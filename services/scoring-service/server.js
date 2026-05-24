import express from 'express';
import { validateScoringRequest, validateScoringResponse } from '@fraudshield/contracts';
import { createServiceAuthMiddleware } from '@fraudshield/platform-auth';

const app = express();
const PORT = process.env.PORT || 5003;
const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:8000';
const RULES_ENGINE_URL = process.env.RULES_ENGINE_URL || 'http://localhost:5005';
const requireAuth = createServiceAuthMiddleware();

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'scoring-service' }));

app.post('/score', requireAuth, async (req, res) => {
  const validation = validateScoringRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const inferenceResponse = await fetch(`${INFERENCE_URL}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  const inferenceResult = inferenceResponse.ok ? await inferenceResponse.json() : {
    transactionId: req.body.transactionId,
    riskScore: 50,
    classification: 'Suspicious',
    decision: 'challenge_otp',
    models: [],
    explanations: []
  };

  const rulesResponse = await fetch(`${RULES_ENGINE_URL}/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gateway-auth': process.env.GATEWAY_INTERNAL_SECRET || process.env.JWT_SECRET || ''
    },
    body: JSON.stringify({ transaction: req.body, modelOutput: inferenceResult })
  });
  const rules = rulesResponse.ok ? await rulesResponse.json() : { decision: inferenceResult.decision, hits: [] };

  const result = {
    ...inferenceResult,
    decision: rules.decision || inferenceResult.decision,
    ruleHits: rules.hits || []
  };

  const responseValidation = validateScoringResponse({
    transactionId: result.transactionId,
    riskScore: result.riskScore,
    classification: result.classification,
    decision: result.decision,
    models: result.models || [],
    explanations: result.explanations || [],
    modelVersion: result.modelVersion,
    ruleHits: result.ruleHits
  });

  if (!responseValidation.valid) {
    return res.status(500).json({ errors: responseValidation.errors });
  }

  res.json(result);
});

app.listen(PORT, () => console.log(`Scoring service on :${PORT}`));
