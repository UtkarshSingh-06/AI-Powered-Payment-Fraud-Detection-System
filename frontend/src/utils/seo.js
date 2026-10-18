export const SITE_NAME = import.meta.env.VITE_APP_NAME || 'FraudShield AI';
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://fraudshield.app')
).replace(/\/$/, '');

export const DEFAULT_DESCRIPTION =
  'FraudShield AI detects payment fraud in real time for UPI, cards, and wallets — with ScamShield threat intelligence for analysts.';

export const PAGE_META = {
  '/': {
    title: 'FraudShield AI — Real-time Payment Fraud Detection',
    description: DEFAULT_DESCRIPTION,
    schemaType: 'WebSite'
  },
  '/about': {
    title: 'About FraudShield — AI Fraud Intelligence Platform',
    description:
      'Learn how FraudShield protects UPI and digital payments with AI risk scoring, explainability, and enterprise controls.',
    schemaType: 'AboutPage'
  },
  '/login': {
    title: 'Sign in — FraudShield AI',
    description: 'Sign in to your FraudShield account to monitor transactions and investigate fraud.',
    noIndex: true
  },
  '/register': {
    title: 'Create account — FraudShield AI',
    description: 'Register for FraudShield to start scoring payments and reviewing risk in real time.',
    noIndex: true
  },
  '/contact': {
    title: 'Contact FraudShield — Support & Partnerships',
    description: 'Contact the FraudShield team for product support, security inquiries, or partnership opportunities.',
    schemaType: 'ContactPage'
  },
  '/app/dashboard': {
    title: 'Dashboard — FraudShield',
    description: 'Overview of fraud scores, alerts, and recent payment activity.',
    noIndex: true
  },
  '/app/transactions': {
    title: 'Transactions — FraudShield',
    description: 'Browse and filter scored payment transactions.',
    noIndex: true
  },
  '/app/analytics': {
    title: 'Analytics — FraudShield',
    description: 'Fraud rate trends, risk regions, and payment analytics.',
    noIndex: true
  },
  '/app/live-monitoring': {
    title: 'Live Monitoring — FraudShield',
    description: 'Real-time stream of payment fraud decisions.',
    noIndex: true
  },
  '/app/recommendations': {
    title: 'Recommendations — FraudShield',
    description: 'Personalized security recommendations based on your payment patterns.',
    noIndex: true
  },
  '/app/cases': {
    title: 'Cases — FraudShield',
    description: 'Investigate formal fraud cases.',
    noIndex: true
  },
  '/app/alerts': {
    title: 'Alerts — FraudShield',
    description: 'High-risk transaction alert inbox for analysts.',
    noIndex: true
  },
  '/app/scamshield': {
    title: 'ScamShield — Threat Intelligence',
    description: 'Search indicators, review source evidence, and manage online fraud investigations.',
    noIndex: true
  },
  '/app/scamshield/investigations': {
    title: 'ScamShield Investigations — FraudShield',
    description: 'Manage ScamShield threat investigations.',
    noIndex: true
  },
  '/app/admin': {
    title: 'Admin Panel — FraudShield',
    description: 'Administer users, labels, and platform settings.',
    noIndex: true
  },
  '/404': {
    title: 'Page not found — FraudShield',
    description: 'The page you requested could not be found.',
    noIndex: true
  }
};

export function resolvePageMeta(pathname) {
  if (PAGE_META[pathname]) return { ...PAGE_META[pathname], path: pathname };
  if (pathname.startsWith('/app/transactions/')) {
    return {
      title: 'Transaction detail — FraudShield',
      description: 'Risk score, explainability, and decision details for a payment.',
      noIndex: true,
      path: pathname
    };
  }
  if (pathname.startsWith('/app/scamshield/indicators/')) {
    return {
      title: 'Indicator evidence — ScamShield',
      description: 'Source timeline, confidence explanation, and relationships for a threat indicator.',
      noIndex: true,
      path: pathname
    };
  }
  if (pathname.startsWith('/app/scamshield/investigations/')) {
    return {
      title: 'Investigation — ScamShield',
      description: 'Linked indicators and notes for a ScamShield investigation.',
      noIndex: true,
      path: pathname
    };
  }
  return {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    path: pathname
  };
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function breadcrumbItems(pathname) {
  const map = {
    '/app': 'App',
    '/app/dashboard': 'Dashboard',
    '/app/transactions': 'Transactions',
    '/app/analytics': 'Analytics',
    '/app/live-monitoring': 'Live Monitoring',
    '/app/recommendations': 'Recommendations',
    '/app/cases': 'Cases',
    '/app/alerts': 'Alerts',
    '/app/scamshield': 'ScamShield',
    '/app/scamshield/investigations': 'Investigations',
    '/app/admin': 'Admin',
    '/about': 'About',
    '/contact': 'Contact',
    '/login': 'Sign in',
    '/register': 'Register'
  };

  const items = [{ label: 'Home', to: '/' }];
  if (pathname === '/' || pathname === '') return items;

  const parts = pathname.split('/').filter(Boolean);
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const isLast = i === parts.length - 1;
    const label =
      map[acc] ||
      (parts[i].length > 20 ? `${parts[i].slice(0, 8)}…` : decodeURIComponent(parts[i]));
    items.push({ label, to: isLast ? undefined : acc, current: isLast });
  }
  return items;
}

export function relatedLinksFor(pathname) {
  const catalog = {
    public: [
      { to: '/about', label: 'About the platform' },
      { to: '/contact', label: 'Contact support' },
      { to: '/login', label: 'Sign in' },
      { to: '/register', label: 'Create account' }
    ],
    app: [
      { to: '/app/dashboard', label: 'Dashboard' },
      { to: '/app/transactions', label: 'Transactions' },
      { to: '/app/analytics', label: 'Analytics' },
      { to: '/app/live-monitoring', label: 'Live monitoring' },
      { to: '/app/recommendations', label: 'Recommendations' },
      { to: '/app/scamshield', label: 'ScamShield intel' },
      { to: '/contact', label: 'Contact' }
    ]
  };

  if (pathname.startsWith('/app')) {
    return catalog.app.filter((l) => l.to !== pathname).slice(0, 5);
  }
  return catalog.public.filter((l) => l.to !== pathname);
}
