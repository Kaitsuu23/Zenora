/**
 * GET /api/home
 *
 * Returns the homepage video sections (lazy-loaded panels), aggregated
 * by fetching each panel's AJAX endpoint in parallel.
 */

const express = require('express');
const { scrapeHome } = require('../scrapers/home');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const sections = await scrapeHome();
    res.json({
      success: true,
      count: sections.length,
      sections,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
