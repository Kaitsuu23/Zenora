/**
 * stream.js — Extract direct stream URLs from a video page.
 *
 * Supports:
 *   - Myserver / BpServer / Fastserver / Topserver (javhdz.today / savedvids.com)
 *     → embed.php / embed_server*.php with TOKEN + FIRST
 *   - Cloudwish (cloudwish.xyz)
 *     → Dean Edwards eval() packer → m3u8 in `links` object
 *   - Mycloudz (mycloudz.cc)
 *     → Dean Edwards eval() packer → m3u8 in `links` object
 *   - Upnshare, Streamtape, Dood → no extraction (canExtract=false)
 */

const cheerio = require('cheerio');
const vm      = require('vm');
const { instance } = require('../utils/http');

// ── HTTP helpers ──────────────────────────────────────────────────────────────

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

function getHtml(url, referer) {
  return instance.get(url, {
    headers: {
      ...BASE_HEADERS,
      Referer: referer || 'https://javhd.today/',
      Origin: 'https://javhd.today',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
    },
    timeout: 10000,  // faster — embed pages should respond quickly
  }).then(r => (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)));
}

function getJson(url, referer) {
  return instance.get(url, {
    headers: {
      ...BASE_HEADERS,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      Referer: referer,
    },
    timeout: 10000,
  }).then(r => r.data);
}

// ── Embed URL parser (from video page HTML) ───────────────────────────────────

function getEmbedServers(html) {
  const $ = cheerio.load(html);
  const servers = [];

  $('button.button_choice_server').each((_, el) => {
    const $btn    = $(el);
    const name    = $btn.attr('data-name') || '';
    const isMulti = !!$btn.attr('data-embeds');
    const b64     = isMulti ? $btn.attr('data-embeds') : $btn.attr('data-embed');
    if (!b64) return;

    try {
      let urls;
      if (isMulti) urls = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
      else         urls = [Buffer.from(b64, 'base64').toString('utf-8')];
      if (urls.length) servers.push({ name, urls: urls.filter(Boolean) });
    } catch { /* ignore */ }
  });

  return servers;
}

// ── Dean Edwards packer (Cloudwish / Mycloudz) ────────────────────────────────

function unpackEval(html) {
  const $ = cheerio.load(html);
  let unpacked = '';
  $('script').each((_, el) => {
    if (unpacked) return;
    const c = $(el).html() || '';
    if (!c.includes('eval(function(p,a,c,k,e,')) return;
    const sandbox = { eval: (str) => { unpacked = str; } };
    try { vm.runInNewContext(c, sandbox, { timeout: 2000 }); } catch { /* ignore */ }
  });
  return unpacked;
}

function extractM3u8FromUnpacked(unpacked, origin) {
  const sources = [];
  const seen    = new Set();

  // First pass: absolute m3u8 URLs
  for (const m of unpacked.matchAll(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/g)) {
    const url = m[0];
    if (!seen.has(url)) { seen.add(url); sources.push(url); }
  }
  // Second pass: relative hls* keys (only if no absolute found)
  if (sources.length === 0) {
    for (const m of unpacked.matchAll(/"hls\d*"\s*:\s*"([^"\\]+)"/g)) {
      let url = m[1];
      if (!url.includes('.m3u8')) continue;
      if (!url.startsWith('http')) url = origin + url;
      if (!seen.has(url)) { seen.add(url); sources.push(url); }
    }
  }
  return sources;
}

// ── HLS master playlist parser ────────────────────────────────────────────────

async function parseMasterPlaylist(masterUrl, referer) {
  let content;
  try {
    const r = await instance.get(masterUrl, {
      headers: { ...BASE_HEADERS, Accept: '*/*', Referer: referer },
      timeout: 6000,  // short timeout — token expires fast
    });
    content = typeof r.data === 'string' ? r.data : String(r.data);
  } catch { return null; }

  if (!content.includes('#EXT-X-STREAM-INF')) return null;

  const base    = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
  const streams = [];
  const lines   = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
    const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
    const nextLine = (lines[i + 1] || '').trim();
    if (!nextLine || nextLine.startsWith('#')) continue;
    const src     = nextLine.startsWith('http') ? nextLine : base + nextLine;
    const height  = resMatch ? parseInt(resMatch[1].split('x')[1], 10) : null;
    streams.push({
      type: 'hls', src,
      quality:    height ? `${height}p` : 'auto',
      resolution: resMatch ? resMatch[1] : null,
    });
  }
  return streams.length > 0 ? streams : null;
}// ── Quality derivation from javhdz proxy playlist ─────────────────────────────

async function deriveQualitiesFromJavhdz(playlistUrl, referer) {
  try {
    const r = await instance.get(playlistUrl, {
      headers: { ...BASE_HEADERS, Accept: '*/*', Referer: referer },
      timeout: 8000,
    });
    const content = typeof r.data === 'string' ? r.data : String(r.data);
    const rMatch  = content.match(/\/r\?u=([A-Za-z0-9+/=_-]+)/);
    if (!rMatch) return null;

    const decoded = Buffer.from(rMatch[1], 'base64').toString('utf-8');

    // ── Format 1: streamhg — seg-1-f3-v1-a1.ts ──────────────────────────────
    const fMatch = decoded.match(/\/seg-\d+-f(\d+)-v(\d+)-a(\d+)\.ts(\?.+)?$/);
    if (fMatch) {
      const detectedF = parseInt(fMatch[1], 10);
      const v = fMatch[2], a = fMatch[3], qs = fMatch[4] || '';
      const baseUrl   = decoded.substring(0, decoded.lastIndexOf('/') + 1);
      const qualityMap = { 1: '480p',     2: '720p',     3: '1080p',    4: '2160p'     };
      const resMap     = { 1: '852x480',  2: '1280x720', 3: '1920x1080',4: '3840x2160' };
      const streams = [];
      for (let f = 1; f <= detectedF; f++) {
        streams.push({
          type: 'hls', src: `${baseUrl}index-f${f}-v${v}-a${a}.m3u8${qs}`,
          quality: qualityMap[f] || 'auto', resolution: resMap[f] || null,
        });
      }
      return streams;
    }

    // ── Format 2: f4scdn — .../720p/seg_00000.png ───────────────────────────
    const qMatch = decoded.match(/\/(\d{3,4}p)\/seg_\d+\./);
    if (qMatch) {
      const detectedQ = qMatch[1];
      const baseUrl   = decoded.substring(0, decoded.lastIndexOf('/' + detectedQ + '/') + 1);
      const allQ      = ['480p', '720p', '1080p'];
      const idx       = allQ.indexOf(detectedQ);
      // Try to probe whether 1080p exists (it might not for some videos)
      const available = allQ.slice(0, idx + 1);
      if (idx < allQ.length - 1) {
        // Try next quality to see if it exists
        try {
          const nextQ   = allQ[idx + 1];
          const probeUrl = `${baseUrl}${nextQ}/index.m3u8`;
          await instance.head(probeUrl, { timeout: 3000 });
          available.push(nextQ);
          // Try one more
          if (idx + 2 < allQ.length) {
            try {
              const nextQ2   = allQ[idx + 2];
              const probeUrl2 = `${baseUrl}${nextQ2}/index.m3u8`;
              await instance.head(probeUrl2, { timeout: 3000 });
              available.push(nextQ2);
            } catch { /* not available */ }
          }
        } catch { /* not available */ }
      }
      const streams = available.map(q => ({
        type: 'hls', src: `${baseUrl}${q}/index.m3u8`, quality: q, resolution: null,
      }));
      return streams.length > 0 ? streams : null;
    }
  } catch { /* ignore */ }
  return null;
}

async function detectQualityFromPlaylist(playlistUrl, referer) {
  try {
    const r = await instance.get(playlistUrl, {
      headers: { ...BASE_HEADERS, Accept: '*/*', Referer: referer },
      timeout: 8000,
    });
    const content = typeof r.data === 'string' ? r.data : String(r.data);
    const rMatch  = content.match(/\/r\?u=([A-Za-z0-9+/=_-]+)/);
    if (rMatch) {
      const decoded = Buffer.from(rMatch[1], 'base64').toString('utf-8');
      // streamhg: seg-1-f3-v1-a1.ts
      const fMatch = decoded.match(/seg-\d+-f(\d+)-v\d+-a\d+\.ts/);
      if (fMatch) {
        const qualityMap = { 1: '480p', 2: '720p', 3: '1080p', 4: '2160p' };
        return qualityMap[parseInt(fMatch[1], 10)] || 'auto';
      }
      // f4scdn: /720p/seg_00000
      const qMatch = decoded.match(/\/(\d{3,4}p)\/seg_\d+\./);
      if (qMatch) return qMatch[1];
      // seg-1-v1-a1.ts (no f index) = single quality, try detect from CDN URL structure
      if (decoded.match(/\/seg-\d+-v\d+-a\d+\.ts/)) return 'auto';
    }
  } catch { /* ignore */ }
  return 'auto';
}

// ── Maxcloud multi-source extractor ──────────────────────────────────────────
// Maxcloud (embed_server2.php) returns multiple independent CDN sources via
// FIRST (inline HTML) + json=1&next=0,1,2,… loop.
// Each source is an independent stream — we pick the one that yields qualities.

const QUALITY_MAP = { 1: '480p', 2: '720p', 3: '1080p', 4: '2160p' };
const RES_MAP     = { 1: '852x480', 2: '1280x720', 3: '1920x1080', 4: '3840x2160' };

function rawSrcFromEntry(entry, origin) {
  if (!entry) return null;
  // playmate, turbovid → playlist field
  if (entry.type === 'playmate' || entry.type === 'turbovid') {
    return resolveSrc(entry.playlist, origin);
  }
  return resolveSrc(entry.src || entry.media, origin);
}

async function probeJavhdzSource(src, referer) {
  // 1. Try as HLS master playlist (handles .m3u8, .txt, or any extension)
  const master = await parseMasterPlaylist(src, referer);
  if (master && master.length > 0) return master;

  // 2. Try deriving qualities via javhdz proxy playlist (streamhg/f4scdn format)
  const derived = await deriveQualitiesFromJavhdz(src, referer);
  if (derived && derived.length > 0) return derived;

  // 3. Single quality detect fallback
  const q = await detectQualityFromPlaylist(src, referer);
  return [{ type: 'hls', src, quality: q, resolution: null }];
}

async function extractJavhdzAllSources(origin, TOKEN, phpFile, FIRST, embedUrl) {
  const allEntries = [];

  // Collect FIRST
  if (FIRST) allEntries.push(FIRST);

  // Collect json=1 entries
  for (let skip = 0; skip <= 8; skip++) {
    try {
      const jsonUrl = `${origin}/${phpFile}?json=1&next=${skip}&p=${encodeURIComponent(TOKEN)}`;
      const data    = await getJson(jsonUrl, embedUrl);
      if (!data || !data.success) break;
      allEntries.push(data);
    } catch { break; }
  }

  if (allEntries.length === 0) return [];

  // Try each entry until we get qualities
  for (const entry of allEntries) {
    const src = rawSrcFromEntry(entry, origin);
    if (!src) continue;
    try {
      const streams = await probeJavhdzSource(src, embedUrl);
      if (streams && streams.length > 0) return streams;
    } catch { /* try next */ }
  }

  return [];
}

// ── Javhdz extractor ──────────────────────────────────────────────────────────

function parseEmbedPage(html) {
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let TOKEN = null, FIRST = null, match;
  while ((match = scriptRe.exec(html)) !== null) {
    const c = match[1];
    if (!TOKEN) { const m = c.match(/var\s+TOKEN\s*=\s*"([^"]+)"/); if (m) TOKEN = m[1]; }
    if (!FIRST) { const m = c.match(/var\s+FIRST\s*=\s*(\{[\s\S]*?\});/); if (m) { try { FIRST = JSON.parse(m[1]); } catch { /* ignore */ } } }
    if (TOKEN && FIRST) break;
  }
  return { TOKEN, FIRST };
}

function resolveSrc(src, origin) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return origin + src;
}

async function extractJavhdz(embedUrl, videoPageUrl) {
  const origin  = new URL(embedUrl).origin;
  const html    = await getHtml(embedUrl, videoPageUrl);
  const { TOKEN, FIRST } = parseEmbedPage(html);
  if (!TOKEN) return [];

  const phpFile = new URL(embedUrl).pathname.split('/').pop() || 'embed.php';

  // ── Maxcloud (embed_server2.php): FIRST + json=1 loop → multiple qualities ──
  if (phpFile === 'embed_server2.php') {
    return await extractJavhdzAllSources(origin, TOKEN, phpFile, FIRST, embedUrl);
  }

  if (FIRST) {
    const rawSrc = FIRST.type === 'turbovid' ? FIRST.playlist : (FIRST.src || FIRST.media);
    const src    = resolveSrc(rawSrc, origin);
    if (!src) return [];

    // Topserver: FIRST.type="dood" → proxied mp4
    if (FIRST.type === 'dood') {
      return [{ type: 'mp4', src, quality: 'auto', resolution: null }];
    }

    // Mangocloud (type="vidara"): src is absolute master playlist with very short-lived token
    if (FIRST.type === 'vidara' || src.match(/master\.(m3u8|txt)$/i)) {
      const qualities = await parseMasterPlaylist(src, embedUrl);
      if (qualities && qualities.length > 0) return qualities;
      return [{ type: 'hls', src, quality: 'auto', resolution: null }];
    }

    // Fastserver (type="f4scdn"): derive quality from CDN path
    if (FIRST.type === 'f4scdn') {
      const qualities = await deriveQualitiesFromJavhdz(src, embedUrl);
      if (qualities && qualities.length > 0) return qualities;
    }

    // Myserver / BpServer / Limecloud: use javhdz playlist.m3u8 directly
    // javhdz CDN already has Access-Control-Allow-Origin: * so no proxy needed
    // Quality detection not needed — serve as single 'auto' stream
    return [{ type: 'hls', src, quality: 'auto', resolution: null }];
  }

  // FIRST = null (STserver-style) — try json=1&next=0
  try {
    const jsonUrl = `${origin}/${phpFile}?json=1&next=0&p=${encodeURIComponent(TOKEN)}`;
    const data    = await getJson(jsonUrl, embedUrl);
    if (data && data.success) {
      const rawSrc = data.type === 'turbovid' ? data.playlist : (data.src || data.media);
      const src    = resolveSrc(rawSrc, origin);
      if (src) return [{ type: 'hls', src, quality: 'auto', resolution: null }];
    }
  } catch { /* ignore */ }

  return [];
}

async function extractJavhdzMulti(urls, videoPageUrl) {
  for (const url of urls) {
    try {
      const streams = await extractJavhdz(url, videoPageUrl);
      if (streams.length > 0) return streams;
    } catch { /* try next */ }
  }
  return [];
}

// ── Pmate extractor (pmate.xyz) ──────────────────────────────────────────────
// pmate.xyz/embed/<filecode> uses JWPlayer + /api/s endpoint
// POST { c: filecode, d: 'pc' } → { sx: streaming_url, ix: thumbnail }

async function extractPmate(embedUrl, videoPageUrl) {
  const origin   = new URL(embedUrl).origin;
  const filecode = embedUrl.split('/').pop();
  if (!filecode) return [];

  try {
    const res = await instance.post(`${origin}/api/s`, { c: filecode, d: 'pc' }, {
      headers: {
        ...BASE_HEADERS,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': embedUrl,
        'Origin': origin,
      },
      timeout: 10000,
    });

    const data = res.data;
    // sx = streaming_url (HLS master playlist, often .txt extension)
    const src = data?.sx;
    if (!src) return [];

    const streams = await probeJavhdzSource(src, embedUrl);
    return streams.length > 0 ? streams : [{ type: 'hls', src, quality: 'auto', resolution: null }];
  } catch { return []; }
}

// ── Cloudwish / Mycloudz extractor ───────────────────────────────────────────

async function extractJwPacker(embedUrl, videoPageUrl) {
  const origin   = new URL(embedUrl).origin;
  const html     = await getHtml(embedUrl, videoPageUrl);
  const unpacked = unpackEval(html);
  if (!unpacked) return [];

  const m3u8List  = extractM3u8FromUnpacked(unpacked, origin);
  const masterUrl = m3u8List[0];
  if (!masterUrl) return [];

  const qualities = await parseMasterPlaylist(masterUrl, embedUrl);
  if (qualities && qualities.length > 0) return qualities;

  return [{ type: 'hls', src: masterUrl, quality: 'auto', resolution: null }];
}

// ── Server classifier ─────────────────────────────────────────────────────────

const JAVHDZ_HOSTS  = ['javhdz.today', 'savedvids.com'];
const JWPACK_HOSTS  = ['cloudwish.xyz', 'mycloudz.cc'];
const PMATE_HOSTS   = ['pmate.xyz'];
const DOOD_HOSTS    = ['dooood.com', 'dood.', 'ds2play.com'];
const NO_EXTRACT    = ['streambeast.upn.one', 'streamtape.', 'lulust.com'];

function classifyHost(url) {
  try {
    const parsed = new URL(url);
    const host   = parsed.hostname;
    const path   = parsed.pathname;

    if (PMATE_HOSTS.some(h => host.includes(h)))  return 'pmate';
    if (JWPACK_HOSTS.some(h => host.includes(h))) return 'jwpack';
    if (DOOD_HOSTS.some(h => host.includes(h)))   return 'dood';
    if (NO_EXTRACT.some(h => host.includes(h)))   return 'no_extract';

    if (JAVHDZ_HOSTS.some(h => host.includes(h))) {
      if (path.includes('embed_server9.php')) return 'no_extract';
      if (path.includes('embed_server7.php')) return 'javhdz_dood_proxy';
      if (path.includes('embed_server2.php')) return 'javhdz';
      return 'javhdz';
    }
    return 'unknown';
  } catch { return 'unknown'; }
}

function canExtractUrls(urls) {
  if (!urls || !urls.length) return false;
  const kind = classifyHost(urls[0]);
  return ['javhdz', 'javhdz_multi', 'javhdz_dood_proxy', 'jwpack', 'pmate'].includes(kind);
}

async function extractStreamsForServer(name, urls, videoPageUrl) {
  const kind = classifyHost(urls[0]);

  let streams = [];
  try {
    if (kind === 'javhdz' || kind === 'javhdz_dood_proxy' || kind === 'javhdz_multi') {
      streams = await extractJavhdzMulti(urls, videoPageUrl);
    } else if (kind === 'jwpack') {
      const url = urls.find(u => JWPACK_HOSTS.some(h => u.includes(h))) || urls[0];
      streams = await extractJwPacker(url, videoPageUrl);
    } else if (kind === 'pmate') {
      const url = urls.find(u => PMATE_HOSTS.some(h => u.includes(h))) || urls[0];
      streams = await extractPmate(url, videoPageUrl);
    }
  } catch { /* ignore per-server errors */ }

  const embedUrl = urls.find(u => u.includes('javhdz.today')) || urls[0];

  return {
    server:    name,
    embedUrl,
    extracted: streams.length > 0,
    streams,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

module.exports = { getEmbedServers, extractStreamsForServer, canExtractUrls };
