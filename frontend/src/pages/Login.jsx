import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import BlurText from '../components/BlurText';
import { Shield, Lock, Mail, ArrowRight, Sparkles, Zap, Eye, AlertTriangle } from 'lucide-react';
import './Auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await login(email, password);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated Background */}
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="auth-container">
        {/* Left Side - Description */}
        <div className="auth-description">
          <div className="description-content">
            <div className="logo-section">
              <div className="logo-icon">
                <Shield size={48} />
              </div>
              <BlurText 
                text="FraudShield AI - The AI based fraud payment detector"
                className="auth-main-title"
                delay={80}
                animateBy="words"
                direction="top"
                stepDuration={0.3}
              />
            </div>
            
            <p className="auth-description-text">
              Protect your payments with cutting-edge AI technology. Our advanced fraud detection system 
              analyzes transactions in real-time, identifying suspicious patterns and preventing fraudulent 
              activities before they impact your business.
            </p>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <Zap size={20} />
                </div>
                <span>Real-time fraud detection and monitoring</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Eye size={20} />
                </div>
                <span>AI-powered risk analysis and scoring</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Sparkles size={20} />
                </div>
                <span>Intelligent recommendations and insights</span>
              </div>
            </div>

            <div className="auth-stats">
              <div className="stat-item">
                <div className="stat-value">99.9%</div>
                <div className="stat-label">Accuracy</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">&lt;100ms</div>
                <div className="stat-label">Response Time</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">24/7</div>
                <div className="stat-label">Monitoring</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="auth-form-container">
          <div className="auth-card glass-card">
            <div className="card-glow"></div>
            
            <div className="auth-card-header">
              <h2 className="auth-card-title">Welcome Back</h2>
              <p className="auth-card-subtitle">Sign in to continue to your dashboard</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">
                  <Mail size={18} />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={18} />
                  <span>Password</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-login" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <Link to="/register" className="btn btn-secondary btn-create-account">
              <Sparkles size={18} />
              <span>Create New Account</span>
            </Link>
            
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link to="/about" style={{ color: 'rgba(229, 231, 235, 0.6)', fontSize: '0.85rem', textDecoration: 'none' }}>
                Learn more about FraudShield AI →
              </Link>
            </div>

            <p className="auth-footer-text">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
