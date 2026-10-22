/**
 * GET /api/stream?url=<video_url>
 *   → Fast: parse video page, return list of servers + names.
 *     Also caches embed URLs for 60s so /extract doesn't re-fetch.
 *
 * GET /api/stream/extract?url=<video_url>&server=<server_name>
 *   → Extract streams for ONE specific server.
 *     Uses cached embed URLs if available, otherwise re-fetches.
 */

const express = require('express');
const config  = require('../config');
const { get } = require('../utils/http');
const { getEmbedServers, extractStreamsForServer, canExtractUrls } = require('../scrapers/stream');
const { requireVideoUrl } = require('../utils/validators');
const { Errors } = require('../utils/errors');

const router = express.Router();

// ── Simple in-memory cache: videoUrl → { servers, expiresAt } ────────────────
const serverCache = new Map();
const CACHE_TTL   = 60 * 1000; // 60 seconds

function setCached(url, servers) {
  serverCache.set(url, { servers, expiresAt: Date.now() + CACHE_TTL });
}

function getCached(url) {
  const entry = serverCache.get(url);
  if (!entry || Date.now() > entry.expiresAt) {
    serverCache.delete(url);
    return null;
  }
  return entry.servers;
}

// ── /api/stream/extract ───────────────────────────────────────────────────────
router.get('/extract', async (req, res, next) => {
  try {
    const url        = requireVideoUrl(req.query.url, config.baseUrl);
    const serverName = req.query.server;

    if (!serverName) throw Errors.BadParam('Parameter "server" wajib diisi');

    // Use cached server list if available (avoids re-fetching video page)
    let servers = getCached(url);
    if (!servers) {
      const { data: html } = await get(url, { referer: config.baseUrl + '/' });
      servers = getEmbedServers(html);
      setCached(url, servers);
    }

    const target = servers.find(s => s.name.toLowerCase() === serverName.toLowerCase());
    if (!target) {
      throw Errors.NotFound(`Server "${serverName}" tidak ditemukan. Tersedia: ${servers.map(s => s.name).join(', ')}`);
    }

    const result = await extractStreamsForServer(target.name, target.urls, url);

    if (!result.extracted) {
      throw Errors.NotFound(`Gagal mengekstrak stream dari server "${target.name}"`);
    }

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ── /api/stream (list servers) ────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const url = requireVideoUrl(req.query.url, config.baseUrl);

    const { data: html } = await get(url, { referer: config.baseUrl + '/' });
    const servers = getEmbedServers(html);

    if (servers.length === 0) throw Errors.NotFound('Tidak ada embed server ditemukan');

    // Cache for subsequent /extract calls
    setCached(url, servers);

    const list = servers.map(({ name, urls }) => {
      const extractable = canExtractUrls(urls);
      const preferredUrl = urls.find(u => u.includes('javhdz.today')) || urls[0];
      const item = { server: name, canExtract: extractable, embedUrl: preferredUrl };
      if (extractable) {
        item.extractEndpoint = `/api/stream/extract?url=${encodeURIComponent(url)}&server=${encodeURIComponent(name)}`;
      }
      return item;
    });

    res.json({ success: true, count: list.length, servers: list });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
