/**
 * Contact notification without mandatory new deps:
 * 1) CONTACT_WEBHOOK_URL / SENDGRID_API_KEY HTTP notify
 * 2) Otherwise structured log (dev / unconfigured)
 * Never logs full message bodies in production.
 */

export async function sendContactNotification(record) {
  const to = process.env.CONTACT_TO_EMAIL || process.env.SMTP_TO || '';
  const summary = {
    contactId: record.contactId,
    from: record.email,
    subject: record.subject,
    name: record.name
  };

  if (process.env.SENDGRID_API_KEY && to) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: {
            email: process.env.CONTACT_FROM_EMAIL || 'noreply@fraudshield.app',
            name: 'FraudShield Contact'
          },
          subject: `[Contact] ${record.subject}`,
          content: [
            {
              type: 'text/plain',
              value: `From: ${record.name} <${record.email}>\n\n${record.message}`
            }
          ]
        })
      });
      if (!res.ok) {
        throw new Error(`SendGrid HTTP ${res.status}`);
      }
      return { sent: true, channel: 'sendgrid' };
    } catch (error) {
      console.warn('Contact email (SendGrid) failed:', error.message);
    }
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...summary,
          message: record.message,
          createdAt: record.createdAt
        })
      });
      if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
      return { sent: true, channel: 'webhook' };
    } catch (error) {
      console.warn('Contact webhook failed:', error.message);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[contact]', summary);
  } else {
    console.info('[contact] received', summary.contactId);
  }
  return { sent: false, channel: 'log' };
}
