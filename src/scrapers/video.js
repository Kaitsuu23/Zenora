/**
 * video.js — Scraper for individual video detail pages.
 *
 * Target:
 *   GET /<id>/<slug>/      → static HTML (parsed with Cheerio)
 *   GET /<id>/<slug>/?ajax=related   → JSON { html, total }
 */

const config = require('../config');
const { get } = require('../utils/http');
const { parseVideoDetail, parseVideoList } = require('./parser');
const { Errors } = require('../utils/errors');

/**
 * Fetch and parse a video detail page.
 *
 * @param {string} url - absolute URL of the video page (must belong to BASE_URL host)
 * @returns {object} structured video detail
 */
async function scrapeVideoDetail(url) {
  const { data: html, status } = await get(url, { referer: config.baseUrl + '/' });

  if (status === 404 || (typeof html === 'string' && html.length < 1000)) {
    throw Errors.NotFound('Video tidak ditemukan');
  }

  const detail = parseVideoDetail(html);

  if (!detail.title) {
    throw Errors.NotFound('Gagal mengekstrak data video — halaman mungkin tidak valid');
  }

  return detail;
}

/**
 * Fetch related videos for a given video URL.
 *
 * @param {string} pageUrl - absolute URL of the video page
 */
async function scrapeRelated(pageUrl) {
  // Ensure URL doesn't already have a trailing "?"
  const target = pageUrl.replace(/\/*$/, '/') + '?ajax=related';

  const { data } = await get(target, {
    ajax: true,
    referer: pageUrl,
  });

  if (typeof data !== 'object' || !data.html) return { total: 0, items: [] };

  const items = parseVideoList(data.html);
  return { total: data.total || items.length, items };
}

module.exports = { scrapeVideoDetail, scrapeRelated };
