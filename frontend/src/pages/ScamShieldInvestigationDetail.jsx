import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import './ScamShield.css';

export default function ScamShieldInvestigationDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/scamshield/investigations/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Investigation not found'));
  }, [id]);

  if (error) {
    return (
      <div className="scamshield-page">
        <p className="ss-error">{error}</p>
        <Link to="/app/scamshield/investigations" className="ss-back">Back</Link>
      </div>
    );
  }

  if (!data) return <div className="scamshield-page"><p>Loading…</p></div>;

  const { investigation, indicators } = data;

  return (
    <div className="scamshield-page">
      <Link to="/app/scamshield/investigations" className="ss-back">
        <ArrowLeft size={16} /> Investigations
      </Link>
      <header className="fs-page-header">
        <p className="fs-eyebrow">{investigation.status}</p>
        <h1>{investigation.title}</h1>
        <p>{investigation.notes || 'No notes'}</p>
      </header>

      <section className="fs-panel fs-panel--pad">
        <h2>Linked indicators</h2>
        {indicators.length === 0 ? (
          <p className="ss-muted">No indicators linked yet.</p>
        ) : (
          <ul className="ss-rels">
            {indicators.map((ind) => (
              <li key={ind.indicatorId}>
                <span className="ss-type">{ind.indicatorType}</span>{' '}
                <Link to={`/app/scamshield/indicators/${ind.indicatorId}`}>{ind.valueNormalized}</Link>
                <span className="ss-muted"> · conf {Number(ind.confidence).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
