import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Menu, Shield, X } from 'lucide-react';
import SceneFallback from '../components/landing/SceneFallback';

let HeroScene3D = null;
function loadHeroScene() {
  if (!HeroScene3D) {
    return import('../components/landing/HeroScene3D').then((m) => {
      HeroScene3D = m.default;
    });
  }
  return Promise.resolve();
}
import AnimatedCounter, { useInViewOnce } from '../components/landing/AnimatedCounter';
import './About.css';

const METRICS = [
  { label: 'Transactions protected', value: '2.4', suffix: 'M+', prefix: '' },
  { label: 'Fraud detection accuracy', value: '99.9', suffix: '%', prefix: '' },
  { label: 'Active merchants', value: '12000', suffix: '+', prefix: '' },
  { label: 'Scoring latency', value: '100', suffix: 'ms', prefix: '<' }
];

const COMPARE_ROWS = [
  { label: 'Detection time', legacy: '24hrs', shield: '<100ms' },
  { label: 'False positives', legacy: '12%', shield: '<2%' },
  { label: 'Manual review', legacy: 'High', shield: 'Automated' },
  { label: 'UPI coverage', legacy: 'Partial', shield: '300+ apps' }
];

const TRUST_ITEMS = ['PCI-DSS aligned', 'RBI / NPCI ready', 'SOC2 controls', 'Explainable AI (SHAP/LIME)'];

function About() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [metricsRef, metricsInView] = useInViewOnce(0.15);
  const [compareRef, compareInView] = useInViewOnce(0.12);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    loadHeroScene()
      .then(() => setShow3D(true))
      .catch(() => setShow3D(false));
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div className="landing-page">
      {show3D && HeroScene3D ? <HeroScene3D /> : <SceneFallback />}

      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-logo">
            <Shield size={22} />
            <span>FraudShield</span>
          </Link>
          <button
            type="button"
            className="landing-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#compare" onClick={() => setMobileMenuOpen(false)}>Compare</a>
            <a href="#trust" onClick={() => setMobileMenuOpen(false)}>Trust</a>
            <a href="#platform" onClick={() => setMobileMenuOpen(false)}>Platform</a>
            <Link to="/login" className="landing-link-muted" onClick={() => setMobileMenuOpen(false)}>
              Sign in
            </Link>
            <Link to="/register" className="landing-btn-pill" onClick={() => setMobileMenuOpen(false)}>
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <p className="landing-eyebrow">AI-powered payment fraud intelligence</p>
          <h1 className="landing-headline">
            Real-time fraud detection
            <br />
            <span className="landing-headline-accent">with enterprise liquidity</span>
          </h1>
          <p className="landing-subhead">
            Purpose-built for UPI, cards, and digital wallets — deep risk scoring, instant decisions,
            and analyst-grade explainability on one platform.
          </p>
          <div className="landing-hero-cta">
            <Link to="/register" className="landing-btn-primary">
              Enter App
              <ArrowRight size={18} />
            </Link>
            <a href="#compare" className="landing-btn-ghost">
              Learn more
            </a>
          </div>
        </div>
      </section>

      <section ref={metricsRef} className="landing-metrics">
        <div className="landing-metrics-grid">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              className="landing-metric"
              initial={{ opacity: 0, y: 24 }}
              animate={metricsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <div className="landing-metric-value">
                <AnimatedCounter
                  value={m.value}
                  suffix={m.suffix}
                  prefix={m.prefix}
                  inView={metricsInView}
                />
              </div>
              <div className="landing-metric-label">{m.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="landing-statement">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          Stop fraud in
          <br />
          <span className="outline-text">seconds — not days</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="landing-statement-sub"
        >
          Infrastructure for 24/7 monitoring, sub-100ms scoring, and settlement-ready audit trails.
        </motion.p>
      </section>

      <section id="compare" ref={compareRef} className="landing-compare">
        <div className="landing-compare-inner">
          <div className="landing-compare-header">
            <span />
            <span>Legacy stack</span>
            <span className="accent-col">FraudShield</span>
          </div>
          {COMPARE_ROWS.map((row, i) => (
            <motion.div
              key={row.label}
              className="landing-compare-row"
              initial={{ opacity: 0, x: -20 }}
              animate={compareInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.06 }}
            >
              <span className="row-label">{row.label}</span>
              <span className="row-legacy">{row.legacy}</span>
              <span className="row-shield">{row.shield}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="trust" className="landing-trust">
        <h3>Built for trust</h3>
        <div className="landing-trust-grid">
          {TRUST_ITEMS.map((item) => (
            <div key={item} className="landing-trust-item">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="landing-platform">
        <motion.div
          className="landing-platform-card"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="landing-eyebrow">FraudShield assets</p>
          <h3>Live monitoring, cases, heatmaps &amp; ML explainability</h3>
          <p>
            Ensemble models (XGBoost, LSTM, GNN) with rules engine fallback — designed for banks,
            fintechs, and UPI gateways at scale.
          </p>
        </motion.div>
      </section>

      <section className="landing-final-cta">
        <h2>
          TradFi-grade security
          <br />
          with DeFi-speed decisions.
        </h2>
        <div className="landing-hero-cta">
          <Link to="/register" className="landing-btn-primary">
            Enter App
            <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="landing-btn-ghost">
            Sign in
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} FraudShield AI</span>
        <div className="landing-footer-links">
          <a href="#trust">Security</a>
          <Link to="/register">Get started</Link>
        </div>
      </footer>
    </div>
  );
}

export default About;
