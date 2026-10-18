import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import './ScamShield.css';

export default function ScamShieldIndicator() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [invTitle, setInvTitle] = useState('');
  const [linkMsg, setLinkMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get(`/scamshield/indicators/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Indicator not found or access denied'))
      .finally(() => setLoading(false));
  }, [id]);

  async function addToNewInvestigation(e) {
    e.preventDefault();
    if (!invTitle.trim()) return;
    try {
      const created = await api.post('/scamshield/investigations', { title: invTitle.trim() });
      const invId = created.data.investigation.investigationId;
      await api.post(`/scamshield/investigations/${invId}/indicators`, { indicatorId: id });
      setLinkMsg(`Linked to investigation ${invTitle}`);
      setInvTitle('');
    } catch {
      setLinkMsg('Failed to create/link investigation');
    }
  }

  if (loading) return <div className="scamshield-page"><p>Loading…</p></div>;
  if (error || !data) {
    return (
      <div className="scamshield-page">
        <p className="ss-error">{error || 'Not found'}</p>
        <Link to="/app/scamshield" className="ss-back"><ArrowLeft size={16} /> Back</Link>
      </div>
    );
  }

  const { indicator, observations, relationships, confidence } = data;
  const explanation = confidence?.explanation || indicator.confidenceExplanation || {};

  return (
    <div className="scamshield-page">
      <Link to="/app/scamshield" className="ss-back"><ArrowLeft size={16} /> Indicators</Link>

      <header className="fs-page-header">
        <p className="fs-eyebrow">{indicator.indicatorType}</p>
        <h1 className="ss-detail-title">{indicator.valueNormalized}</h1>
        <p>{data.disclaimer}</p>
      </header>

      <div className="ss-detail-grid">
        <section className="fs-panel fs-panel--pad">
          <h2>Confidence</h2>
          <p className={`ss-conf ss-conf--lg ss-conf--${band(indicator.confidence)}`}>
            {Number(indicator.confidence).toFixed(3)}
          </p>
          <p className="ss-muted">{explanation.summary || 'No explanation available.'}</p>
          <ul className="ss-factors">
            {(explanation.factors || []).map((f, i) => (
              <li key={i}>
                <strong>{f.factor}</strong>: {f.detail}
              </li>
            ))}
          </ul>
          <p className="ss-action-badge">Action: {explanation.action || 'investigate_only'}</p>
        </section>

        <section className="fs-panel fs-panel--pad">
          <h2>Metadata</h2>
          <dl className="ss-dl">
            <dt>First seen</dt>
            <dd>{fmt(indicator.firstSeenAt)}</dd>
            <dt>Last seen</dt>
            <dd>{fmt(indicator.lastSeenAt)}</dd>
            <dt>Raw value</dt>
            <dd className="ss-mono">{indicator.valueRaw}</dd>
            <dt>Tags</dt>
            <dd>{(indicator.tags || []).join(', ') || '—'}</dd>
          </dl>
        </section>
      </div>

      <section className="fs-panel fs-panel--pad ss-section">
        <h2>Source evidence timeline</h2>
        {observations.length === 0 ? (
          <p className="ss-muted">No observations.</p>
        ) : (
          <ol className="ss-timeline">
            {observations.map((obs) => (
              <li key={obs.observationId}>
                <div className="ss-timeline-head">
                  <span className="ss-source">{obs.sourceId}</span>
                  <time>{fmt(obs.observedAt)}</time>
                </div>
                <p className="ss-muted">
                  ref: {obs.sourceRef} · threat: {obs.threatType || '—'} · tags:{' '}
                  {(obs.tags || []).join(', ') || '—'}
                </p>
                <pre className="ss-raw">{JSON.stringify(obs.rawRecord, null, 2)}</pre>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="fs-panel fs-panel--pad ss-section">
        <h2>Relationships</h2>
        {relationships.length === 0 ? (
          <p className="ss-muted">No deterministic correlations yet.</p>
        ) : (
          <ul className="ss-rels">
            {relationships.map((rel) => (
              <li key={rel.relationshipId}>
                <span className="ss-type">{rel.relationshipType}</span>
                <p>{rel.explanation}</p>
                <p className="ss-muted">
                  rule: {rel.ruleId} · confidence: {Number(rel.confidence).toFixed(2)} ·{' '}
                  <Link to={`/app/scamshield/indicators/${otherId(rel, id)}`}>
                    related indicator
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fs-panel fs-panel--pad ss-section">
        <h2>Add to investigation</h2>
        <form className="ss-inv-form" onSubmit={addToNewInvestigation}>
          <input
            type="text"
            value={invTitle}
            onChange={(e) => setInvTitle(e.target.value)}
            placeholder="New investigation title"
            maxLength={200}
          />
          <button type="submit" className="fs-btn-pill fs-btn-pill--white">Create & link</button>
        </form>
        {linkMsg && <p className="ss-ingest-msg">{linkMsg}</p>}
      </section>
    </div>
  );
}

function otherId(rel, current) {
  return rel.sourceIndicatorId === current ? rel.targetIndicatorId : rel.sourceIndicatorId;
}

function band(c) {
  if (c >= 0.75) return 'high';
  if (c >= 0.5) return 'mid';
  return 'low';
}

function fmt(v) {
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v || '—');
  }
}
