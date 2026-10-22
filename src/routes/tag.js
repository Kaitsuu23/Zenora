/**
 * GET /api/tag/:slug?page=<n>  (default: 1)
 */

const express = require('express');
const { scrapeTag } = require('../scrapers/tag');
const { parsePage } = require('../utils/validators');
const { Errors } = require('../utils/errors');

const router = express.Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      throw Errors.BadParam('Slug tag tidak valid');
    }

    const page   = parsePage(req.query.page);
    const result = await scrapeTag(slug, page);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
