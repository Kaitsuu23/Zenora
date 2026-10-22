/**
 * GET /api/genre           - list all available genres
 * GET /api/genre/:slug      - list videos in a genre
 *   ?o=recent|popular|releaseday|rated|discussed|downloaded|longest|watched  (default: recent)
 *   ?period=today|yesterday|this-week|this-month|this-year|all-time          (default: all-time, only for popular/rated)
 *   ?page=<n>                                                                  (default: 1)
 */

const express = require('express');
const { scrapeGenreList, scrapeGenreVideos, VALID_ORDERS, VALID_PERIODS, PERIOD_ORDERS } = require('../scrapers/genre');
const { parsePage } = require('../utils/validators');
const { Errors } = require('../utils/errors');

const router = express.Router();

// GET /api/genre?o=name|popular|videos
router.get('/', async (req, res, next) => {
  try {
    const order = req.query.o || 'name';
    const { order: resolvedOrder, genres } = await scrapeGenreList(order);
    res.json({
      success: true,
      order: resolvedOrder,
      count: genres.length,
      genres,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/genre/:slug?o=popular&period=this-week&page=2
router.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      throw Errors.BadParam('Slug genre tidak valid');
    }

    const order  = req.query.o || 'recent';
    const period = req.query.period || 'all-time';
    const page   = parsePage(req.query.page);

    if (req.query.o && !VALID_ORDERS.includes(order)) {
      throw Errors.BadParam(`Order tidak valid. Pilihan: ${VALID_ORDERS.join(', ')}`);
    }

    if (req.query.period && !VALID_PERIODS.includes(period)) {
      throw Errors.BadParam(`Period tidak valid. Pilihan: ${VALID_PERIODS.join(', ')}`);
    }

    if (req.query.period && order === 'recent') {
      throw Errors.BadParam('Period tidak tersedia untuk order "recent"');
    }

    const result = await scrapeGenreVideos(slug, page, order, period);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
