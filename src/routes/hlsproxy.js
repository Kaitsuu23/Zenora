/**
 * HLS Proxy — server-side proxy untuk CDN stream
 *
 * GET /api/hlsproxy?url=<base64url_encoded_cdn_url>
 *
 * Forward HLS .m3u8 dan .ts requests ke CDN server-side,
 * rewrite segment URLs agar juga lewat proxy ini.
 * Ini menghindari CORS error di browser karena semua request
 * ke CDN dilakukan dari server.
 */

const express = require('express');
const https   = require('https');
const axios   = require('axios');
const { Errors } = require('../utils/errors');

const router = express.Router();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const cdnClient  = axios.create({
  timeout: 30000,  // longer timeout for .ts segments
  httpsAgent,
  responseType: 'arraybuffer',
  maxContentLength: 50 * 1024 * 1024, // 50MB max
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Encoding': 'identity', // avoid compression issues with binary data
  },
});

const ALLOWED_HOSTS = [
  'premilkyway.com',
  'acek-cdn.com',
  'cdn-centaurus.com',
  'f4scdn.com',
  '97bf1.com',
  'dramiyos-cdn.com',
  'javhdz.today',
  'savedvids.com',
  'plauymito.live',   // Maxcloud/playmate CDN
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
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Rewrite URI= in tag lines
    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const abs = resolveUrl(uri);
        if (!isAllowed(abs)) return `URI="${uri}"`;
        const encoded = Buffer.from(abs).toString('base64url');
        return `URI="${proxyBase}?url=${encoded}"`;
      });
    }

    // Segment line
    const abs = resolveUrl(trimmed);
    if (!isAllowed(abs)) return abs;  // absolutize but don't proxy
    const encoded = Buffer.from(abs).toString('base64url');
    return `${proxyBase}?url=${encoded}`;
  }).join('\n');
}

router.get('/', async (req, res, next) => {
  const rawParam = req.query.url;
  if (!rawParam) return res.status(400).send('Missing url parameter');

  let targetUrl;
  try {
    // Try base64url decode
    try {
      targetUrl = Buffer.from(rawParam, 'base64url').toString('utf-8');
      new URL(targetUrl);
    } catch {
      targetUrl = decodeURIComponent(rawParam);
      new URL(targetUrl);
    }
  } catch {
    return res.status(400).send('Invalid url');
  }

  if (!isAllowed(targetUrl)) return res.status(403).send('Host not allowed');

  try {
    let upstream;
    // Try without Referer first, then with common Referers if 403
    const referers = [undefined, 'https://cloudwish.xyz/', 'https://mycloudz.cc/', 'https://javhd.today/', 'https://stream3.javhdz.today/'];
    for (const referer of referers) {
      try {
        upstream = await cdnClient.get(targetUrl, {
          headers: referer ? { Referer: referer, Origin: new URL(referer).origin } : {},
        });
        break; // success
      } catch (e) {
        if (e.response?.status !== 403 || referer === referers[referers.length - 1]) throw e;
        // 403 → try next referer
      }
    }
    const contentType = upstream.headers['content-type'] || 'application/octet-stream';
    const isM3u8 = targetUrl.includes('.m3u8') || targetUrl.includes('.txt') || contentType.includes('mpegurl');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    if (isM3u8) {
      const text = Buffer.from(upstream.data).toString('utf-8');
      // Use relative path so browser requests go to Next.js /api/hls-proxy
      const proxyBase = '/api/hls-proxy';
      const rewritten = rewriteM3u8(text, targetUrl, proxyBase);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(rewritten);
    }

    res.setHeader('Content-Type', contentType);
    return res.send(Buffer.from(upstream.data));
  } catch (err) {
    const status = err.response?.status || 502;
    return res.status(status).send(`CDN error: ${status}`);
  }
});

module.exports = router;
