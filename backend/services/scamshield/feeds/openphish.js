/**
 * OpenPhish Community Phishing Feed adapter.
 *
 * Source: https://github.com/openphish/public_feed (feed.txt)
 * Update cadence: ~every 12 hours
 * License: Non-commercial use only (OpenPhish Terms). Set OPENPHISH_ENABLED=true
 * only if your deployment qualifies; otherwise keep disabled.
 *
 * Alternative: openphish.eu API (separate ToS; free with rate limits).
 * We never fetch the phishing URLs themselves (SSRF prevention).
 */

import { fetchText } from '../httpClient.js';
import { normalizeIndicator, NormalizationError, clampConfidence } from '../normalize.js';

export const SOURCE_ID = 'openphish_community';

export const DEFAULT_FEED_URL =
  'https://raw.githubusercontent.com/openphish/public_feed/main/feed.txt';

export function parseOpenPhishFeed(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && /^https?:\/\//i.test(l));
}

export function mapOpenPhishUrl(url, index = 0) {
  try {
    const normalized = normalizeIndicator(url, 'url');
    return {
      normalized,
      sourceId: SOURCE_ID,
      sourceRef: `openphish:${normalized.valueNormalized}`,
      observedAt: new Date().toISOString(),
      threatType: 'phishing',
      tags: ['phishing'],
      confidenceReported: clampConfidence(0.55),
      rawRecord: {
        url,
        feed: 'openphish/public_feed',
        index
      }
    };
  } catch (error) {
    if (error instanceof NormalizationError) {
      return { skip: true, reason: error.message, raw: { url } };
    }
    throw error;
  }
}

/**
 * @param {object} options
 * @param {string} [options.feedText] - inject for tests
 * @param {typeof fetch} [options.fetchImpl]
 */
export async function fetchOpenPhishRecords(options = {}) {
  if (options.feedText != null) {
    return parseOpenPhishFeed(options.feedText).map((url, i) => mapOpenPhishUrl(url, i));
  }

  const enabled =
    options.force === true ||
    String(process.env.OPENPHISH_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) {
    const err = new Error(
      'OpenPhish community feed is disabled. Set OPENPHISH_ENABLED=true only if your use complies with https://openphish.com/terms.html (non-commercial).'
    );
    err.code = 'FEED_DISABLED';
    throw err;
  }

  const feedUrl = options.feedUrl || process.env.OPENPHISH_FEED_URL || DEFAULT_FEED_URL;
  const { text } = await fetchText(feedUrl, {
    fetchImpl: options.fetchImpl,
    skipRateLimit: options.skipRateLimit,
    minIntervalMs: options.minIntervalMs || 12 * 60 * 60 * 1000
  });
  return parseOpenPhishFeed(text).map((url, i) => mapOpenPhishUrl(url, i));
}
