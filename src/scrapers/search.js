/**
 * search.js — Scraper for search results.
 *
 * URL pattern:
 *   GET /search/video/?s=<q>&o=<order>&t=<period>&ajax=1&page=<n>
 *
 * Orders:  relevance, recent (default), popular, rated, discussed, downloaded
 * Periods: today, yesterday, week (this-week), month (this-month), year (this-year)
 *          Only applies when order is 'popular', 'rated', 'discussed', or 'downloaded'.
 *          'relevance' and 'recent' do NOT support period.
 *
 * Response: JSON { html, pagination, ads, total }
 */

const config = require('../config');
const { get } = require('../utils/http');
const { parseVideoList, parsePagination } = require('./parser');
const { Errors } = require('../utils/errors');

const VALID_ORDERS = ['relevance', 'recent', 'popular', 'rated', 'discussed', 'downloaded'];

// Orders yang support period filter
const PERIOD_ORDERS = ['popular', 'rated', 'discussed', 'downloaded'];

// period label (API param) → URL query value (?t=)
const PERIOD_MAP = {
  'today':      'today',
  'yesterday':  'yesterday',
  'this-week':  'week',
  'this-month': 'month',
  'this-year':  'year',
  'all-time':   null,
};
const VALID_PERIODS = Object.keys(PERIOD_MAP);

/**
 * @param {string} query  - search keyword
 * @param {number} page   - 1-based page number (default 1)
 * @param {string} order  - sort order (default 'recent')
 * @param {string} period - period filter (default 'all-time', only for popular/rated/discussed/downloaded)
 */
async function scrapeSearch(query, page = 1, order = 'recent', period = 'all-time') {
  const o = VALID_ORDERS.includes(order) ? order : 'recent';

  const hasPeriod = PERIOD_ORDERS.includes(o);
  const p = (hasPeriod && VALID_PERIODS.includes(period)) ? period : 'all-time';

  const params = new URLSearchParams({ s: query, o, ajax: '1', page: String(page) });
  const tVal = hasPeriod ? PERIOD_MAP[p] : null;
  if (tVal) params.set('t', tVal);

  const url = `${config.baseUrl}/search/video/?${params.toString()}`;

  const { data } = await get(url, {
    ajax: true,
    referer: `${config.baseUrl}/search/video/?s=${encodeURIComponent(query)}`,
  });

  if (typeof data !== 'object' || data === null) {
    throw Errors.Upstream('Format respons search tidak terduga');
  }

  const items = parseVideoList(data.html || '');
  if (items.length === 0) {
    throw Errors.NotFound(`Tidak ada hasil untuk "${query}"`);
  }

  const pagination = parsePagination(data.pagination || '');

  // period di atas, sebelum page
  const result = {
    query,
    order: o,
    ...(hasPeriod ? { period: p } : {}),
    page,
    total: data.total || items.length,
    items,
    pagination,
  };

  return result;
}

module.exports = { scrapeSearch, VALID_ORDERS, VALID_PERIODS, PERIOD_ORDERS };
