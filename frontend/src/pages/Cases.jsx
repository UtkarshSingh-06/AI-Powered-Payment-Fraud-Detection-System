import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './Cases.css';

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/cases');
      setCases(response.data.cases || []);
    } catch {
      setError('Unable to load cases');
    } finally {
      setLoading(false);
    }
  }

  async function updateCase(caseId, status) {
    await api.patch(`/cases/${caseId}`, { status, note: `Status changed to ${status}` });
    loadCases();
  }

  if (loading) {
    return (
      <div className="cases-page">
        <p>Loading cases…</p>
      </div>
    );
  }

  return (
    <div className="cases-page">
      <header className="fs-page-header">
        <p className="fs-eyebrow">Investigations</p>
        <h1>Fraud cases</h1>
        <p>Formal case queue with tenant-scoped access.</p>
      </header>

      {error && <p className="cases-error">{error}</p>}

      <div className="cases-grid">
        {cases.length === 0 ? (
          <p className="cases-empty">No open cases. High-risk transactions create alerts for analysts.</p>
        ) : (
          cases.map((item) => {
            const payload = typeof item.payload === 'object' ? item.payload : {};
            const caseId = item.case_id || item.caseId || payload.caseId;
            return (
              <article key={caseId} className="fs-panel fs-panel--pad case-card">
                <div className="case-card-head">
                  <span className={`case-status case-status--${item.status}`}>{item.status}</span>
                  <span className="case-priority">{item.priority || 'medium'}</span>
                </div>
                <h3>{payload.title || item.title || 'Investigation'}</h3>
                <p className="case-meta">Txn: {payload.transactionId || item.transaction_id || item.transactionId || '—'}</p>
                <div className="case-actions">
                  <button type="button" className="fs-btn-pill fs-btn-pill--ghost" onClick={() => updateCase(caseId, 'investigating')}>Investigate</button>
                  <button type="button" className="fs-btn-pill fs-btn-pill--white" onClick={() => updateCase(caseId, 'closed')}>Close</button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
