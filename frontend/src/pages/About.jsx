import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import BlurText from '../components/BlurText';
import {
  Shield,
  Zap,
  Eye,
  Brain,
  TrendingUp,
  Lock,
  Database,
  Globe,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Activity,
  AlertTriangle,
  Clock,
  Users,
  DollarSign,
  Sparkles,
  Code,
  Server,
  Cpu,
  Network,
  FileCheck
} from 'lucide-react';
import './About.css';

function About() {
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const howItWorksRef = useRef(null);
  const techRef = useRef(null);
  const securityRef = useRef(null);

  const [statsInView, setStatsInView] = useState(false);
  const [featuresInView, setFeaturesInView] = useState(false);
  const [howItWorksInView, setHowItWorksInView] = useState(false);
  const [techInView, setTechInView] = useState(false);
  const [securityInView, setSecurityInView] = useState(false);

  useEffect(() => {
    const observers = [];

    const createObserver = (ref, setState) => {
      if (!ref.current) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setState(true);
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.1, rootMargin: '-100px' }
      );
      observer.observe(ref.current);
      return observer;
    };

    observers.push(createObserver(statsRef, setStatsInView));
    observers.push(createObserver(featuresRef, setFeaturesInView));
    observers.push(createObserver(howItWorksRef, setHowItWorksInView));
    observers.push(createObserver(techRef, setTechInView));
    observers.push(createObserver(securityRef, setSecurityInView));

    return () => {
      observers.forEach(observer => observer && observer.disconnect());
    };
  }, []);

  return (
    <div className="about-page">
      {/* Animated Background */}
      <div className="about-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="about-nav">
        <div className="nav-container">
          <Link to="/" className="nav-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={24} />
            <span>FraudShield AI</span>
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#technology">Technology</a>
            <a href="#security">Security</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-link-btn">Sign In</Link>
            <Link to="/register" className="nav-btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="hero-tagline"
          >
            AI-POWERED UPI FRAUD PROTECTION
          </motion.div>
          <BlurText
            text="Secure Your UPI Transactions with Intelligence"
            className="hero-title"
            delay={100}
            animateBy="words"
            direction="top"
            stepDuration={0.4}
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hero-description"
          >
            Advanced AI-driven fraud detection system specifically designed for UPI payments.
            Analyzes transactions in real-time, identifying suspicious patterns and preventing fraudulent 
            activities before they impact your business. Built for India's fastest-growing payment method.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="hero-actions"
          >
            <Link to="/register" className="btn-hero-primary">
              Start Free Trial
              <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="btn-hero-secondary">
              Book a Demo
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="hero-benefits"
          >
            <div className="benefit-item">
              <CheckCircle size={18} />
              <span>14-day free trial</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={18} />
              <span>No credit card required</span>
            </div>
            <div className="benefit-item">
              <CheckCircle size={18} />
              <span>Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Statistics Section */}
      <section ref={statsRef} className="stats-section">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <BlurText
              text="India's Most Trusted UPI Security Platform"
              className="section-title"
              delay={80}
              animateBy="words"
              direction="top"
            />
            <p className="section-description">
              Designed specifically for UPI transactions, our platform ensures secure, instant payments
              while minimizing fraud risks. Trusted by merchants and consumers across India.
            </p>
          </motion.div>

          <div className="stats-grid">
            {[
              { value: '99.9%', label: 'Fraud Detection Accuracy', icon: Shield },
              { value: '<100ms', label: 'Average Response Time', icon: Zap },
              { value: '24/7', label: 'Real-time Monitoring', icon: Clock },
              { value: '$50M+', label: 'Protected Annually', icon: DollarSign },
              { value: '500K+', label: 'Transactions Daily', icon: Activity },
              { value: '98%', label: 'Customer Satisfaction', icon: Users }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={statsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="stat-card-glass"
              >
                <div className="stat-icon-wrapper">
                  <stat.icon size={32} />
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="features-section">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <BlurText
              text="Transform UPI Payment Security"
              className="section-title"
              delay={80}
              animateBy="words"
              direction="top"
            />
            <p className="section-description">
              Manage and protect UPI transactions within one unified platform.
              Real-time fraud detection for PhonePe, Google Pay, Paytm, and all UPI apps.
            </p>
          </motion.div>

          <div className="features-grid">
            {[
              {
                icon: Brain,
                title: 'AI-POWERED UPI ANALYSIS',
                description: 'Advanced machine learning algorithms specifically trained on UPI transaction patterns. Analyzes user behavior, device fingerprints, and transaction history to identify fraud with 99.9% accuracy.',
                color: 'green'
              },
              {
                icon: Zap,
                title: 'INSTANT UPI FRAUD DETECTION',
                description: 'Monitor UPI transactions in real-time as they occur. Get instant alerts and automatic blocking of suspicious UPI payments before they complete. Response time: less than 100ms.',
                color: 'green'
              },
              {
                icon: Database,
                title: 'UPI DATA INTEGRATION',
                description: 'Seamless integration with all major UPI apps and banks. Collect and route UPI transaction data to NPCI, payment gateways, and your analytics platforms in real-time.',
                color: 'green'
              },
              {
                icon: BarChart3,
                title: 'UPI ANALYTICS DASHBOARD',
                description: 'View UPI transaction performance, compare metrics across different UPI apps (PhonePe, GPay, Paytm), and track fraud trends. Comprehensive dashboards for merchants and banks.',
                color: 'green'
              },
              {
                icon: Network,
                title: 'ALL UPI APP SUPPORT',
                description: 'Protect UPI transactions across all major apps: PhonePe, Google Pay, Paytm, BHIM, Amazon Pay, WhatsApp Pay, and 300+ other UPI-enabled apps.',
                color: 'green'
              },
              {
                icon: Code,
                title: 'UPI API INTEGRATION',
                description: 'Integrate with our robust UPI fraud detection API. Built for developers working with UPI payments, designed for seamless integration with NPCI and payment gateways.',
                color: 'green'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`feature-card feature-${feature.color}`}
              >
                <div className="feature-icon">
                  <feature.icon size={40} />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" ref={howItWorksRef} className="how-it-works-section">
        <div className="section-container">
          <div className="how-it-works-content">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={howItWorksInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="how-it-works-text"
            >
              <BlurText
                text="How FraudShield AI Protects UPI Payments"
                className="section-title"
                delay={80}
                animateBy="words"
                direction="top"
              />
              <p className="section-description">
                Our multi-layered fraud detection system uses advanced AI algorithms
                specifically designed for UPI transactions. Analyzes every UPI payment across multiple risk factors in real-time.
              </p>
              <div className="process-steps">
                {[
                  { step: '01', title: 'UPI Transaction Capture', desc: 'Real-time collection of UPI transaction data from NPCI and all UPI apps (PhonePe, GPay, Paytm, etc.)' },
                  { step: '02', title: 'AI UPI Analysis', desc: 'Multi-factor risk scoring using ML models trained on Indian UPI transaction patterns' },
                  { step: '03', title: 'UPI Pattern Detection', desc: 'Identification of suspicious UPI behaviors: unusual amounts, locations, velocity, device changes' },
                  { step: '04', title: 'Instant UPI Blocking', desc: 'Automatic blocking or flagging of fraudulent UPI transactions before completion' }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    animate={howItWorksInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="process-step"
                  >
                    <div className="step-number">{item.step}</div>
                    <div className="step-content">
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={howItWorksInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="how-it-works-visual"
            >
              <div className="visual-card glass-card">
                <div className="visual-title">UPI Transaction Overview '24</div>
                <div className="visual-stats">
                  {[
                    { channel: 'PhonePe', count: '234,206', percentage: 85 },
                    { channel: 'Google Pay', count: '189,364', percentage: 75 },
                    { channel: 'Paytm', count: '156,140', percentage: 72 },
                    { channel: 'Other UPI Apps', count: '98,542', percentage: 60 }
                  ].map((item, index) => (
                    <div key={index} className="visual-stat-item">
                      <div className="visual-stat-header">
                        <span>{item.channel}</span>
                        <span className="visual-stat-count">{item.count}</span>
                      </div>
                      <div className="visual-stat-bar">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={howItWorksInView ? { width: `${item.percentage}%` } : {}}
                          transition={{ duration: 1, delay: 0.5 + index * 0.2 }}
                          className="visual-stat-fill"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section id="technology" ref={techRef} className="tech-section">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={techInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <BlurText
              text="Powered by Cutting-Edge Technology"
              className="section-title"
              delay={80}
              animateBy="words"
              direction="top"
            />
            <p className="section-description">
              Built on modern, scalable infrastructure to ensure reliability, performance, and security.
            </p>
          </motion.div>

          <div className="tech-grid">
            {[
              { name: 'React 18', category: 'Frontend', icon: Code },
              { name: 'Node.js', category: 'Backend', icon: Server },
              { name: 'Machine Learning', category: 'AI Engine', icon: Brain },
              { name: 'NPCI Integration', category: 'UPI Gateway', icon: Network },
              { name: 'PostgreSQL', category: 'Database', icon: Database },
              { name: 'AWS Cloud', category: 'Infrastructure', icon: Globe }
            ].map((tech, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={techInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="tech-card"
              >
                <div className="tech-icon">
                  <tech.icon size={32} />
                </div>
                <div className="tech-category">{tech.category}</div>
                <div className="tech-name">{tech.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" ref={securityRef} className="security-section">
        <div className="section-container">
          <div className="security-content">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={securityInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="security-text"
            >
              <BlurText
                text="UPI Security You Can Trust"
                className="section-title"
                delay={80}
                animateBy="words"
                direction="top"
              />
              <p className="section-description">
                As India's leading UPI fraud detection platform, we understand the importance of keeping
                your UPI transactions secure. We implement industry-leading security measures
                compliant with RBI guidelines and NPCI standards to protect every UPI payment.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={securityInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="security-badges"
            >
              {[
                { icon: Lock, title: 'RBI Compliant', desc: 'Full compliance with Reserve Bank of India regulations for UPI transactions' },
                { icon: Shield, title: 'NPCI Certified', desc: 'Certified partner with National Payments Corporation of India' },
                { icon: FileCheck, title: 'ISO 27001', desc: 'Information security management certified for financial data' }
              ].map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={securityInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="security-badge"
                >
                  <div className="badge-icon">
                    <badge.icon size={40} />
                  </div>
                  <h4>{badge.title}</h4>
                  <p>{badge.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="cta-content"
          >
              <BlurText
                text="Ready to Secure Your UPI Payments?"
                className="cta-title"
                delay={80}
                animateBy="words"
                direction="top"
              />
              <p className="cta-description">
                Join thousands of merchants and businesses already using FraudShield AI to protect their UPI transactions.
                Secure PhonePe, Google Pay, Paytm, and all UPI payments. Start your free trial today.
              </p>
            <div className="cta-actions">
              <Link to="/register" className="btn-cta-primary">
                Start Free Trial
                <ArrowRight size={20} />
              </Link>
              <Link to="/login" className="btn-cta-secondary">
                Contact Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default About;
