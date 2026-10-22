/**
 * tag.js — Scraper for tag pages.
 *
 * URL patterns:
 *   page 1:  /tag/<slug>/?ajax=1
 *   page N:  /tag/<slug>/<page>/?ajax=1   (from pagination href)
 *
 * No order/period filter on tag pages.
 *
 * Response: JSON { html, pagination, total }
 */

const config = require('../config');
const { get } = require('../utils/http');
const { parseVideoList, parsePagination } = require('./parser');
const { Errors } = require('../utils/errors');

async function scrapeTag(slug, page = 1) {
  const url = page <= 1
    ? `${config.baseUrl}/tag/${slug}/?ajax=1`
    : `${config.baseUrl}/tag/${slug}/${page}/?ajax=1`;

  const { data } = await get(url, {
    ajax: true,
    referer: `${config.baseUrl}/tag/${slug}/`,
  });

  if (typeof data !== 'object' || data === null) {
    throw Errors.NotFound(`Tag "${slug}" tidak ditemukan`);
  }

  const items = parseVideoList(data.html || '');
  if (items.length === 0) {
    throw Errors.NotFound(`Tidak ada video untuk tag "${slug}" halaman ${page}`);
  }

  const pagination = parsePagination(data.pagination || '');

  return { slug, page, total: data.total || items.length, items, pagination };
}

module.exports = { scrapeTag };
