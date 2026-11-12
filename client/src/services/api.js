import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // Generous timeout: a sleeping free-tier server can take a while to wake up.
  timeout: 60000,
});

// Keep recently-fetched GET responses in memory. Page navigations then paint
// instantly instead of waiting for the remote database again.
const GET_CACHE_TTL = 30000;
const GET_CACHE_MAX = 250;
const getCache = new Map();
const inflight = new Map();
let cacheEpoch = 0;

function cacheToken() {
  return localStorage.getItem('facehr_token') || '';
}

function cacheKey(url, config) {
  const params = config?.params ? JSON.stringify(config.params) : '';
  return `${cacheToken()}|${url}|${params}`;
}

export function clearApiCache() {
  // Bump the epoch so responses already in flight don't repopulate stale data.
  cacheEpoch += 1;
  getCache.clear();
}

const rawGet = api.get.bind(api);

api.get = (url, config = {}) => {
  if (config?.noCache) return rawGet(url, config);

  const epoch = cacheEpoch;
  const key = cacheKey(url, config);
  const hit = getCache.get(key);
  if (hit && Date.now() - hit.at < GET_CACHE_TTL) {
    return Promise.resolve({ ...hit.response, fromCache: true });
  }

  // De-duplicate identical GETs (React StrictMode mounts effects twice in dev).
  // The epoch keeps requests from before an invalidation out of the cache.
  const requestKey = `${epoch}|${key}`;
  if (inflight.has(requestKey)) return inflight.get(requestKey);

  const promise = rawGet(url, config)
    .then((res) => {
      if (epoch === cacheEpoch) {
        getCache.set(key, { at: Date.now(), response: res });
        if (getCache.size > GET_CACHE_MAX) getCache.delete(getCache.keys().next().value);
      }
      return res;
    })
    .finally(() => inflight.delete(requestKey));

  inflight.set(requestKey, promise);
  return promise;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('facehr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Centralized error handling: backend always returns { success, message }
api.interceptors.response.use(
  (res) => {
    // Any successful write invalidates cached reads so lists refresh immediately.
    if ((res.config?.method || 'get').toLowerCase() !== 'get') clearApiCache();
    return res;
  },
  async (err) => {
    const cfg = err.config || {};
    const method = (cfg.method || 'get').toLowerCase();
    const status = err.response?.status;
    const retriable = method === 'get' && (!err.response || status === 502 || status === 503 || status === 504);

    // Free-tier servers sleep when idle; retry once while they cold-start.
    if (retriable && !cfg.__retried) {
      cfg.__retried = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api(cfg);
    }

    if (err.code === 'ECONNABORTED') {
      err.userMessage = 'The server is taking too long to respond (it may be waking up). Please try again.';
    } else if (!err.response) {
      err.userMessage = 'Network error. Please check your connection and try again.';
    } else if (err.response.status === 401) {
      const isAuthCall = err.config?.url?.includes('/auth/');
      if (!isAuthCall) {
        localStorage.removeItem('facehr_token');
        localStorage.removeItem('facehr_user');
        clearApiCache();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      err.userMessage = err.response.data?.message || 'Please sign in again.';
    } else if (err.response.status === 429) {
      err.userMessage = err.response.data?.message || 'Too many requests. Please wait a moment and try again.';
    } else {
      err.userMessage = err.response.data?.message || 'Something went wrong. Please try again.';
    }
    return Promise.reject(err);
  }
);

/** Graceful helper that turns an error into a human-friendly message */
export function extractError(err, fallback = 'Something went wrong. Please try again.') {
  return err?.userMessage || err?.response?.data?.message || err?.message || fallback;
}

export default api;