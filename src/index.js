/**
 * javhd-api — Express application entry point.
 */

const express = require('express');
const cors    = require('cors');

const config               = require('./config');
const { errorHandler, Errors } = require('./utils/errors');

const homeRouter     = require('./routes/home');
const searchRouter   = require('./routes/search');
const videoRouter    = require('./routes/video');
const genreRouter    = require('./routes/genre');
const channelRouter  = require('./routes/channel');
const browseRouter   = require('./routes/browse');
const pornstarRouter = require('./routes/pornstar');
const tagRouter      = require('./routes/tag');
const hlsProxyRouter = require('./routes/hlsproxy');
const streamRouter     = require('./routes/stream');
const streamPlayRouter = require('./routes/stream-play');

const app = express();

// Pretty-print JSON responses
app.set('json spaces', 2);

// ── Middleware ────────────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(express.json());

app.use(cors({
  origin: config.corsOrigin === '*'
    ? true
    : config.corsOrigin.split(',').map((s) => s.trim()),
  credentials: false,
}));

app.use((req, res, next) => {
  if (!req.timedOut) {
    req.setTimeout(config.requestTimeout + 5000, () => {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: { code: 'UPSTREAM_ERROR', message: 'Request timeout' },
        });
      }
    });
  }
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', baseUrl: config.baseUrl });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/home',     homeRouter);
app.use('/api/search',   searchRouter);
app.use('/api/video',    videoRouter);
app.use('/api/genre',    genreRouter);
app.use('/api/channel',  channelRouter);
app.use('/api/browse',   browseRouter);
app.use('/api/pornstar', pornstarRouter);
app.use('/api/tag',      tagRouter);
app.use('/api/stream',    streamRouter);
app.use('/api/stream',   streamPlayRouter);
app.use('/api/hlsproxy', hlsProxyRouter);

// Root
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'javhd-api',
    endpoints: [
      'GET /api/home',
      'GET /api/browse                                     → list all browse types',
      'GET /api/browse/:type?period=<p>&page=<n>           → type: recent|popular|releaseday|rated|discussed|downloaded|longest|watched',
      'GET /api/search?q=<q>&o=<o>&period=<p>&page=<n>',
      'GET /api/video?url=<video_url>',
      'GET /api/genre?o=name|popular|videos',
      'GET /api/genre/:slug?o=<o>&period=<p>&page=<n>',
      'GET /api/channel/:slug?o=<o>&period=<p>&page=<n>',
      'GET /api/pornstar?o=<o>&letter=<l>&page=<n>',
      'GET /api/pornstar/:slug?o=<o>&page=<n>',
      'GET /api/tag/:slug?page=<n>',
      'GET /api/stream?url=<video_url>                          → list embed servers',
      'GET /api/stream/extract?url=<video_url>&server=<name>   → extract streams from one server',
    ],
  });
});

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  next(Errors.NotFound(`Endpoint "${req.method} ${req.path}" tidak ditemukan`));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`javhd-api listening on http://localhost:${config.port}`);
    console.log(`Target: ${config.baseUrl} | CORS: ${config.corsOrigin}`);
  });
}

module.exports = app;
