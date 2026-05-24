import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { Lock, Mail, ArrowRight, Eye, AlertTriangle } from 'lucide-react';
import './Auth.css';

function LoginAside() {
  return (
    <>
      <p className="fs-eyebrow">Secure access</p>
      <h1 className="fs-auth-headline">
        Real-time fraud intelligence
        <span> for your payments</span>
      </h1>
      <p className="fs-auth-lead">
        Sub-100ms scoring, explainable decisions, and enterprise-grade audit trails — the same
        platform power shown on our home page.
      </p>
      <ul className="fs-auth-features">
        <li>24/7 transaction monitoring</li>
        <li>ML + rules hybrid scoring</li>
        <li>UPI &amp; card coverage</li>
      </ul>
    </>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, mfaRequired ? totpCode : undefined);
      navigate('/app/dashboard');
    } catch (err) {
      if (err.mfaRequired || err.response?.data?.mfaRequired) {
        setMfaRequired(true);
      }
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell aside={<LoginAside />}>
      <div className="fs-panel fs-panel--pad fs-auth-card">
        <h2 className="fs-auth-card-title">Welcome back</h2>
        <p className="fs-auth-card-sub">Sign in to continue to your dashboard</p>

        {error && (
          <div className="fs-alert fs-alert--error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="fs-auth-form">
          <div className="fs-field">
            <label>
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div className="fs-field">
            <label>
              <Lock size={16} />
              Password
            </label>
            <div className="fs-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="fs-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password"
              >
                <Eye size={18} />
              </button>
            </div>
          </div>

          {mfaRequired && (
            <div className="fs-field">
              <label>MFA code</label>
              <input
                type="text"
                inputMode="numeric"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-digit code"
                required
              />
              <p className="fs-auth-card-sub">Demo: use 000000 when MFA_DEV_BYPASS is enabled</p>
            </div>
          )}

          <button type="submit" className="fs-btn-pill fs-btn-pill--white fs-btn-pill--full" disabled={loading}>
            {loading ? 'Signing in…' : (
              <>
                Sign in
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="fs-auth-divider">
          <span>or</span>
        </div>

        <Link to="/register" className="fs-btn-pill fs-btn-pill--ghost fs-btn-pill--full">
          Create account
        </Link>

        <div className="fs-demo-box">
          <p className="fs-demo-title">Demo credentials</p>
          <div className="fs-demo-grid">
            <div>
              <span className="fs-demo-role">Admin</span>
              <code>admin@frauddetection.com</code>
              <code>admin123</code>
            </div>
            <div>
              <span className="fs-demo-role">User</span>
              <code>john.doe@example.com</code>
              <code>password123</code>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

export default Login;
