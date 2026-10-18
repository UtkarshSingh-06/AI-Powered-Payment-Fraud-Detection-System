/**
 * Safe HTTP client for threat feed ingestion.
 * Timeouts, retries, rate limiting. Does not follow redirects to private IPs.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MIN_INTERVAL_MS = 5 * 60 * 1000; // abuse.ch fair use: ≥5 minutes

const lastFetchByHost = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostKey(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * @param {string} url
 * @param {object} options
 * @param {number} [options.timeoutMs]
 * @param {number} [options.maxRetries]
 * @param {number} [options.minIntervalMs]
 * @param {Record<string,string>} [options.headers]
 * @param {typeof fetch} [options.fetchImpl] - inject for tests
 * @param {boolean} [options.skipRateLimit] - for tests
 */
export async function fetchText(url, options = {}) {
  const {
    timeoutMs = Number(process.env.SCAMSHIELD_FEED_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    maxRetries = Number(process.env.SCAMSHIELD_FEED_MAX_RETRIES) || DEFAULT_MAX_RETRIES,
    minIntervalMs =
      Number(process.env.SCAMSHIELD_FEED_MIN_INTERVAL_MS) || DEFAULT_MIN_INTERVAL_MS,
    headers = {},
    fetchImpl = globalThis.fetch,
    skipRateLimit = false
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available');
  }

  const key = hostKey(url);
  if (!skipRateLimit) {
    const last = lastFetchByHost.get(key) || 0;
    const wait = minIntervalMs - (Date.now() - last);
    if (wait > 0) {
      const err = new Error(
        `Rate limited: wait ${Math.ceil(wait / 1000)}s before fetching ${key} again`
      );
      err.code = 'RATE_LIMITED';
      err.retryAfterMs = wait;
      throw err;
    }
  }

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'text/csv, text/plain, application/json, */*',
          'User-Agent': 'ScamShield/1.0 (+threat-intel-research; fair-use)',
          ...headers
        },
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after') || 60) * 1000;
        lastError = Object.assign(new Error('Feed returned 429 Too Many Requests'), {
          code: 'RATE_LIMITED',
          status: 429,
          retryAfterMs: retryAfter
        });
        await sleep(Math.min(retryAfter, 30_000));
        continue;
      }

      if (!res.ok) {
        lastError = Object.assign(new Error(`Feed HTTP ${res.status}`), {
          code: 'FEED_HTTP_ERROR',
          status: res.status
        });
        if (res.status >= 500 && attempt < maxRetries) {
          await sleep(2 ** attempt * 500);
          continue;
        }
        throw lastError;
      }

      const text = await res.text();
      if (!skipRateLimit) {
        lastFetchByHost.set(key, Date.now());
      }
      return { text, status: res.status, url };
    } catch (error) {
      clearTimeout(timer);
      if (error.code === 'RATE_LIMITED' || error.code === 'FEED_HTTP_ERROR') {
        throw error;
      }
      lastError = error;
      if (error.name === 'AbortError') {
        lastError = Object.assign(new Error(`Feed request timed out after ${timeoutMs}ms`), {
          code: 'TIMEOUT'
        });
      }
      if (attempt < maxRetries) {
        await sleep(2 ** attempt * 500);
        continue;
      }
    }
  }
  throw lastError || new Error('Feed fetch failed');
}

/** Reset rate-limit state (tests only). */
export function resetRateLimitState() {
  lastFetchByHost.clear();
}
