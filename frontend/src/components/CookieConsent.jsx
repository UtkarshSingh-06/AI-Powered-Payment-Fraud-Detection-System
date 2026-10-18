import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsent, setConsent } from '../utils/analytics';
import { trackEvent } from '../utils/analytics';
import './CookieConsent.css';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getConsent());
  }, []);

  function acceptAll() {
    setConsent({ analytics: true });
    trackEvent('cookie_consent', { analytics: true });
    setVisible(false);
  }

  function necessaryOnly() {
    setConsent({ analytics: false });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fs-cookie" role="dialog" aria-label="Cookie consent" aria-live="polite">
      <div className="fs-cookie-inner">
        <p>
          We use necessary cookies to run FraudShield and optional analytics cookies to improve the
          product. See our{' '}
          <Link to="/contact">contact page</Link> for privacy questions.
        </p>
        <div className="fs-cookie-actions">
          <button type="button" className="fs-btn-pill fs-btn-pill--ghost" onClick={necessaryOnly}>
            Necessary only
          </button>
          <button type="button" className="fs-btn-pill fs-btn-pill--white" onClick={acceptAll}>
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
