/**
 * Input validation helpers used by the route layer.
 *
 * Each helper returns an error string if the input is invalid,
 * or undefined when the input passes.
 */

const { Errors } = require('./errors');

/**
 * Ensure a search query is present and not just whitespace.
 */
function requireQuery(q) {
  if (!q || typeof q !== 'string' || !q.trim()) {
    throw Errors.BadParam('Parameter "q" wajib diisi');
  }
  return q.trim();
}

/**
 * Ensure a URL is an absolute HTTPS URL pointing to an allowed host.
 *
 * We only accept URLs from the configured base domain so that the API
 * cannot be used as an open HTTP proxy.
 *
 * @param {string} rawUrl
 * @param {string} allowedHost - hostname from config (e.g. "javhd.today")
 */
function requireVideoUrl(rawUrl, allowedHost) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw Errors.BadParam('Parameter "url" wajib diisi');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw Errors.BadParam(`URL tidak valid: "${rawUrl}"`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw Errors.BadParam('URL harus menggunakan protokol http atau https');
  }

  // Accept any subdomain of the allowed host.
  const host = parsed.hostname.toLowerCase();
  const base = allowedHost.toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (host !== base && !host.endsWith('.' + base)) {
    throw Errors.BadParam(`URL harus mengarah ke domain ${base}`);
  }

  return parsed.href;
}

/**
 * Parse and validate a page number query parameter.
 * Returns 1 when the param is absent.
 */
function parsePage(pageParam) {
  if (!pageParam) return 1;
  const n = parseInt(pageParam, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw Errors.BadParam('Parameter "page" harus berupa bilangan bulat positif');
  }
  return n;
}

module.exports = { requireQuery, requireVideoUrl, parsePage };
