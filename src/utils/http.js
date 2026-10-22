/**
 * Shared Axios HTTP client.
 *
 * javhd.today is behind Cloudflare and rejects any request that doesn't
 * look like a real browser, so we send a full set of browser headers
 * (User-Agent, Sec-Ch-Ua, Sec-Fetch-*, Accept). The site also uses a
 * self-signed cert chain in some regions; we optionally relax TLS via
 * config.
 *
 * The client adds bounded retry behaviour so a transient network blip
 * doesn't surface as a 502 to the API caller.
 */

const axios = require('axios');
const https = require('https');
const { Errors } = require('./errors');
const config = require('../config');

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const AJAX_HEADERS = {
  ...BROWSER_HEADERS,
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'X-Requested-With': 'XMLHttpRequest',
};

const httpsAgent = new https.Agent({ rejectUnauthorized: config.rejectUnauthorized });

const instance = axios.create({
  timeout: config.requestTimeout,
  httpsAgent,
  maxRedirects: 5,
});

/**
 * Build an absolute URL against the configured BASE_URL.
 * @param {string} path - absolute ("/foo") or relative path.
 */
function absUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('//')) return 'https:' + path;
  return config.baseUrl + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Sleep helper used by the retry loop.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Perform a GET with bounded retry. Throws ApiError on failure.
 *
 * @param {string} url      - absolute or path-relative URL.
 * @param {object} [opts]
 * @param {boolean} [opts.ajax] - if true, send AJAX (X-Requested-With) headers.
 * @param {string} [opts.referer] - optional Referer header.
 * @param {number} [opts.retries] - override MAX_RETRIES for this call.
 */
async function get(url, opts = {}) {
  const retries = opts.retries ?? config.maxRetries;
  const headers = opts.ajax
    ? { ...AJAX_HEADERS, ...(opts.referer ? { Referer: opts.referer } : {}) }
    : { ...BROWSER_HEADERS, ...(opts.referer ? { Referer: opts.referer } : {}) };

  const target = absUrl(url);

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, status } = await instance.get(target, { headers });
      return { data, status };
    } catch (err) {
      lastErr = err;
      // Don't retry on 4xx that aren't 429 — these are deterministic failures.
      if (err.response && err.response.status >= 400 && err.response.status < 500 && err.response.status !== 429) {
        break;
      }
      if (attempt < retries) {
        const backoff = 300 * Math.pow(2, attempt);
        await sleep(backoff);
      }
    }
  }

  // Translate the failure to an ApiError so the error handler can map it.
  if (lastErr?.response?.status === 429) throw Errors.TooMany('Target website sedang rate-limit');
  if (lastErr?.response?.status === 404) throw Errors.NotFound('Halaman target tidak ditemukan');
  if (lastErr?.code === 'ECONNABORTED' || lastErr?.code === 'ETIMEDOUT')
    throw Errors.Upstream('Target website timeout');
  throw Errors.Upstream(`Target website gagal diakses (${lastErr?.code || lastErr?.response?.status || 'unknown'})`);
}

module.exports = { get, absUrl, instance, BROWSER_HEADERS, AJAX_HEADERS };
