/**
 * GET /api/video?url=<video_page_url>
 *
 * Returns the detail of a single video (title, thumbnail, description,
 * genres, studio, director, label, country, tags, player servers) plus
 * related videos.
 */

const express = require('express');
const config = require('../config');
const { scrapeVideoDetail, scrapeRelated } = require('../scrapers/video');
const { requireVideoUrl } = require('../utils/validators');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const url = requireVideoUrl(req.query.url, config.baseUrl);

    // Fetch detail and related in parallel — they're independent.
    const [detail, related] = await Promise.all([
      scrapeVideoDetail(url),
      scrapeRelated(url).catch(() => ({ total: 0, items: [] })), // related is best-effort
    ]);

    res.json({
      success: true,
      ...detail,
      related,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
