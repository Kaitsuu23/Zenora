/**
 * GET /api/pornstar
 *   ?o=recent|popular|rated|subscribed|videos  (default: recent)
 *   ?letter=all|a–z                             (default: all)
 *   ?page=<n>                                   (default: 1)
 *
 * GET /api/pornstar/:slug
 *   ?o=recent|popular|rated  (default: recent)
 *   ?page=<n>                (default: 1)
 */

const express = require('express');
const {
  scrapePornstarList,
  scrapePornstarDetail,
  LIST_ORDERS,
  DETAIL_ORDERS,
  LETTERS,
} = require('../scrapers/pornstar');
const { parsePage } = require('../utils/validators');
const { Errors } = require('../utils/errors');

const router = express.Router();

// GET /api/pornstar
router.get('/', async (req, res, next) => {
  try {
    const order  = req.query.o      || 'recent';
    const letter = req.query.letter || 'all';
    const page   = parsePage(req.query.page);

    if (req.query.o && !LIST_ORDERS.includes(order)) {
      throw Errors.BadParam(`Order tidak valid. Pilihan: ${LIST_ORDERS.join(', ')}`);
    }
    if (req.query.letter && !LETTERS.includes(letter)) {
      throw Errors.BadParam(`Letter tidak valid. Pilihan: all, a–z`);
    }

    const result = await scrapePornstarList(page, order, letter);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/pornstar/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      throw Errors.BadParam('Slug pornstar tidak valid');
    }

    const order = req.query.o || 'recent';
    const page  = parsePage(req.query.page);

    if (req.query.o && !DETAIL_ORDERS.includes(order)) {
      throw Errors.BadParam(`Order tidak valid. Pilihan: ${DETAIL_ORDERS.join(', ')}`);
    }

    const result = await scrapePornstarDetail(slug, page, order);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
