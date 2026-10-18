import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { appendData } from '../config/database.js';
import { sendContactNotification } from '../services/contactMail.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.CONTACT_RATE_LIMIT || 8),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many contact requests. Please try again later.' }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);
}

router.post('/', contactLimiter, async (req, res) => {
  try {
    const name = sanitize(req.body?.name, 120);
    const email = sanitize(req.body?.email, 200).toLowerCase();
    const subject = sanitize(req.body?.subject, 200) || 'FraudShield inquiry';
    const message = sanitize(req.body?.message, 5000);

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'name, email, and message are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const record = {
      contactId: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      ip: req.ip
    };

    try {
      await appendData('contacts.json', record);
    } catch {
      // File store may not list contacts yet — ignore persistence failures for UX
    }

    const notify = await sendContactNotification(record);
    res.status(201).json({
      message: 'Message received',
      notified: notify.sent,
      channel: notify.channel
    });
  } catch (error) {
    console.error('Contact form error:', error.message);
    res.status(500).json({ message: 'Failed to process contact request' });
  }
});

export default router;
