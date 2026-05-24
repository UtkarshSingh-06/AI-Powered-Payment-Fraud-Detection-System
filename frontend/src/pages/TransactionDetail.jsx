import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import GraphRiskView from '../components/GraphRiskView';
import './TransactionDetail.css';

export default function TransactionDetail() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [explain, setExplain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [txnRes, explainRes] = await Promise.all([
          api.get(`/transactions/${id}`),
          api.get(`/transactions/${id}/explain`)
        ]);
        setTransaction(txnRes.data);
        setExplain(explainRes.data);
      } catch {
        setError('Unable to load transaction');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="txn-detail"><p>Loading…</p></div>;
  if (error || !transaction) return <div className="txn-detail"><p>{error || 'Not found'}</p></div>;

  return (
    <div className="txn-detail">
      <Link to="/app/transactions" className="txn-back">← Back to transactions</Link>
      <header className="fs-page-header">
        <p className="fs-eyebrow">Investigation</p>
        <h1>{transaction.merchantName}</h1>
        <p>Transaction {transaction.transactionId}</p>
      </header>

      <div className="txn-detail-grid">
        <section className="fs-panel fs-panel--pad">
          <h2>Summary</h2>
          <ul className="txn-facts">
            <li><span>Amount</span><strong>{transaction.currency} {transaction.amount}</strong></li>
            <li><span>Risk score</span><strong>{transaction.fraudStatus?.score ?? '—'}</strong></li>
            <li><span>Decision</span><strong>{transaction.riskDecision}</strong></li>
            <li><span>Status</span><strong>{transaction.status}</strong></li>
            <li><span>Model</span><strong>{transaction.fraudStatus?.modelVersion}</strong></li>
          </ul>
        </section>

        <ExplainabilityPanel explain={explain} />
        <GraphRiskView graphRisk={explain?.graphRisk} transaction={transaction} />
      </div>
    </div>
  );
}
