import React, { useEffect, useState } from 'react';

export default function GraphRiskView({ graphRisk, transaction }) {
  const [data, setData] = useState(graphRisk);

  useEffect(() => {
    if (graphRisk) {
      setData(graphRisk);
      return;
    }
    const inferenceUrl = import.meta.env.VITE_INFERENCE_URL || 'http://localhost:8000';
    fetch(`${inferenceUrl}/graph/risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: transaction?.transactionId,
        userId: transaction?.userId,
        deviceId: transaction?.deviceId,
        merchantName: transaction?.merchantName
      })
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [graphRisk, transaction]);

  return (
    <section className="fs-panel fs-panel--pad graph-panel">
      <h2>Graph risk</h2>
      {!data ? (
        <p>Graph analysis unavailable.</p>
      ) : (
        <ul className="graph-stats">
          <li><span>Network density</span><strong>{data.density ?? data.graphDensity ?? '—'}</strong></li>
          <li><span>Connected components</span><strong>{data.components ?? data.connectedComponents ?? '—'}</strong></li>
          <li><span>Graph risk score</span><strong>{data.graphRiskScore ?? data.riskScore ?? '—'}</strong></li>
          <li><span>Neighbor count</span><strong>{data.neighborCount ?? '—'}</strong></li>
        </ul>
      )}
    </section>
  );
}
