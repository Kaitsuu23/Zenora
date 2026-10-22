/**
 * GET /api/channel/:slug
 *   ?o=recent|popular|rated|discussed|downloaded|longest|watched  (default: recent)
 *   ?period=today|yesterday|this-week|this-month|this-year|all-time (default: all-time, non-recent only)
 *   ?page=<n>                                                        (default: 1)
 */

const express = require('express');
const { scrapeChannel, VALID_ORDERS, VALID_PERIODS } = require('../scrapers/channel');
const { parsePage } = require('../utils/validators');
const { Errors } = require('../utils/errors');

const router = express.Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      throw Errors.BadParam('Slug channel tidak valid');
    }

    const order  = req.query.o      || 'recent';
    const period = req.query.period || 'all-time';
    const page   = parsePage(req.query.page);

    if (req.query.o && !VALID_ORDERS.includes(order)) {
      throw Errors.BadParam(`Order tidak valid. Pilihan: ${VALID_ORDERS.join(', ')}`);
    }

    if (req.query.period && !VALID_PERIODS.includes(period)) {
      throw Errors.BadParam(`Period tidak valid. Pilihan: ${VALID_PERIODS.join(', ')}`);
    }

    const result = await scrapeChannel(slug, page, order, period);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
