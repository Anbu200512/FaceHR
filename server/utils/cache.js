'use strict';

/**
 * Tiny in-process TTL cache.
 *
 * This deployment runs as a single Node process (Render free/starter), so a
 * per-process cache is enough to remove the repeated, expensive read queries
 * that every dashboard/polling request would otherwise trigger.
 *
 * Only cache data that tolerates a few seconds of staleness.
 */

const store = new Map();
const inflight = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expires <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  if (!ttlMs || ttlMs <= 0) return value;
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

function del(key) {
  store.delete(key);
}

function delByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Returns the cached value, or runs `fn` once and caches its result. Concurrent
 * callers for the same key share a single in-flight promise (no stampede).
 */
async function getOrSet(key, ttlMs, fn) {
  const cached = get(key);
  if (cached !== undefined) return cached;

  if (inflight.has(key)) return inflight.get(key);

  const promise = Promise.resolve()
    .then(fn)
    .then((value) => {
      set(key, value, ttlMs);
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

module.exports = { get, set, del, delByPrefix, getOrSet };
