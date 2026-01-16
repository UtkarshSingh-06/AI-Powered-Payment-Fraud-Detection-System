import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BlurText from '../components/BlurText';
import { Shield, Lock, Mail, ArrowRight, Sparkles, User, Eye, AlertTriangle } from 'lucide-react';
import './Auth.css';

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
              Create your account and start protecting your payments today. Get access to real-time 
              fraud detection, advanced analytics, and personalized security recommendations powered 
              by cutting-edge AI technology.
            </p>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <Shield size={20} />
                </div>
                <span>Enterprise-grade security and encryption</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Sparkles size={20} />
                </div>
                <span>AI-powered fraud prevention</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Mail size={20} />
                </div>
                <span>Real-time alerts and notifications</span>
              </div>
            </div>

            <div className="auth-stats">
              <div className="stat-item">
                <div className="stat-value">1000+</div>
                <div className="stat-label">Active Users</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">$10M+</div>
                <div className="stat-label">Protected</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="auth-form-container">
          <div className="auth-card glass-card">
            <div className="card-glow"></div>
            
            <div className="auth-card-header">
              <h2 className="auth-card-title">Create Account</h2>
              <p className="auth-card-subtitle">Sign up to get started with fraud detection</p>
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
                  <User size={18} />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>

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
                    placeholder="Create a password (min. 6 characters)"
                    minLength={6}
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <Link to="/login" className="btn btn-secondary btn-create-account">
              <Sparkles size={18} />
              <span>Already have an account? Sign In</span>
            </Link>

            <p className="auth-footer-text">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
            
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link to="/about" style={{ color: 'rgba(229, 231, 235, 0.6)', fontSize: '0.85rem', textDecoration: 'none' }}>
                Learn more about FraudShield AI →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
