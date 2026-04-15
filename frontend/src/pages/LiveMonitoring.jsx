import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './LiveMonitoring.css';

function formatRisk(score) {
  if (score >= 70) return 'Fraudulent';
  if (score >= 40) return 'Suspicious';
  return 'Safe';
}

export default function LiveMonitoring() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');

  const isAdmin = user?.role === 'admin';

  const updateTransactions = (items = []) => {
    const sorted = [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setTransactions(sorted.slice(0, 50));
    setLastUpdatedAt(new Date().toISOString());
  };

  useEffect(() => {
    let isMounted = true;

    async function loadBaseData() {
      setLoading(true);
      setError('');
      try {
        const txRes = await api.get('/transactions?limit=50');
        if (isMounted) {
          updateTransactions(txRes.data.transactions || []);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError('Unable to fetch transactions. Please refresh and try again.');
        }
      }

      if (isAdmin) {
        try {
          const labelRes = await api.get('/admin/labels');
          if (isMounted) {
            setLabels(labelRes.data.labels || []);
          }
        } catch {
          // Do not fail the page if labels endpoint is unavailable.
          if (isMounted) {
            setLabels([]);
          }
        }
      } else if (isMounted) {
        setLabels([]);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    function setupRealtime() {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
      const socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'transaction_update' && payload.data) {
            setTransactions((prev) => {
              const withoutCurrent = prev.filter((tx) => tx.transactionId !== payload.data.transactionId);
              const next = [payload.data, ...withoutCurrent]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 50);
              return next;
            });
            setLastUpdatedAt(new Date().toISOString());
          }
        } catch {
          // ignore malformed websocket payloads
        }
      };

      return socket;
    }

    loadBaseData();
    const socket = setupRealtime();
    const poller = setInterval(loadBaseData, 30000);

    return () => {
      isMounted = false;
      clearInterval(poller);
      socket.close();
    };
  }, [isAdmin]);

  const stats = useMemo(() => {
    const highRisk = transactions.filter((tx) => (tx.fraudStatus?.score || 0) >= 70).length;
    const challenges = transactions.filter((tx) => tx.riskDecision === 'challenge_otp').length;
    return { total: transactions.length, highRisk, challenges, labels: labels.length };
  }, [transactions, labels]);

  return (
    <div className="page-wrapper live-monitoring-page">
      <div className="page-background">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
        <div className="gradient-orb orb-3" />
      </div>

      <header className="page-header live-header">
        <div>
          <h1>Live Fraud Monitoring</h1>
          <p>Real-time risk scores, decision routing, and investigation context.</p>
        </div>
        <div className="live-pill">
          <span className="live-dot" />
          {lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}` : 'Waiting for updates'}
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="stats-grid live-stats-grid">
        <article className="glass-card live-stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{stats.total}</div>
        </article>
        <article className="glass-card live-stat-card">
          <div className="stat-label">High Risk</div>
          <div className="stat-value text-danger">{stats.highRisk}</div>
        </article>
        <article className="glass-card live-stat-card">
          <div className="stat-label">OTP Challenges</div>
          <div className="stat-value text-warning">{stats.challenges}</div>
        </article>
        <article className="glass-card live-stat-card">
          <div className="stat-label">Analyst Labels</div>
          <div className="stat-value text-success">{isAdmin ? stats.labels : '-'}</div>
        </article>
      </section>

      <section className="card live-table-card">
        <div className="card-header">
          <h2 className="card-title">Recent Risk Decisions</h2>
          <span className="table-subtitle">Showing latest {transactions.length} transactions</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Amount</th>
                <th>Risk Score</th>
                <th>Risk Band</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5}>Loading live data...</td></tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr><td colSpan={5}>No transactions found yet.</td></tr>
              )}
              {!loading && transactions.map((tx) => {
                const riskBand = formatRisk(tx.fraudStatus?.score ?? 0);
                return (
                  <tr key={tx.transactionId}>
                    <td><span className="transaction-id">{tx.transactionId}</span></td>
                    <td>{tx.currency || 'INR'} {Number(tx.amount || 0).toFixed(2)}</td>
                    <td>{tx.fraudStatus?.score ?? 0}</td>
                    <td>
                      <span className={`badge badge-${riskBand.toLowerCase()}`}>
                        {riskBand}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${tx.status || 'pending'}`}>
                        {(tx.riskDecision || 'allow').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
