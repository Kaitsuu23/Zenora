/**
 * home.js — Scraper for the homepage sections.
 *
 * Setiap section di homepage javhd.today punya AJAX endpoint berbeda:
 *
 *  - /recent/ dan /releaseday/ pakai:  ?ajax=browse_videos&page=1
 *  - Semua slug category lainnya pakai: /<slug>/?ajax=1
 *  - topmostsearch (tidak punya slug halaman sendiri): ?ajax=fp_section&s=topmostsearch
 *
 * Urutan dan label sesuai tampilan asli website.
 */

const config = require('../config');
const { get } = require('../utils/http');
const { parseVideoList } = require('./parser');
const { Errors } = require('../utils/errors');

// prettier-ignore
const SECTIONS = [
  { key: 'recent',        label: 'Jav Uploaded Today',    type: 'browse',   slug: 'recent',           limit: 18, seeAll: '/api/browse/recent'        },
  { key: 'engsub',        label: 'Jav English Sub',       type: 'category', slug: 'jav-sub',          limit: 6,  seeAll: '/api/genre/jav-sub'        },
  { key: 'topmostsearch', label: 'Top most searched Jav', type: 'fp',       slug: 'topmostsearch',    limit: 6,  seeAll: '/api/genre/top-most-searched-jav-movies-on-the-internet' },
  { key: 'amateur',       label: 'Mom Fuck Son',          type: 'category', slug: 'mother',           limit: 6,  seeAll: '/api/genre/mother'         },
  { key: 'beautifulgirl', label: 'Beautiful Girl',        type: 'category', slug: 'beautiful-girl',   limit: 6,  seeAll: '/api/genre/beautiful-girl' },
  { key: 'uncensored',    label: 'Uncensored leak',       type: 'category', slug: 'uncensored-jav',   limit: 6,  seeAll: '/api/genre/uncensored-jav' },
  { key: 'bigtit',        label: 'Big Tits Jav',          type: 'category', slug: 'big-tits',         limit: 6,  seeAll: '/api/genre/big-tits'       },
  { key: 'creampie',      label: 'Creampie Jav',          type: 'category', slug: 'creampie',         limit: 6,  seeAll: '/api/genre/creampie'       },
  { key: 'debut',         label: 'Debut Production',      type: 'category', slug: 'debut-production', limit: 6,  seeAll: '/api/genre/debut-production' },
  { key: 'featured',      label: 'New Releaseday',        type: 'browse',   slug: 'releaseday',       limit: 6,  seeAll: '/api/browse/releaseday'    },
];

/**
 * Fetch a single section. Strategy depends on section type:
 *
 *  'browse'   — GET /<slug>/?ajax=browse_videos&page=1
 *  'category' — GET /<slug>/?ajax=1
 *  'fp'       — GET /?ajax=fp_section&s=<slug>
 */
async function fetchSection({ type, slug, key, limit }) {
  let url, referer, ajax;

  if (type === 'browse') {
    url     = `${config.baseUrl}/${slug}/?ajax=browse_videos&page=1`;
    referer = `${config.baseUrl}/${slug}/`;
    ajax    = true;
  } else if (type === 'category') {
    url     = `${config.baseUrl}/${slug}/?ajax=1`;
    referer = `${config.baseUrl}/${slug}/`;
    ajax    = true;
  } else {
    // fp_section — returns { status, html }
    url     = `${config.baseUrl}/?ajax=fp_section&s=${encodeURIComponent(slug)}`;
    referer = `${config.baseUrl}/`;
    ajax    = true;
  }

  const { data } = await get(url, { ajax, referer });

  const html = typeof data === 'object' ? data.html : data;
  if (!html) return [];

  const items = parseVideoList(html);
  return limit ? items.slice(0, limit) : items;
}

/**
 * Scrape the homepage — all sections in parallel.
 * A section that errors is silently dropped so one failing panel
 * doesn't kill the whole response.
 */
async function scrapeHome() {
  const results = await Promise.allSettled(
    SECTIONS.map(async (section) => {
      const items = await fetchSection(section);
      const result = { section: section.key, label: section.label, ...(section.seeAll ? { seeAll: section.seeAll } : {}), items };
      return result;
    })
  );

  const sections = results
    .filter((r) => r.status === 'fulfilled' && r.value.items.length > 0)
    .map((r) => r.value);

  if (sections.length === 0) {
    throw Errors.NotFound('Tidak ada data yang berhasil dimuat dari homepage');
  }

  return sections;
}

module.exports = { scrapeHome, fetchSection };
