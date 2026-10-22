/**
 * genre.js — Scrapers for the genre list and genre video listing.
 *
 * Genre list:
 *   GET /categories/?o=<order> → static HTML; parse <ul.categories> items.
 *
 * Genre by slug — URL patterns (confirmed from live site):
 *
 *  order=recent:
 *    page 1:  /<slug>/?ajax=1
 *    page N:  /<slug>/recent/<page>/?ajax=1
 *
 *  order=popular|rated (have a period sub-filter):
 *    period=all-time, page 1:  /<slug>/<order>/?ajax=1
 *    period=all-time, page N:  /<slug>/<order>/<page>/?ajax=1
 *    period=today:             /<slug>/<order>/today/?ajax=1
 *    period=yesterday:         /<slug>/<order>/yesterday/?ajax=1
 *    period=this-week:         /<slug>/<order>/week/?ajax=1
 *    period=this-month:        /<slug>/<order>/month/?ajax=1
 *    period=this-year:         /<slug>/<order>/year/?ajax=1
 *
 *  other orders (releaseday, discussed, downloaded, longest, watched):
 *    page 1:  /<slug>/<order>/?ajax=1
 *    page N:  /<slug>/<order>/<page>/?ajax=1
 */

const config = require('../config');
const { get } = require('../utils/http');
const { parseVideoList, parsePagination, parseGenreList } = require('./parser');
const { Errors } = require('../utils/errors');

// Orders that support a period sub-filter — semua order kecuali 'recent'
const PERIOD_ORDERS = ['popular', 'releaseday', 'rated', 'discussed', 'downloaded', 'longest', 'watched'];

// Valid period values and their URL path segments
const PERIOD_MAP = {
  'today':      'today',
  'yesterday':  'yesterday',
  'this-week':  'week',
  'this-month': 'month',
  'this-year':  'year',
  'all-time':   null,   // null = no sub-path (default all-time)
};

const VALID_ORDERS  = ['recent', 'popular', 'releaseday', 'rated', 'discussed', 'downloaded', 'longest', 'watched'];
const VALID_PERIODS = Object.keys(PERIOD_MAP); // only used when order supports period

// ── Genre list ────────────────────────────────────────────────────────────────

/**
 * Scrape the /categories/ page and return the genre list.
 *
 * @param {string} [order] - 'name' (default) | 'popular' | 'videos'
 */
async function scrapeGenreList(order = 'name') {
  const VALID_LIST_ORDERS = ['name', 'popular', 'videos'];
  const o = VALID_LIST_ORDERS.includes(order) ? order : 'name';

  const url = `${config.baseUrl}/categories/?o=${o}`;
  const { data: html } = await get(url, { referer: `${config.baseUrl}/categories/` });

  if (typeof html !== 'string') {
    throw Errors.Upstream('Format respons genre list tidak terduga');
  }

  const genres = parseGenreList(html);
  if (genres.length === 0) {
    throw Errors.NotFound('Daftar genre tidak tersedia');
  }

  return { order: o, genres };
}

// ── Genre videos ──────────────────────────────────────────────────────────────

/**
 * Build the AJAX URL for a genre listing.
 *
 * @param {string} base   - config.baseUrl
 * @param {string} slug
 * @param {string} order
 * @param {string|null} period - only meaningful when order is in PERIOD_ORDERS
 * @param {number} page
 */
function buildGenreUrl(base, slug, order, period, page) {
  if (order === 'recent') {
    // recent: /<slug>/ or /<slug>/recent/<page>/
    if (page <= 1) return `${base}/${slug}/?ajax=1`;
    return `${base}/${slug}/recent/${page}/?ajax=1`;
  }

  if (PERIOD_ORDERS.includes(order)) {
    const periodPath = period ? PERIOD_MAP[period] : null;

    if (periodPath) {
      // Period-scoped with pagination: /<slug>/<order>/<period>/<page>/
      if (page <= 1) return `${base}/${slug}/${order}/${periodPath}/?ajax=1`;
      return `${base}/${slug}/${order}/${periodPath}/${page}/?ajax=1`;
    }
    // all-time (default): /<slug>/<order>/ or /<slug>/<order>/<page>/
    if (page <= 1) return `${base}/${slug}/${order}/?ajax=1`;
    return `${base}/${slug}/${order}/${page}/?ajax=1`;
  }

  // Other orders: /<slug>/<order>/ or /<slug>/<order>/<page>/
  if (page <= 1) return `${base}/${slug}/${order}/?ajax=1`;
  return `${base}/${slug}/${order}/${page}/?ajax=1`;
}

/**
 * Scrape videos in a genre/category.
 *
 * @param {string} slug   - URL segment, e.g. "amateur"
 * @param {number} page   - 1-based page number (default 1)
 * @param {string} order  - sort order (default 'recent')
 * @param {string} period - period filter, only for popular/rated
 *                          'today'|'yesterday'|'this-week'|'this-month'|'this-year'|'all-time'
 *                          default 'all-time'
 */
async function scrapeGenreVideos(slug, page = 1, order = 'recent', period = 'all-time') {
  const o = VALID_ORDERS.includes(order) ? order : 'recent';

  // period is only relevant for popular/rated
  const hasPeriod = PERIOD_ORDERS.includes(o);
  const p = (hasPeriod && VALID_PERIODS.includes(period)) ? period : 'all-time';

  const url     = buildGenreUrl(config.baseUrl, slug, o, hasPeriod ? p : null, page);
  const referer = url.replace('?ajax=1', '');

  const { data } = await get(url, { ajax: true, referer });

  if (typeof data !== 'object' || data === null) {
    throw Errors.NotFound(`Genre "${slug}" tidak ditemukan`);
  }

  const items = parseVideoList(data.html || '');
  if (items.length === 0) {
    throw Errors.NotFound(`Tidak ada video di genre "${slug}" (order: ${o}${hasPeriod ? ', period: ' + p : ''}, halaman ${page})`);
  }

  const pagination = parsePagination(data.pagination || '');

  const result = {
    slug,
    order: o,
    ...(hasPeriod ? { period: p } : {}),
    page,
    items,
    pagination,
  };

  return result;
}

module.exports = { scrapeGenreList, scrapeGenreVideos, VALID_ORDERS, VALID_PERIODS, PERIOD_ORDERS };
