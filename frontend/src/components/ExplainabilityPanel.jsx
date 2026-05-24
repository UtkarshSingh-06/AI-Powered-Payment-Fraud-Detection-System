import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExplainabilityPanel({ explain }) {
  const data = (explain?.shap || explain?.explanations || []).map((item) => ({
    name: item.feature,
    impact: Math.abs(item.impact || 0)
  }));

  return (
    <section className="fs-panel fs-panel--pad explain-panel">
      <h2>Explainability (SHAP)</h2>
      <p className="explain-sub">Feature contributions to fraud score</p>
      {data.length === 0 ? (
        <p>No explanation data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" stroke="#888" />
            <YAxis type="category" dataKey="name" stroke="#888" width={75} />
            <Tooltip />
            <Bar dataKey="impact" fill="#4ade80" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
