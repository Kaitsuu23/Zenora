/**
 * stream-play.js — Combined extract + proxy in one request.
 *
 * GET /api/stream/play?url=<video_url>&server=<server>&quality=<quality>
 *
 * This endpoint:
 * 1. Extracts stream URLs for the given server (same as /api/stream/extract)
 * 2. Immediately fetches the m3u8 from CDN server-side (no CORS, no token expiry)
 * 3. Rewrites segment URLs to go through /api/hlsproxy
 * 4. Returns the rewritten m3u8 content directly to the client
 *
 * This eliminates the race condition where CDN tokens expire between
 * extract → client → proxy → CDN.
 */

const express = require('express');
const https   = require('https');
const axios   = require('axios');
const config  = require('../config');
const { getEmbedServers, extractStreamsForServer } = require('../scrapers/stream');
const { get } = require('../utils/http');
const { Errors } = require('../utils/errors');

const router = express.Router();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const cdnClient  = axios.create({
  timeout: 10000,
  httpsAgent,
  responseType: 'text',
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Encoding': 'identity',
  },
});

const ALLOWED_HOSTS = [
  'premilkyway.com', 'acek-cdn.com', 'cdn-centaurus.com',
  'f4scdn.com', '97bf1.com', 'dramiyos-cdn.com',
  'javhdz.today', 'savedvids.com',
  'plauymito.live',   // Maxcloud/playmate CDN
  'huntrexus.com',    // streamhg thumbnail CDN (in case segments come from here)
];

function isAllowed(url) {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_HOSTS.some(h => host.endsWith(h));
  } catch { return false; }
}

function rewriteM3u8(content, baseUrl, proxyBase) {
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;
  const base   = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

  function resolveUrl(uri) {
    if (uri.startsWith('http')) return uri;
    if (uri.startsWith('/'))    return origin + uri;
    return base + uri;
  }

  return content.split('\n').map(line => {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const abs = resolveUrl(uri);
        if (!isAllowed(abs)) return `URI="${abs}"`;  // absolutize but don't proxy
        return `URI="${proxyBase}?url=${Buffer.from(abs).toString('base64url')}"`;
      });
    }
    const abs = resolveUrl(t);
    if (!isAllowed(abs)) return abs;  // absolutize but don't proxy
    return `${proxyBase}?url=${Buffer.from(abs).toString('base64url')}`;
  }).join('\n');
}

/**
 * GET /api/stream/play?url=<video_url>&server=<server>&quality=<quality>
 *
 * quality: "1080p" | "720p" | "480p" | "auto" (default: highest available)
 */
router.get('/play', async (req, res, next) => {
  try {
    const videoUrl  = req.query.url;
    const serverName = req.query.server;
    const quality   = req.query.quality || 'auto';

    if (!videoUrl) throw Errors.BadParam('Parameter "url" wajib diisi');
    if (!serverName) throw Errors.BadParam('Parameter "server" wajib diisi');

    // 1. Fetch video page and get server embed URLs
    const { data: html } = await get(videoUrl, { referer: config.baseUrl + '/' });
    const servers = getEmbedServers(html);
    const target = servers.find(s => s.name.toLowerCase() === serverName.toLowerCase());
    if (!target) throw Errors.NotFound(`Server "${serverName}" tidak ditemukan`);

    // 2. Extract streams for this server
    const result = await extractStreamsForServer(target.name, target.urls, videoUrl);
    if (!result.extracted || !result.streams.length) {
      throw Errors.NotFound(`Tidak bisa mengekstrak stream dari server "${serverName}"`);
    }

    // 3. Pick the requested quality (or highest)
    let stream;
    if (quality !== 'auto') {
      stream = result.streams.find(s => s.quality === quality) || result.streams[0];
    } else {
      // Pick highest quality
      stream = [...result.streams].sort((a, b) => {
        const na = parseInt(a.quality, 10) || 0;
        const nb = parseInt(b.quality, 10) || 0;
        return nb - na;
      })[0];
    }

    // 4. For HLS streams, fetch m3u8 from CDN immediately and rewrite
    if (stream.type === 'hls') {
      const streamHost = (() => { try { return new URL(stream.src).hostname; } catch { return ''; } })();
      const needsProxy = ALLOWED_HOSTS.some(h => streamHost.endsWith(h)) && !streamHost.includes('javhdz.today') && !streamHost.includes('savedvids.com');

      if (needsProxy) {
        // CDN with CORS issues (premilkyway, acek-cdn, f4scdn, etc.) — proxy through
        const proxyBase = '/api/hls-proxy';
        try {
          const cdnRes = await cdnClient.get(stream.src, {
            headers: {
              Referer: result.embedUrl || 'https://javhd.today/',
              Origin: result.embedUrl ? new URL(result.embedUrl).origin : 'https://javhd.today',
            },
          });
          const content = typeof cdnRes.data === 'string' ? cdnRes.data : Buffer.from(cdnRes.data).toString('utf-8');
          // Only rewrite if it's an HLS manifest (not a binary TS segment)
          if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
            // Not a playlist — return src directly for browser to handle
            return res.json({ success: true, type: stream.type, src: stream.src, quality: stream.quality, server: serverName });
          }
          const rewritten = rewriteM3u8(content, stream.src, proxyBase);
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('X-Stream-Quality', stream.quality);
          res.setHeader('X-Stream-Server', serverName);
          return res.send(rewritten);
        } catch (cdnErr) {
          console.error('CDN proxy failed:', cdnErr.response?.status, cdnErr.message);
          // Fall through to return raw URL
        }
      } else {
        // javhdz.today already has CORS headers — but still fetch server-side
        // to avoid any token expiry issues between extract → client
        const proxyBase = '/api/hls-proxy';
        try {
          const cdnRes = await cdnClient.get(stream.src, {
            headers: {
              Referer: result.embedUrl || 'https://javhd.today/',
            },
          });
          const content = typeof cdnRes.data === 'string' ? cdnRes.data : Buffer.from(cdnRes.data).toString('utf-8');
          if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
            return res.json({ success: true, type: stream.type, src: stream.src, quality: stream.quality, server: serverName });
          }
          const rewritten = rewriteM3u8(content, stream.src, proxyBase);
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('X-Stream-Quality', stream.quality);
          res.setHeader('X-Stream-Server', serverName);
          return res.send(rewritten);
        } catch {
          // javhdz has CORS — return URL directly as fallback
          return res.json({
            success: true, type: stream.type, src: stream.src,
            quality: stream.quality, server: serverName,
          });
        }
      }
    }

    // 5. For MP4 or non-proxied streams, return JSON with src URL
    res.json({
      success: true,
      type: stream.type,
      src: stream.src,
      quality: stream.quality,
      server: serverName,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
