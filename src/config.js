/**
 * Centralised configuration loader.
 *
 * Reads from process.env (populated by dotenv) and exposes a single,
 * validated config object to the rest of the app. Keeping every env
 * read here means the other modules never touch process.env directly
 * and we can grep for config keys in one place.
 */

require('dotenv').config();

const env = process.env;

function toBool(v, fallback = false) {
  if (v === undefined || v === null || v === '') return fallback;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  port: toInt(env.PORT, 3000),
  baseUrl: (env.BASE_URL || 'https://javhd.today').replace(/\/+$/, ''),
  corsOrigin: env.CORS_ORIGIN || '*',
  requestTimeout: toInt(env.REQUEST_TIMEOUT, 20000),
  maxRetries: toInt(env.MAX_RETRIES, 2),
  // javhd.today sits behind Cloudflare and serves a self-signed cert in
  // some regions, so we allow relaxing TLS by default.
  rejectUnauthorized: !toBool(env.NODE_TLS_REJECT_UNAUTHORIZED, true),
};

// Basic URL validation — fail fast at boot if BASE_URL is nonsense.
try {
  // eslint-disable-next-line no-new
  new URL(config.baseUrl);
} catch {
  throw new Error(`Invalid BASE_URL "${config.baseUrl}". Set a valid URL in .env.`);
}

module.exports = config;
