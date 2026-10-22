/**
 * Typed errors + Express error handler middleware.
 *
 * Routes throw ApiError subclasses; the error handler turns them into the
 * JSON error envelope documented in the README:
 *
 *   { "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
 *
 * Routes can also throw plain Axios errors — the handler maps those to
 * the right HTTP status (502 for upstream failures, 429 for rate-limit).
 */

class ApiError extends Error {
  constructor(code, message, status = 500, extra = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (extra) this.extra = extra;
  }
}

const Errors = {
  BadParam: (msg = 'Invalid parameter') => new ApiError('BAD_REQUEST', msg, 400),
  NotFound: (msg = 'Data tidak ditemukan') => new ApiError('NOT_FOUND', msg, 404),
  TooMany: (msg = 'Terlalu banyak request') => new ApiError('RATE_LIMITED', msg, 429),
  Upstream: (msg = 'Target website gagal diakses') => new ApiError('UPSTREAM_ERROR', msg, 502),
  Internal: (msg = 'Server error') => new ApiError('INTERNAL_ERROR', msg, 500),
};

/**
 * Express error handler. Must be registered AFTER all routes.
 */
function errorHandler(err, _req, res, _next) {
  // Axios "upstream" errors: translate into our 502 envelope.
  if (err?.isAxiosError) {
    const status = err.response?.status;
    if (status === 429) err = Errors.TooMany('Target website sedang rate-limit');
    else if (status === 404) err = Errors.NotFound('Halaman target tidak ditemukan');
    else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT')
      err = Errors.Upstream('Target website timeout');
    else err = Errors.Upstream(`Target website gagal diakses (${err.code || status || 'unknown'})`);
  }

  // Validation errors thrown by express/ajv-style middleware.
  if (err?.name === 'ValidationError') {
    err = new ApiError('BAD_REQUEST', err.message, 400);
  }

  if (err instanceof ApiError) {
    const body = { success: false, error: { code: err.code, message: err.message } };
    if (err.extra) body.error.details = err.extra;
    return res.status(err.status).json(body);
  }

  // Fallback: unknown error → 500.
  const internal = Errors.Internal();
  return res.status(internal.status).json({
    success: false,
    error: { code: internal.code, message: internal.message },
  });
}

module.exports = {
  ApiError,
  Errors,
  errorHandler,
};
