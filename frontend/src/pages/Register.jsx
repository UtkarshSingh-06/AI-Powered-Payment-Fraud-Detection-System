import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { Lock, Mail, ArrowRight, User, Eye, AlertTriangle } from 'lucide-react';
import './Auth.css';

function RegisterAside() {
  return (
    <>
      <p className="fs-eyebrow">Get started</p>
      <h1 className="fs-auth-headline">
        Join FraudShield
        <span> in minutes</span>
      </h1>
      <p className="fs-auth-lead">
        Create an account for real-time UPI fraud detection, analytics, and audit-ready
        compliance — built on the same stack as our enterprise landing experience.
      </p>
      <ul className="fs-auth-features">
        <li>RBI-aligned security controls</li>
        <li>AI + rules hybrid scoring</li>
        <li>Instant alerts &amp; dashboards</li>
      </ul>
    </>
  );
}

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell aside={<RegisterAside />}>
      <div className="fs-panel fs-panel--pad fs-auth-card">
        <h2 className="fs-auth-card-title">Create account</h2>
        <p className="fs-auth-card-sub">Sign up to access your fraud detection dashboard</p>

        {error && (
          <div className="fs-alert fs-alert--error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="fs-auth-form">
          <div className="fs-field">
            <label>
              <User size={16} />
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

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
                minLength={6}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
              <button type="button" className="fs-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                <Eye size={18} />
              </button>
            </div>
          </div>

          <button type="submit" className="fs-btn-pill fs-btn-pill--white fs-btn-pill--full" disabled={loading}>
            {loading ? 'Creating account…' : (
              <>
                Create account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="fs-auth-divider">
          <span>or</span>
        </div>

        <Link to="/login" className="fs-btn-pill fs-btn-pill--ghost fs-btn-pill--full">
          Already have an account? Sign in
        </Link>

        <p className="fs-auth-legal">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </AuthShell>
  );
}

export default Register;
