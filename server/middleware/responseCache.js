'use strict';

const cache = require('../utils/cache');

/**
 * Caches successful JSON GET responses for `ttlMs`.
 *
 * `keyFn(req)` builds the cache key; by default the full URL is used. Only 2xx
 * responses are cached, and the raw body is stored (mongoCompat still adds the
 * `_id` aliases on every response).
 */
module.exports = function responseCache(ttlMs, keyFn) {
  return function cacheMiddleware(req, res, next) {
    if (req.method !== 'GET') return next();

    const key = typeof keyFn === 'function' ? keyFn(req) : req.originalUrl;
    const cached = cache.get(key);
    const originalJson = res.json.bind(res);

    if (cached !== undefined) {
      res.set('X-Cache', 'HIT');
      return originalJson(cached);
    }

    res.set('X-Cache', 'MISS');
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 400) cache.set(key, body, ttlMs);
      return originalJson(body);
    };

    return next();
  };
};
