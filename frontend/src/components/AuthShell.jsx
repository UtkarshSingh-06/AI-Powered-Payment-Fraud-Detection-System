import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import SceneFallback from './landing/SceneFallback';

export default function AuthShell({ children, aside, backTo = '/' }) {
  return (
    <div className="fs-auth-page">
      <SceneFallback />
      <div className="fs-ambient-bg" />

      <header className="fs-top-nav">
        <div className="fs-top-nav-inner">
          <Link to={backTo} className="fs-brand">
            <Shield size={22} />
            <span>FraudShield</span>
          </Link>
          <div className="fs-nav-actions">
            <Link to="/">Home</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="fs-btn-pill fs-btn-pill--white" style={{ padding: '8px 18px' }}>
              Launch App
            </Link>
          </div>
        </div>
      </header>

      <div className="fs-auth-body">
        {aside && <aside className="fs-auth-aside">{aside}</aside>}
        <div className="fs-auth-form-wrap">{children}</div>
      </div>
    </div>
  );
}
