import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Send } from 'lucide-react';
import api from '../services/api';
import PageMeta from '../components/PageMeta';
import RelatedLinks from '../components/RelatedLinks';
import { useToast } from '../context/ToastContext';
import { trackEvent } from '../utils/analytics';
import './Contact.css';

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Name, email, and message are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || 'FraudShield inquiry',
        message: form.message.trim()
      });
      trackEvent('contact_submit', { hasSubject: Boolean(form.subject.trim()) });
      toast.success('Message sent. We will get back to you soon.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to send message. Try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="contact-page">
      <PageMeta />
      <div className="fs-ambient-bg" aria-hidden />
      <header className="contact-nav">
        <Link to="/" className="contact-brand">
          <Shield size={20} /> FraudShield
        </Link>
        <div className="contact-nav-links">
          <Link to="/about">About</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </header>

      <main className="contact-main">
        <header className="fs-page-header">
          <p className="fs-eyebrow">Support</p>
          <h1>Contact us</h1>
          <p>Product questions, security reports, and partnership inquiries.</p>
        </header>

        <form className="contact-form fs-panel fs-panel--pad" onSubmit={onSubmit} noValidate>
          <label>
            Name
            <input type="text" value={form.name} onChange={update('name')} maxLength={120} required autoComplete="name" />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={update('email')} maxLength={200} required autoComplete="email" />
          </label>
          <label>
            Subject
            <input type="text" value={form.subject} onChange={update('subject')} maxLength={200} autoComplete="off" />
          </label>
          <label>
            Message
            <textarea value={form.message} onChange={update('message')} maxLength={5000} rows={6} required />
          </label>
          <button type="submit" className="fs-btn-pill fs-btn-pill--white" disabled={submitting}>
            <Send size={16} /> {submitting ? 'Sending…' : 'Send message'}
          </button>
        </form>

        <RelatedLinks />
      </main>
    </div>
  );
}
