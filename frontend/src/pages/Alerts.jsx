import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Alerts.css';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/alerts')
      .then((res) => setAlerts(res.data.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="alerts-page"><p>Loading alerts…</p></div>;

  return (
    <div className="alerts-page">
      <header className="fs-page-header">
        <p className="fs-eyebrow">Operations</p>
        <h1>Alert inbox</h1>
        <p>High-risk transaction alerts for analyst review.</p>
      </header>
      <div className="alerts-list">
        {alerts.length === 0 ? (
          <p className="alerts-empty">No open alerts.</p>
        ) : (
          alerts.map((alert) => (
            <article key={alert.alertId} className="fs-panel fs-panel--pad alert-card">
              <div className="alert-head">
                <span className="alert-score">{alert.riskScore}</span>
                <span className="alert-status">{alert.status}</span>
              </div>
              <p>{alert.message}</p>
              {alert.transactionId && (
                <Link to={`/app/transactions/${alert.transactionId}`} className="alert-link">
                  View transaction →
                </Link>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
