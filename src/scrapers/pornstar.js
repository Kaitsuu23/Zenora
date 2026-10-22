/**
 * pornstar.js — Scrapers for pornstar list and pornstar detail pages.
 *
 * Both pages render content statically (no ?ajax=1 support).
 *
 * ── Pornstar List  /pornstar/ ────────────────────────────────────────────────
 *   Sort orders:  recent (default), popular, rated, subscribed, videos
 *   Letter filter: all (default), a–z
 *   Pagination:   /pornstar/<order>/<page>/  or  /pornstar/<page>/  (recent)
 *
 *   Card selector: div.model > a.thumbnail
 *     - name:       a.attr('title')  or  span.model-title
 *     - url:        a.attr('href')
 *     - thumbnail:  img.attr('src')
 *     - videoCount: span.model-overlay.videos text
 *
 * ── Pornstar Detail  /pornstar/<slug>/ ───────────────────────────────────────
 *   Sort orders: recent (default), popular, rated
 *   Pagination:  ?page=<n>  (query param)
 *   Video list:  ul.videos > li  (standard parseVideoList)
 */

const config  = require('../config');
const { get } = require('../utils/http');
const { parseVideoList, parsePagination } = require('./parser');
const { Errors } = require('../utils/errors');
const cheerio = require('cheerio');
const { absUrl } = require('../utils/http');

const LIST_ORDERS   = ['recent', 'popular', 'rated', 'subscribed', 'videos'];
const DETAIL_ORDERS = ['recent', 'popular', 'rated'];
const LETTERS       = ['all', 'a','b','c','d','e','f','g','h','i','j','k','l','m',
                        'n','o','p','q','r','s','t','u','v','w','x','y','z'];

// ── Pornstar list ─────────────────────────────────────────────────────────────

/**
 * Parse pornstar cards from div.model elements.
 */
function parsePornstarList(html) {
  const $ = cheerio.load(html);
  const items = [];

  $('div.model').each((_, el) => {
    const $a   = $(el).find('a.thumbnail').first();
    const href = $a.attr('href') || '';
    const name = $a.attr('title') || $a.find('span.model-title').text().trim();

    const overlayText  = $a.find('span.model-overlay.videos').text().trim();
    const countMatch   = overlayText.match(/[\d,]+/);
    const videoCount   = countMatch ? parseInt(countMatch[0].replace(/,/g, ''), 10) : null;

    if (!name || !href) return;
    items.push({
      name,
      slug: href.replace(/^\/pornstar\//, '').replace(/\/$/, ''),
      url:  absUrl(href),
      videoCount,
    });
  });

  return items;
}

/**
 * Scrape the pornstar list page.
 *
 * @param {number} page   - 1-based (default 1)
 * @param {string} order  - sort order (default 'recent')
 * @param {string} letter - letter filter 'all'|'a'–'z' (default 'all')
 */
async function scrapePornstarList(page = 1, order = 'recent', letter = 'all') {
  const o = LIST_ORDERS.includes(order)  ? order  : 'recent';
  const l = LETTERS.includes(letter)     ? letter : 'all';

  // URL pattern:
  //  recent, all:          /pornstar/<page>/
  //  recent, letter:       /pornstar/<l>/<page>/
  //  other order, all:     /pornstar/<o>/<page>/
  //  other order, letter:  /pornstar/<l>/<o>/<page>/
  let base;
  if (o === 'recent') {
    base = l === 'all'
      ? `${config.baseUrl}/pornstar/`
      : `${config.baseUrl}/pornstar/${l}/`;
  } else {
    base = l === 'all'
      ? `${config.baseUrl}/pornstar/${o}/`
      : `${config.baseUrl}/pornstar/${l}/${o}/`;
  }

  const url = page > 1 ? `${base}${page}/` : base;

  const { data: html } = await get(url, { referer: `${config.baseUrl}/pornstar/` });

  if (typeof html !== 'string' || html.length < 1000) {
    throw Errors.NotFound('Daftar pornstar tidak tersedia');
  }

  const items = parsePornstarList(html);
  if (items.length === 0) {
    throw Errors.NotFound(`Tidak ada pornstar (order: ${o}, letter: ${l}, halaman ${page})`);
  }

  const $ = cheerio.load(html);
  const pagination = parsePagination($('ul.pagination').first().toString());

  return { order: o, letter: l, page, items, pagination };
}

// ── Pornstar detail ───────────────────────────────────────────────────────────

/**
 * Scrape a pornstar detail page (video list).
 *
 * @param {string} slug   - e.g. "maki-hojo"
 * @param {number} page   - 1-based (default 1)
 * @param {string} order  - sort order (default 'recent')
 */
async function scrapePornstarDetail(slug, page = 1, order = 'recent') {
  const o = DETAIL_ORDERS.includes(order) ? order : 'recent';

  const params = new URLSearchParams();
  if (o !== 'recent') params.set('o', o);
  if (page > 1)       params.set('page', String(page));

  const qs  = params.toString();
  const url = `${config.baseUrl}/pornstar/${slug}/${qs ? '?' + qs : ''}`;

  const { data: html } = await get(url, { referer: `${config.baseUrl}/pornstar/` });

  if (typeof html !== 'string' || html.length < 1000) {
    throw Errors.NotFound(`Pornstar "${slug}" tidak ditemukan`);
  }

  const $ = cheerio.load(html);

  if (!$('#model h1').length) {
    throw Errors.NotFound(`Pornstar "${slug}" tidak ditemukan`);
  }

  // Info
  const name    = $('#model h1').clone().find('span').remove().end().text().trim();
  const modelId = $('input[name="model_id"]').val() || null;

  const items      = parseVideoList($.html());
  const pagination = parsePagination($('ul.pagination').first().toString());

  if (items.length === 0) {
    throw Errors.NotFound(`Tidak ada video untuk pornstar "${slug}" (order: ${o}, halaman ${page})`);
  }

  return { slug, name, modelId, order: o, page, items, pagination };
}

module.exports = { scrapePornstarList, scrapePornstarDetail, LIST_ORDERS, DETAIL_ORDERS, LETTERS };
