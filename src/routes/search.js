/**
 * GET /api/search
 *   ?q=<query>                                                              (required)
 *   ?o=relevance|recent|popular|rated|discussed|downloaded                  (default: recent)
 *   ?period=today|yesterday|this-week|this-month|this-year|all-time         (default: all-time, ignored for relevance)
 *   ?page=<n>                                                                (default: 1)
 */

const express = require('express');
const { scrapeSearch, VALID_ORDERS, VALID_PERIODS, PERIOD_ORDERS } = require('../scrapers/search');
const { requireQuery, parsePage } = require('../utils/validators');
const { Errors } = require('../utils/errors');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const query  = requireQuery(req.query.q);
    const order  = req.query.o      || 'recent';
    const period = req.query.period || 'all-time';
    const page   = parsePage(req.query.page);

    if (req.query.o && !VALID_ORDERS.includes(order)) {
      throw Errors.BadParam(`Order tidak valid. Pilihan: ${VALID_ORDERS.join(', ')}`);
    }

    if (req.query.period && !VALID_PERIODS.includes(period)) {
      throw Errors.BadParam(`Period tidak valid. Pilihan: ${VALID_PERIODS.join(', ')}`);
    }

    if (req.query.period && !PERIOD_ORDERS.includes(order)) {
      throw Errors.BadParam(`Period hanya tersedia untuk order: ${PERIOD_ORDERS.join(', ')}`);
    }

    const result = await scrapeSearch(query, page, order, period);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
