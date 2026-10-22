/**
 * GET /api/browse/:type
 *   :type   = releaseday | rated | discussed | downloaded | longest | watched
 *             (recent → /api/recent, popular → /api/popular, both also work here)
 *   ?period = all-time|today|yesterday|this-week|this-month|this-year  (default: all-time)
 *   ?page   = <n>  (default: 1)
 */

const express = require('express');
const { scrapeBrowse, VALID_TYPES, VALID_PERIODS, NO_PERIOD_TYPES } = require('../scrapers/browse');
const { parsePage } = require('../utils/validators');
const { Errors } = require('../utils/errors');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    description: 'Daftar semua browse type yang tersedia',
    periodOptions: VALID_PERIODS,
    types: VALID_TYPES.map((type) => ({
      type,
      endpoint: `/api/browse/${type}`,
      supportsPeriod: !NO_PERIOD_TYPES.includes(type),
    })),
  });
});

router.get('/:type', async (req, res, next) => {
  try {
    const type   = req.params.type;
    const period = req.query.period || 'all-time';
    const page   = parsePage(req.query.page);

    if (!VALID_TYPES.includes(type)) {
      throw Errors.BadParam(`Type tidak valid. Pilihan: ${VALID_TYPES.join(', ')}`);
    }

    if (req.query.period && NO_PERIOD_TYPES.includes(type)) {
      throw Errors.BadParam(`"${type}" tidak memiliki filter period`);
    }

    if (req.query.period && !VALID_PERIODS.includes(period)) {
      throw Errors.BadParam(`Period tidak valid. Pilihan: ${VALID_PERIODS.join(', ')}`);
    }

    const result = await scrapeBrowse(type, page, period);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
