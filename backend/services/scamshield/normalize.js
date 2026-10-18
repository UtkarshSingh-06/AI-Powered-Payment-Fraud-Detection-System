/**
 * Indicator normalization for ScamShield.
 * All external feed data is treated as untrusted.
 * Never fetches arbitrary URLs (SSRF prevention).
 */

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;
const IPV6_RE = /^\[?[0-9a-fA-F:]+\]?$/;
const HASH_MD5_RE = /^[a-fA-F0-9]{32}$/;
const HASH_SHA1_RE = /^[a-fA-F0-9]{40}$/;
const HASH_SHA256_RE = /^[a-fA-F0-9]{64}$/;

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal'
]);

export class NormalizationError extends Error {
  constructor(message, code = 'INVALID_INDICATOR') {
    super(message);
    this.name = 'NormalizationError';
    this.code = code;
  }
}

function isPrivateOrReservedIp(ip) {
  if (IPV4_RE.test(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe80')) return true;
  return false;
}

function stripDefaultPort(hostname, protocol) {
  // hostname from URL already excludes port in most cases; keep as-is
  return hostname.toLowerCase();
}

/**
 * Normalize a URL without fetching it.
 * Rejects credentials, private IPs, and non-http(s) schemes.
 */
export function normalizeUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new NormalizationError('URL must be a non-empty string');
  }
  const trimmed = raw.trim();
  if (trimmed.length > 2048) {
    throw new NormalizationError('URL exceeds maximum length', 'URL_TOO_LONG');
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new NormalizationError('URL contains control characters', 'MALICIOUS_INPUT');
  }

  let parsed;
  try {
    parsed = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`);
  } catch {
    throw new NormalizationError('Malformed URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new NormalizationError('Only http/https URLs are accepted', 'UNSUPPORTED_SCHEME');
  }
  if (parsed.username || parsed.password) {
    throw new NormalizationError('URLs with credentials are rejected', 'CREDENTIALS_FORBIDDEN');
  }

  const host = stripDefaultPort(parsed.hostname, parsed.protocol);
  if (!host || BLOCKED_HOSTS.has(host)) {
    throw new NormalizationError('Blocked or empty host', 'BLOCKED_HOST');
  }
  if (IPV4_RE.test(host) || (host.includes(':') && IPV6_RE.test(host))) {
    if (isPrivateOrReservedIp(host)) {
      throw new NormalizationError('Private/reserved IP hosts are rejected', 'PRIVATE_IP');
    }
  }

  parsed.hash = '';
  parsed.username = '';
  parsed.password = '';
  // Normalize path: collapse empty path to /
  if (!parsed.pathname) parsed.pathname = '/';
  // Lowercase host; keep path case (IOC fidelity) but trim trailing slash except root
  const path =
    parsed.pathname.length > 1 && parsed.pathname.endsWith('/')
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;
  parsed.pathname = path;
  parsed.hostname = host;

  const valueNormalized = parsed.toString();
  return {
    indicatorType: 'url',
    valueRaw: trimmed,
    valueNormalized,
    derivedDomain: host.startsWith('[') ? host.slice(1, -1) : host
  };
}

export function normalizeDomain(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new NormalizationError('Domain must be a non-empty string');
  }
  let host = raw.trim().toLowerCase();
  if (host.startsWith('*.')) host = host.slice(2);
  host = host.replace(/\.$/, '');
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname.toLowerCase();
    } catch {
      throw new NormalizationError('Malformed domain');
    }
  }
  if (host.includes('/') || host.includes(' ') || host.includes('@')) {
    throw new NormalizationError('Invalid domain characters');
  }
  if (host.length > 253) {
    throw new NormalizationError('Domain exceeds maximum length');
  }
  if (BLOCKED_HOSTS.has(host) || isPrivateOrReservedIp(host)) {
    throw new NormalizationError('Blocked or private domain/host');
  }
  if (!/^[a-z0-9._-]+$/.test(host) && !IPV4_RE.test(host)) {
    // Allow IDN punycode (xn--) and dots
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(host)) {
      throw new NormalizationError('Invalid domain format');
    }
  }
  return {
    indicatorType: 'domain',
    valueRaw: raw.trim(),
    valueNormalized: host,
    derivedDomain: host
  };
}

export function normalizeIp(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new NormalizationError('IP must be a non-empty string');
  }
  const ip = raw.trim().replace(/^\[|\]$/g, '');
  if (!IPV4_RE.test(ip) && !/^[0-9a-fA-F:]+$/.test(ip)) {
    throw new NormalizationError('Invalid IP address');
  }
  if (isPrivateOrReservedIp(ip)) {
    throw new NormalizationError('Private/reserved IPs are rejected', 'PRIVATE_IP');
  }
  return {
    indicatorType: 'ip',
    valueRaw: raw.trim(),
    valueNormalized: ip.toLowerCase()
  };
}

export function normalizeHash(raw, hintedType = null) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new NormalizationError('Hash must be a non-empty string');
  }
  const hex = raw.trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(hex)) {
    throw new NormalizationError('Hash must be hexadecimal');
  }
  let indicatorType = hintedType;
  if (!indicatorType) {
    if (HASH_MD5_RE.test(hex)) indicatorType = 'hash_md5';
    else if (HASH_SHA1_RE.test(hex)) indicatorType = 'hash_sha1';
    else if (HASH_SHA256_RE.test(hex)) indicatorType = 'hash_sha256';
    else throw new NormalizationError('Unsupported hash length');
  }
  const expected = {
    hash_md5: 32,
    hash_sha1: 40,
    hash_sha256: 64
  }[indicatorType];
  if (!expected || hex.length !== expected) {
    throw new NormalizationError(`Expected ${indicatorType} length ${expected}`);
  }
  return {
    indicatorType,
    valueRaw: raw.trim(),
    valueNormalized: hex
  };
}

/**
 * Auto-detect indicator type and normalize.
 * @param {string} value
 * @param {string|null} typeHint
 */
export function normalizeIndicator(value, typeHint = null) {
  const hint = typeHint ? String(typeHint).toLowerCase() : null;
  if (hint === 'url' || (!hint && typeof value === 'string' && /https?:\/\//i.test(value))) {
    return normalizeUrl(value);
  }
  if (hint === 'domain') return normalizeDomain(value);
  if (hint === 'ip') return normalizeIp(value);
  if (hint && hint.startsWith('hash')) return normalizeHash(value, hint);
  if (typeof value === 'string') {
    const v = value.trim();
    if (HASH_SHA256_RE.test(v) || HASH_SHA1_RE.test(v) || HASH_MD5_RE.test(v)) {
      return normalizeHash(v);
    }
    if (IPV4_RE.test(v)) return normalizeIp(v);
    if (v.includes('/') || v.includes('?') || v.includes(':')) {
      return normalizeUrl(v);
    }
    return normalizeDomain(v);
  }
  throw new NormalizationError('Unable to normalize indicator');
}

export function extractDomainFromNormalized(normalized) {
  if (normalized.derivedDomain) return normalized.derivedDomain;
  if (normalized.indicatorType === 'domain') return normalized.valueNormalized;
  if (normalized.indicatorType === 'url') {
    try {
      return new URL(normalized.valueNormalized).hostname;
    } catch {
      return null;
    }
  }
  return null;
}

export function clampConfidence(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, Math.round(n * 1000) / 1000));
}
