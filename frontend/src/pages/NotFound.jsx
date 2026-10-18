import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import RelatedLinks from '../components/RelatedLinks';
import { trackEvent } from '../utils/analytics';
import './NotFound.css';

export default function NotFound() {
  React.useEffect(() => {
    trackEvent('not_found', { path: window.location.pathname });
  }, []);

  return (
    <div className="not-found-page">
      <PageMeta
        title="Page not found — FraudShield"
        description="The page you requested could not be found on FraudShield."
        noIndex
      />
      <div className="fs-ambient-bg" aria-hidden />
      <div className="not-found-inner">
        <p className="not-found-code">404</p>
        <h1>This page wandered off</h1>
        <p>
          The URL may be mistyped, or the page was moved. Head back to safety — your fraud defenses
          are still online.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="fs-btn-pill fs-btn-pill--white">
            <Home size={16} /> Home
          </Link>
          <button type="button" className="fs-btn-pill fs-btn-pill--ghost" onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
        <RelatedLinks title="Helpful links" />
      </div>
    </div>
  );
}
