/**
 * browse.js — Generic scraper for top-level browse pages.
 *
 * All pages follow the same pattern:
 *   /<type>/                 → all-time, page 1
 *   /<type>/<period>/        → period filter, page 1
 *   /<type>/?ajax=browse_videos&page=<n>             → all-time, page N
 *   /<type>/<period>/?ajax=browse_videos&page=<n>    → period, page N
 *
 * Supported types:
 *   recent, popular, releaseday, rated, discussed, downloaded, longest, watched
 *
 * Periods (all types support all periods):
 *   all-time (default), today, yesterday, this-week, this-month, this-year
 *
 * Note: recent and popular already have dedicated endpoints
 * (/api/recent and /api/popular). This scraper powers the rest but
 * also works for all types including those two.
 */

const config = require('../config');
const { get } = require('../utils/http');
const { parseVideoList, parsePagination } = require('./parser');
const { Errors } = require('../utils/errors');

const VALID_TYPES = ['recent', 'popular', 'releaseday', 'rated', 'discussed', 'downloaded', 'longest', 'watched'];

// Types yang TIDAK support period filter
const NO_PERIOD_TYPES = ['recent'];

// period label (API param) → URL path segment
const PERIOD_MAP = {
  'today':      'today',
  'yesterday':  'yesterday',
  'this-week':  'week',
  'this-month': 'month',
  'this-year':  'year',
  'all-time':   '',
};
const VALID_PERIODS = Object.keys(PERIOD_MAP);

/**
 * @param {string} type   - browse type (e.g. "releaseday")
 * @param {number} page   - 1-based page number (default 1)
 * @param {string} period - period filter (default 'all-time', ignored for 'recent')
 */
async function scrapeBrowse(type, page = 1, period = 'all-time') {
  const t = VALID_TYPES.includes(type) ? type : null;
  if (!t) throw Errors.BadParam(`Type tidak valid. Pilihan: ${VALID_TYPES.join(', ')}`);

  // recent tidak support period — selalu all-time (tidak ada sub-path)
  const supportsPeriod = !NO_PERIOD_TYPES.includes(t);
  const p    = (supportsPeriod && VALID_PERIODS.includes(period)) ? period : 'all-time';
  const slug = supportsPeriod ? PERIOD_MAP[p] : '';

  const base = slug
    ? `${config.baseUrl}/${t}/${slug}/`
    : `${config.baseUrl}/${t}/`;

  const url = `${base}?ajax=browse_videos&page=${page}`;

  const { data } = await get(url, { ajax: true, referer: base });

  if (typeof data !== 'object' || !data.html) {
    throw Errors.Upstream(`Format respons /${t}/ tidak terduga`);
  }

  const items = parseVideoList(data.html);
  if (items.length === 0) {
    throw Errors.NotFound(`Tidak ada video di /${t}/ halaman ${page}`);
  }

  const pagination = parsePagination(data.pagination || '');

  const result = { type: t, ...(supportsPeriod ? { period: p } : {}), page, items, pagination };
  return result;
}

module.exports = { scrapeBrowse, VALID_TYPES, VALID_PERIODS, NO_PERIOD_TYPES };
