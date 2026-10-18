/**
 * Lightweight event tracking. Fires only after analytics cookie consent.
 * Pluggable: set VITE_ANALYTICS_ENDPOINT for a custom collector.
 */

const CONSENT_KEY = 'fs_cookie_consent';
const QUEUE_KEY = 'fs_analytics_queue';

export function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setConsent(partial) {
  const next = {
    necessary: true,
    analytics: Boolean(partial?.analytics),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('fs:consent', { detail: next }));
  if (next.analytics) flushQueue();
  return next;
}

export function hasAnalyticsConsent() {
  return Boolean(getConsent()?.analytics);
}

function enqueue(event) {
  try {
    const queue = JSON.parse(sessionStorage.getItem(QUEUE_KEY) || '[]');
    queue.push(event);
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch {
    /* ignore */
  }
}

async function send(event) {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
        credentials: 'omit'
      });
      return;
    } catch {
      /* fall through to console in dev */
    }
  }
  if (import.meta.env.DEV) {
    console.info('[analytics]', event.name, event);
  }
}

function flushQueue() {
  if (!hasAnalyticsConsent()) return;
  try {
    const queue = JSON.parse(sessionStorage.getItem(QUEUE_KEY) || '[]');
    sessionStorage.removeItem(QUEUE_KEY);
    queue.forEach((event) => send(event));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [props]
 */
export function trackEvent(name, props = {}) {
  const event = {
    name,
    props,
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ts: new Date().toISOString(),
    app: import.meta.env.VITE_APP_NAME || 'FraudShield'
  };

  if (!hasAnalyticsConsent()) {
    enqueue(event);
    return;
  }
  send(event);
}

export function trackPageView(path) {
  trackEvent('page_view', { path });
}
