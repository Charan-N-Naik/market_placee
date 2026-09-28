/**
 * cache.js — Lightweight in-memory API response cache
 *
 * Usage: add cache(ttlSeconds) to any route that is read-heavy and safe to cache.
 *
 *   router.get("/listings", cache(30), listingsController.getAll);
 *
 * Cache is automatically invalidated after TTL expires.
 * Cache is automatically SKIPPED if user is authenticated (publicOnly mode).
 */

const store = new Map(); // { key: { data, expiresAt } }

/**
 * @param {number} ttl - seconds to cache the response
 * @param {boolean} publicOnly - if true, skip cache for authenticated users (default: true)
 */
export const cache = (ttl = 30, publicOnly = true) => (req, res, next) => {
  // Skip caching for authenticated users if publicOnly is true
  if (publicOnly && req.headers.authorization) {
    return next();
  }

  const key = `${req.method}:${req.originalUrl}`;
  const cached = store.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached.data);
  }

  // Intercept res.json to capture the response and cache it
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode === 200) {
      store.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
      setTimeout(() => store.delete(key), ttl * 2 * 1000);
    }
    res.setHeader("X-Cache", "MISS");
    return originalJson(data);
  };

  next();
};

export const invalidateCache = (pattern) => {
  for (const key of store.keys()) {
    if (key.includes(pattern)) {
      store.delete(key);
    }
  }
};

export const cacheStats = () => ({
  size: store.size,
  keys: [...store.keys()],
});
