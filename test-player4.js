/**
 * test-player4.js
 * Test Maxcloud "multi" server extraction
 * Embed URL diberikan langsung (sudah di-extract dari video page)
 */
const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const http = axios.create({ timeout: 20000, httpsAgent });

const VIDEO_PAGE  = 'https://javhd.today/372959/english-sub-tysf-032-i-can-t-say-no-housekeeper-s-unconscious-temptation-outstanding-hospitality-carefully-cleaning-sperm-after-ejaculation-rubberless-big-butt-bareback-ok-sarina-momonaga/';
const EMBED_URL   = 'https://stream3.javhdz.today/embed_server2.php?p=Cea6UvBdFR6m9BnmjvnW-2rZcE7sQGpKCFZkRVmrqkLB7tcEK03eNCQnBe4ACoJjWlXf8guBMkYe2Gwgw_yYLoGwN_bd2UYo-7zYewaVLql7e6pZh4QHGdb1YLQpt6UjQdXQlGhIUiloLPc1OmWh8XsAiYTHWFCI7DAS9soaHONxQTF-B3ifBesyzxU6A74EU5l-M5ClnTuYv6rCsULdX2DWMtd4f6yuOH8hUIFVMmFGRDJIC7gnJx1VEmXivdYj_oF1bRFWV46kYMt3fCRCQaNf-A4';

const EMBED_ORIGIN = new URL(EMBED_URL).origin; // https://stream3.javhdz.today

const hEmbed = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': VIDEO_PAGE,
  'Origin': 'https://javhd.today',
};

(async () => {
  // ── Step 1: Fetch embed page ─────────────────────────────────────────────────
  console.log('=== Step 1: Fetch embed page ===');
  console.log('URL:', EMBED_URL.substring(0, 90) + '...');

  const r1 = await http.get(EMBED_URL, { headers: hEmbed });
  const html = r1.data;
  console.log('Status:', r1.status, '| Length:', html.length);

  // ── Step 2: Extract TOKEN and FIRST from inline <script> ────────────────────
  console.log('\n=== Step 2: Extract TOKEN & FIRST ===');
  const $ = cheerio.load(html);
  let TOKEN = null, FIRST = null;

  $('script').each((_, el) => {
    const c = $(el).html() || '';
    const tMatch = c.match(/var TOKEN\s*=\s*["']([^"']+)["']/);
    const fMatch = c.match(/var FIRST\s*=\s*(\{[\s\S]+?\});/);
    if (tMatch && !TOKEN) TOKEN = tMatch[1];
    if (fMatch && !FIRST) {
      try { FIRST = JSON.parse(fMatch[1]); } catch {}
    }
  });

  console.log('TOKEN:', TOKEN ? TOKEN.substring(0, 50) + '...' : 'NOT FOUND');
  console.log('FIRST:', JSON.stringify(FIRST, null, 2));

  if (FIRST?.src) {
    const m3u8 = FIRST.src.startsWith('http') ? FIRST.src : `${EMBED_ORIGIN}${FIRST.src}`;
    console.log('\n✅ FIRST m3u8:', m3u8);
  }

  if (!TOKEN) {
    console.error('\n❌ TOKEN not found — dumping first 3000 chars of HTML for debug:');
    console.log(html.substring(0, 3000));
    return;
  }

  // ── Step 3: Hit json=1 endpoint for all quality sources ─────────────────────
  console.log('\n=== Step 3: Iterate json=1 sources ===');

  const hJson = {
    ...hEmbed,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Referer': EMBED_URL,
  };

  for (let skip = 0; skip <= 6; skip++) {
    const jsonUrl = `${EMBED_ORIGIN}/embed.php?json=1&next=${skip}&p=${encodeURIComponent(TOKEN)}`;
    try {
      const r = await http.get(jsonUrl, { headers: hJson });
      const d = r.data;

      if (!d || !d.success) {
        console.log(`skip=${skip}: ✋ no more sources →`, JSON.stringify(d).substring(0, 80));
        break;
      }

      const src = d.type === 'turbovid' ? d.playlist : d.src;
      const fullSrc = src?.startsWith('http') ? src : src ? `${EMBED_ORIGIN}${src}` : '(none)';

      console.log(`\nskip=${skip}:`);
      console.log(`  type      : ${d.type}`);
      console.log(`  title     : ${d.title}`);
      console.log(`  src       : ${fullSrc}`);
      if (d.thumbnail) console.log(`  thumbnail : ${d.thumbnail}`);
      if (d.tracks)    console.log(`  tracks    : ${JSON.stringify(d.tracks)}`);
    } catch (e) {
      console.error(`skip=${skip}: ❌ ${e.message}`, e.response?.status || '');
      break;
    }
  }
})().catch(e => {
  console.error('Fatal:', e.message);
  if (e.response) {
    console.error('Status:', e.response.status);
    console.error('Body:', JSON.stringify(e.response.data).substring(0, 500));
  }
});
