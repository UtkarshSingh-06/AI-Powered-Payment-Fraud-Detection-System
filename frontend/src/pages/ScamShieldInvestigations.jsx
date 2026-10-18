import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import './ScamShield.css';

export default function ScamShieldInvestigations() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/scamshield/investigations');
      setItems(res.data.investigations || []);
    } catch {
      setError('Unable to load investigations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post('/scamshield/investigations', { title: title.trim() });
    setTitle('');
    load();
  }

  async function setStatus(id, status) {
    await api.patch(`/scamshield/investigations/${id}`, { status });
    load();
  }

  return (
    <div className="scamshield-page">
      <Link to="/app/scamshield" className="ss-back"><ArrowLeft size={16} /> ScamShield</Link>
      <header className="fs-page-header">
        <p className="fs-eyebrow">Analyst workspace</p>
        <h1>Investigations</h1>
        <p>Track indicator clusters without automated enforcement.</p>
      </header>

      <form className="ss-inv-form fs-panel fs-panel--pad" onSubmit={create}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Investigation title"
          maxLength={200}
        />
        <button type="submit" className="fs-btn-pill fs-btn-pill--white">Create</button>
      </form>

      {error && <p className="ss-error">{error}</p>}
      {loading ? (
        <p className="ss-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="ss-muted">No investigations yet.</p>
      ) : (
        <div className="ss-inv-grid">
          {items.map((inv) => (
            <article key={inv.investigationId} className="fs-panel fs-panel--pad">
              <div className="ss-inv-head">
                <span className={`ss-status ss-status--${inv.status}`}>{inv.status}</span>
              </div>
              <h3>{inv.title}</h3>
              <p className="ss-muted">{inv.notes || 'No notes'}</p>
              <div className="ss-inv-actions">
                <button type="button" className="fs-btn-pill fs-btn-pill--ghost" onClick={() => setStatus(inv.investigationId, 'investigating')}>
                  Investigate
                </button>
                <button type="button" className="fs-btn-pill fs-btn-pill--ghost" onClick={() => setStatus(inv.investigationId, 'closed')}>
                  Close
                </button>
                <Link
                  to={`/app/scamshield/investigations/${inv.investigationId}`}
                  className="fs-btn-pill fs-btn-pill--white"
                >
                  Open
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
