/**
 * channel.js — Scraper for studio/channel pages.
 *
 * Channel pages DO NOT support ?ajax=1 — content is rendered statically.
 * Filter, period, and pagination use query params:
 *
 *   GET /channel/<slug>/?o=<order>&t=<period>&page=<n>
 *
 * Orders:  recent (default), popular, rated, discussed, downloaded, longest, watched
 * Periods: today, yesterday, week (this-week), month (this-month), year (this-year)
 *          Omit ?t to get all-time (default). Only applies to non-recent orders.
 *
 * Pagination links look like:
 *   /channel/fc2ppv/?o=popular&page=2
 *   /channel/fc2ppv/?o=popular&t=week&page=2
 */

const config  = require('../config');
const { get } = require('../utils/http');
const { parseVideoList, parsePagination } = require('./parser');
const { Errors } = require('../utils/errors');
const cheerio = require('cheerio');

const VALID_ORDERS = ['recent', 'popular', 'rated', 'discussed', 'downloaded', 'longest', 'watched'];

// period labels (API param) → URL query value (?t=)
const PERIOD_MAP = {
  'today':      'today',
  'yesterday':  'yesterday',
  'this-week':  'week',
  'this-month': 'month',
  'this-year':  'year',
  'all-time':   null,   // null = omit ?t param
};
const VALID_PERIODS = Object.keys(PERIOD_MAP);

/**
 * Parse channel info + video list from static HTML.
 */
function parseChannelPage(html) {
  const $ = cheerio.load(html);

  const name      = $('#channel h1').text().trim().replace(/\s+/g, ' ');
  const channelId = $('input[name="channel_id"]').val() || null;

  const videoCountText = $('ul.nav-tabs a[href="#videos"]').text();
  const vcMatch        = videoCountText.match(/[\d,]+/);
  const videoCount     = vcMatch ? parseInt(vcMatch[0].replace(/,/g, ''), 10) : null;

  const items      = parseVideoList($.html());
  const pagination = parsePagination($('ul.pagination').first().toString());

  return { name, channelId, videoCount, items, pagination };
}

/**
 * Scrape a channel page.
 *
 * @param {string} slug   - e.g. "fc2ppv"
 * @param {number} page   - 1-based (default 1)
 * @param {string} order  - sort order (default 'recent')
 * @param {string} period - period filter (default 'all-time', only for non-recent orders)
 */
async function scrapeChannel(slug, page = 1, order = 'recent', period = 'all-time') {
  const o         = VALID_ORDERS.includes(order) ? order : 'recent';
  const hasPeriod = o !== 'recent';
  const p         = (hasPeriod && VALID_PERIODS.includes(period)) ? period : 'all-time';

  const params = new URLSearchParams();
  if (o !== 'recent') params.set('o', o);
  const tVal = hasPeriod ? PERIOD_MAP[p] : null;
  if (tVal) params.set('t', tVal);
  if (page > 1) params.set('page', String(page));

  const qs  = params.toString();
  const url = `${config.baseUrl}/channel/${slug}/${qs ? '?' + qs : ''}`;

  const { data: html } = await get(url, { referer: `${config.baseUrl}/channel/${slug}/` });

  if (typeof html !== 'string' || html.length < 1000) {
    throw Errors.NotFound(`Channel "${slug}" tidak ditemukan`);
  }

  if (html.includes('<title>404') || html.includes('Page Not Found')) {
    throw Errors.NotFound(`Channel "${slug}" tidak ditemukan`);
  }

  const { name, channelId, videoCount, items, pagination } = parseChannelPage(html);

  if (!name) throw Errors.NotFound(`Channel "${slug}" tidak ditemukan`);
  if (items.length === 0) {
    throw Errors.NotFound(`Tidak ada video di channel "${slug}" (order: ${o}${hasPeriod ? ', period: ' + p : ''}, halaman ${page})`);
  }

  return {
    slug,
    name,
    channelId,
    videoCount,
    order: o,
    ...(hasPeriod ? { period: p } : {}),
    page,
    items,
    pagination,
  };
}

module.exports = { scrapeChannel, VALID_ORDERS, VALID_PERIODS };
