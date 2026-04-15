const defaultRules = [
  {
    id: 'high_amount_hard_stop',
    when: (tx, score) => tx.amount >= 100000 && score >= 70,
    decision: 'block'
  },
  {
    id: 'high_velocity_step_up',
    when: (_, score, features) => (features.velocity_5m || 0) >= 5 && score >= 45,
    decision: 'challenge_otp'
  },
  {
    id: 'new_device_step_up',
    when: (_, score, features) => (features.device_known ? 1 : 0) === 0 && score >= 35,
    decision: 'challenge_otp'
  }
];

export function applyRiskRules(transaction, modelOutput, featureVector = {}) {
  const riskScore = modelOutput?.riskScore ?? 0;
  const hits = [];
  let decision = modelOutput?.decision || 'allow';

  for (const rule of defaultRules) {
    if (rule.when(transaction, riskScore, featureVector)) {
      hits.push(rule.id);
      if (rule.decision === 'block') {
        decision = 'block';
      } else if (decision !== 'block') {
        decision = rule.decision;
      }
    }
  }

  return { decision, hits };
}
