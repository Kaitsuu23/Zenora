/**
 * parser.js — Low-level Cheerio helpers shared by all scrapers.
 *
 * Every function here takes either a Cheerio root `$` or raw HTML, and
 * returns plain JS objects. There is no I/O in this file.
 */

const cheerio = require('cheerio');
const { absUrl } = require('../utils/http');

/**
 * Parse the `<ul class="videos">` HTML fragment that appears in every
 * AJAX response and in static search pages.
 *
 * Returns an array of lightweight video cards:
 *  {
 *    id:        "372619",           // numeric string
 *    title:     "Mosaic MEYD-031 …",
 *    url:       "https://…",
 *    thumbnail: "https://…",
 *    duration:  "01:59:00",        // may be empty
 *    badge:     "LOVE-103-mosaic", // video-overlay1 badge
 *    age:       "28 seconds ago",  // relative upload time
 *    views:     null               // not available in listing HTML
 *  }
 */
function parseVideoList(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];

  $('ul.videos > li').each((_, el) => {
    const $li = $(el);
    const rawId = $li.attr('id') || '';
    const id = rawId.replace('video-', '');

    const $a = $li.find('a.thumbnail').first();
    const href = $a.attr('href') || '';
    const title = $a.attr('title') || $li.find('.video-title').text().trim();
    const thumb = $li.find('.video-thumb img').first().attr('src') || '';

    // "HD 01:59:00" lives in .video-overlay.badge (not .video-overlay1)
    const overlayText = $li.find('.video-overlay.badge.transparent').text().trim();
    let duration = '';
    const durationMatch = overlayText.match(/\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}/);
    if (durationMatch) duration = durationMatch[0];

    const badge = $li.find('.video-overlay1.badge').text().trim();
    const age = $li.find('.video-overlay2').text().trim();

    if (!href || !title) return; // skip skeleton / empty items

    items.push({
      id,
      title,
      url: absUrl(href),
      thumbnail: absUrl(thumb),
      duration,
      badge,
      age,
    });
  });

  return items;
}

/**
 * Parse the Bootstrap pagination fragment returned with AJAX list responses.
 *
 * Handles two formats emitted by the site:
 *  - Full:    <nav><ul class="pagination pagination-lg"><li>…</li></ul></nav>
 *  - Bare:    <li class="active …">…</li><li><a href="…">2</a></li>…
 *             (used by browse_videos responses)
 *
 * Returns: { currentPage, totalPages, hasNext, hasPrev }
 */
function parsePagination(paginationHtml) {
  if (!paginationHtml) return null;

  // If the fragment doesn't contain a <ul>, wrap it so cheerio
  // can still find the <li> elements via a consistent selector.
  const wrapped = paginationHtml.includes('<ul')
    ? paginationHtml
    : `<ul class="pagination">${paginationHtml}</ul>`;

  const $ = cheerio.load(wrapped);

  let currentPage  = 1;
  let totalPages   = null;
  let hasPrevLink  = false;
  let hasNextLink  = false;

  // Active (current) page
  $('li.active a').each((_, el) => {
    const t = $(el).text().trim();
    const n = parseInt(t, 10);
    if (Number.isFinite(n)) currentPage = n;
  });

  // Prev / next
  $('a.prevnext').each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (text.includes('prev') || text.includes('previous')) hasPrevLink = true;
    else if (text.includes('next'))                         hasNextLink = true;
  });

  // Numbered page links → derive total pages
  $('ul.pagination li a').each((_, el) => {
    const text = $(el).text().trim();
    const n    = parseInt(text, 10);
    if (Number.isFinite(n) && n > (totalPages || 0)) totalPages = n;
  });

  const hasNext = hasNextLink || (totalPages != null && currentPage < totalPages);
  const hasPrev = hasPrevLink || currentPage > 1;

  return { currentPage, totalPages, hasNext, hasPrev };
}

/**
 * Parse a detail page (video page).
 *
 * @param {string} html - raw HTML of the video page
 * @returns {object} structured video detail object
 */
function parseVideoDetail(html) {
  const $ = cheerio.load(html);

  // ── Titles ──────────────────────────────────────────────────────────────────
  const titles = [];
  $('h1').each((_, el) => {
    const t = $(el).text().trim();
    if (t) titles.push(t);
  });
  const title = titles[0] || '';
  const altTitles = titles.slice(1).filter(Boolean);

  // ── Thumbnail ───────────────────────────────────────────────────────────────
  // The main thumbnail is the <img> directly inside .content-container
  const thumbnail = absUrl(
    $('div.content-container img.col-xs-12').attr('src') ||
    $('div.content-container img').first().attr('src') ||
    ''
  );

  // ── Meta tags ───────────────────────────────────────────────────────────────
  const metaThumb =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="video:thumbnail_url"]').attr('content') ||
    '';

  // ── Info fields (parsed from the "fa-caret-right" label blocks) ─────────────
  // The pattern is: <i class="fa fa-caret-right"> text: <a> or plain text
  const info = {};
  $('i.fa-caret-right').each((_, el) => {
    const $parent = $(el).parent();
    const rawText = $parent.text().replace(/\s+/g, ' ').trim();

    // Key is the first word(s) before the colon
    const colonIdx = rawText.indexOf(':');
    if (colonIdx < 0) return;
    const rawKey = rawText.substring(0, colonIdx).trim().toLowerCase().replace(/\s+/g, '_');
    const value = rawText.substring(colonIdx + 1).trim();

    switch (rawKey) {
      case 'genre':
        info.genres = [];
        info.pornstars = [];
        $parent.find('a').each((_, a) => {
          const href = $(a).attr('href') || '';
          const name = $(a).text().trim();
          if (!name) return;
          if (href.includes('/pornstar/')) {
            const slug = href.replace(/^\/pornstar\//, '').replace(/\/$/, '');
            info.pornstars.push({ name, slug });
          } else {
            const slug = href.replace(/^\/|\/$/g, '');
            info.genres.push({ name, slug });
          }
        });
        break;
      case 'release_day':
      case 'release':
        info.released = value;
        break;
      case 'studio': {
        const $studioA = $parent.find('a.tagnote, a').first();
        const studioName = $studioA.text().trim();
        // "By Keyword" link is the second <a> in the parent
        const $keywordA = $parent.find('a').eq(1);
        const keywordUrl = $keywordA.attr('href') || $studioA.attr('href') || '';
        info.studio = studioName;
        info.studioKeyword = keywordUrl ? absUrl(keywordUrl) : null;
        break;
      }
      case 'director':
        info.director = $parent.find('a').first().text().trim();
        break;
      case 'label':
        // label is replaced by studioKeyword — skip
        break;
      case 'country':
        info.country = $parent.find('a').first().text().trim();
        break;
      case 'tags':
        info.tags = [];
        $parent.find('a').each((_, a) => {
          const href = $(a).attr('href') || '';
          const name = $(a).text().trim();
          if (!name) return;
          // href is "/tag/slug/" → extract slug
          const slug = href.replace(/^\/tag\//, '').replace(/\/$/, '');
          info.tags.push({ name, slug });
        });
        break;
      default:
        break;
    }
  });

  // ── Description ──────────────────────────────────────────────────────────────
  const description = $('p.description').text().trim();

  // ── Player servers ──────────────────────────────────────────────────────────
  const poster = (() => {
    const style = $('#player-poster').attr('style') || '';
    const m = style.match(/url\(([^)]+)\)/);
    return m ? m[1].replace(/['"]/g, '') : metaThumb;
  })();

  const servers = [];
  $('button.button_choice_server').each((_, el) => {
    const $btn = $(el);
    const name = $btn.attr('data-name') || '';
    const isMulti = !!$btn.attr('data-embeds');
    const b64 = isMulti ? $btn.attr('data-embeds') : $btn.attr('data-embed');

    let urls = [];
    try {
      if (isMulti) urls = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
      else urls = [Buffer.from(b64, 'base64').toString('utf-8')];
    } catch {
      urls = [];
    }

    if (name) {
      // Return only one representative URL per server (prefer javhdz.today)
      const preferredUrl = urls.find(u => u.includes('javhdz.today')) || urls[0] || '';
      servers.push({
        name,
        type: isMulti ? 'multi' : 'single',
        url: preferredUrl,
      });
    }
  });

  return {
    title,
    altTitles,
    thumbnail: thumbnail || absUrl(poster),
    poster,
    description,
    genres: info.genres || [],
    tags: info.tags || [],
    pornstars: info.pornstars || [],
    released: info.released || null,
    studio: info.studio || null,
    studioKeyword: info.studioKeyword || null,
    servers,
  };
}

/**
 * Parse genre list from the /categories/ page.
 *
 * The page renders a <ul class="categories"> with one <li id="category-X">
 * per genre. Each item contains:
 *   - <a href="/slug/" class="thumbnail">
 *   - <img src="…">
 *   - <div class="category-title">Name</div>
 *   - <div class="category-overlay badge transparent"><i>…</i> 48800</div>
 *
 * Supports ?o=name (default), ?o=popular, ?o=videos sort orders.
 */
function parseGenreList(html) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const genres = [];

  $('ul.categories > li').each((_, el) => {
    const $li  = $(el);
    const $a   = $li.find('a.thumbnail').first();
    const href = $a.attr('href') || '';
    const name = $a.find('.category-title').text().trim();
    const thumb = $a.find('img').attr('src') || '';

    // video count lives in .category-overlay — strip the icon text
    const overlayText = $a.find('.category-overlay').text().trim();
    const countMatch  = overlayText.match(/[\d,]+/);
    const videoCount  = countMatch ? parseInt(countMatch[0].replace(/,/g, ''), 10) : null;

    // Extract numeric id from li id="category-83"
    const rawId   = $li.attr('id') || '';
    const idMatch = rawId.match(/\d+/);
    const id      = idMatch ? parseInt(idMatch[0], 10) : null;

    if (!name || !href || seen.has(name)) return;
    seen.add(name);

    const url  = /^https?:\/\//i.test(href) ? href : absUrl(href);
    // Normalise any double-h typo ("hhttps://…")
    const cleanUrl = url.replace(/^hh/, 'h');
    const slug = cleanUrl.replace(/\/$/, '').split('/').pop() || '';

    genres.push({ id, name, slug, url: cleanUrl, thumbnail: absUrl(thumb), videoCount });
  });

  return genres;
}

module.exports = {
  parseVideoList,
  parsePagination,
  parseVideoDetail,
  parseGenreList,
};
