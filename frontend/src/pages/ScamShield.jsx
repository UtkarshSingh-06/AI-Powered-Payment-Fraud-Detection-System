import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShieldAlert, RefreshCw, Plus } from 'lucide-react';
import api from '../services/api';
import { SkeletonPage } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import { trackEvent } from '../utils/analytics';
import './ScamShield.css';

export default function ScamShield() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [indicators, setIndicators] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 25, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ingestMsg, setIngestMsg] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 25, offset };
      if (q.trim()) params.q = q.trim();
      if (type) params.type = type;
      const res = await api.get('/scamshield/indicators', { params });
      setIndicators(res.data.indicators || []);
      setPagination(res.data.pagination || { total: 0, limit: 25, offset: 0 });
    } catch {
      setError('Unable to load indicators. Analyst access required.');
      setIndicators([]);
    } finally {
      setLoading(false);
    }
  }, [q, type]);

  useEffect(() => {
    load(0);
  }, [load]);

  function onSearch(e) {
    e.preventDefault();
    const next = {};
    if (q.trim()) next.q = q.trim();
    if (type) next.type = type;
    setSearchParams(next);
    load(0);
  }

  async function triggerIngest(feed) {
    setIngestMsg('');
    try {
      const res = await api.post(`/scamshield/ingest/${feed}`, feed === 'openphish' ? { force: true } : {});
      const msg = `${feed}: ${res.data.status} — upserted ${res.data.run?.recordsUpserted ?? 0}, skipped ${res.data.run?.recordsSkipped ?? 0}`;
      setIngestMsg(msg);
      toast.success(msg);
      trackEvent('scamshield_ingest', { feed, status: res.data.status });
      load(pagination.offset || 0);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Ingest failed';
      setIngestMsg(msg);
      toast.error(msg);
    }
  }

  async function submitManual(e) {
    e.preventDefault();
    if (!manualValue.trim()) return;
    try {
      await api.post('/scamshield/indicators', { value: manualValue.trim() });
      setManualValue('');
      setShowManual(false);
      load(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Manual submit failed');
    }
  }

  return (
    <div className="scamshield-page">
      <header className="fs-page-header">
        <p className="fs-eyebrow">Threat intelligence</p>
        <h1>ScamShield</h1>
        <p>
          Search indicators, review source evidence, and manage investigations.
          Intelligence is for investigation only — never auto-blocked.
        </p>
      </header>

      <div className="ss-toolbar fs-panel fs-panel--pad">
        <form className="ss-search" onSubmit={onSearch}>
          <div className="ss-search-field">
            <Search size={18} aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search URL, domain, IP, hash…"
              aria-label="Search indicators"
            />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Indicator type">
            <option value="">All types</option>
            <option value="url">URL</option>
            <option value="domain">Domain</option>
            <option value="ip">IP</option>
            <option value="hash_md5">MD5</option>
            <option value="hash_sha1">SHA1</option>
            <option value="hash_sha256">SHA256</option>
          </select>
          <button type="submit" className="fs-btn-pill fs-btn-pill--white">Search</button>
        </form>

        <div className="ss-actions">
          <button type="button" className="fs-btn-pill fs-btn-pill--ghost" onClick={() => triggerIngest('urlhaus')}>
            <RefreshCw size={16} /> Ingest URLhaus
          </button>
          <button type="button" className="fs-btn-pill fs-btn-pill--ghost" onClick={() => triggerIngest('openphish')}>
            <RefreshCw size={16} /> Ingest OpenPhish
          </button>
          <button type="button" className="fs-btn-pill fs-btn-pill--accent" onClick={() => setShowManual((v) => !v)}>
            <Plus size={16} /> Manual IOC
          </button>
          <Link to="/app/scamshield/investigations" className="fs-btn-pill fs-btn-pill--ghost">
            Investigations
          </Link>
        </div>
      </div>

      {showManual && (
        <form className="ss-manual fs-panel fs-panel--pad" onSubmit={submitManual}>
          <p className="ss-hint">
            <ShieldAlert size={16} /> Submitted values are stored as metadata only — the URL is never fetched.
          </p>
          <input
            type="text"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="https://suspicious.example/path or domain/hash"
            maxLength={2048}
          />
          <button type="submit" className="fs-btn-pill fs-btn-pill--white">Record indicator</button>
        </form>
      )}

      {ingestMsg && <p className="ss-ingest-msg">{ingestMsg}</p>}
      {error && <p className="ss-error">{error}</p>}

      {loading ? (
        <SkeletonPage title="Loading indicators" rows={4} />
      ) : indicators.length === 0 ? (
        <EmptyState
          title="No indicators yet"
          description="Ingest URLhaus or OpenPhish, or record a manual IOC to start investigating."
          actionLabel="Open investigations"
          actionTo="/app/scamshield/investigations"
        />
      ) : (
        <div className="ss-table-wrap fs-panel">
          <table className="ss-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Value</th>
                <th>Confidence</th>
                <th>Last seen</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind) => (
                <tr
                  key={ind.indicatorId}
                  className="ss-row"
                  onClick={() => navigate(`/app/scamshield/indicators/${ind.indicatorId}`)}
                >
                  <td><span className="ss-type">{ind.indicatorType}</span></td>
                  <td className="ss-value">{ind.valueNormalized}</td>
                  <td>
                    <span className={`ss-conf ss-conf--${confidenceBand(ind.confidence)}`}>
                      {Number(ind.confidence).toFixed(2)}
                    </span>
                  </td>
                  <td className="ss-muted">{formatDate(ind.lastSeenAt)}</td>
                  <td className="ss-tags">{(ind.tags || []).slice(0, 4).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.total > pagination.limit && (
        <div className="ss-pager">
          <button
            type="button"
            className="fs-btn-pill fs-btn-pill--ghost"
            disabled={pagination.offset <= 0}
            onClick={() => load(Math.max(0, pagination.offset - pagination.limit))}
          >
            Previous
          </button>
          <span className="ss-muted">
            {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <button
            type="button"
            className="fs-btn-pill fs-btn-pill--ghost"
            disabled={pagination.offset + pagination.limit >= pagination.total}
            onClick={() => load(pagination.offset + pagination.limit)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function confidenceBand(c) {
  if (c >= 0.75) return 'high';
  if (c >= 0.5) return 'mid';
  return 'low';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}
