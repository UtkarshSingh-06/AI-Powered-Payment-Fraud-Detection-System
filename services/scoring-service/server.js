import express from 'express';
import { validateScoringRequest, validateScoringResponse } from '@fraudshield/contracts';

const app = express();
const PORT = process.env.PORT || 5003;
const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:8000';
const RULES_ENGINE_URL = process.env.RULES_ENGINE_URL || 'http://localhost:5005';

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'scoring-service' }));

app.post('/score', async (req, res) => {
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
    headers: { 'Content-Type': 'application/json' },
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
