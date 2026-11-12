const dns = require('dns');
const https = require('https');

// Some networks' DNS resolvers refuse queries for *.neon.tech zones (for
// example `us-east-2.aws.neon.tech`), which makes Prisma fail with P1001 even
// though the database is healthy. Resolve Neon hostnames over DNS-over-HTTPS
// (HTTPS/443) so the app works on those networks without changing system DNS.
const originalLookup = dns.lookup.bind(dns);
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;
const DOH_TIMEOUT_MS = 5000;

function fetchDoh(hostname) {
  return new Promise((resolve, reject) => {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`;
    const req = https.get(url, { headers: { accept: 'application/dns-json' }, timeout: DOH_TIMEOUT_MS }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const addresses = (json.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
          if (!addresses.length) {
            reject(new Error(`DoH returned no A records for ${hostname}`));
            return;
          }
          resolve(addresses);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('DoH lookup timed out')));
    req.on('error', reject);
  });
}

function deliver(addresses, options, callback) {
  if (options.all) {
    callback(
      null,
      addresses.map((address) => ({ address, family: 4 }))
    );
  } else {
    callback(null, addresses[0], 4);
  }
}

function dohLookup(hostname, options, callback) {
  let opts = options;
  let cb = callback;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  opts = opts || {};

  if (!/\.neon\.tech$/i.test(hostname)) {
    return originalLookup(hostname, opts, cb);
  }

  const cached = cache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return deliver(cached.addresses, opts, cb);
  }

  // Prefer the OS resolver (fast and correct on most networks) and only fall
  // back to DNS-over-HTTPS when it refuses or fails.
  return originalLookup(hostname, opts, (err, address, family) => {
    if (!err) {
      const addresses = opts.all ? address.map((entry) => entry.address) : [address];
      cache.set(hostname, { addresses, expiresAt: Date.now() + CACHE_TTL_MS });
      return cb(null, address, family);
    }

    return fetchDoh(hostname)
      .then((addresses) => {
        cache.set(hostname, { addresses, expiresAt: Date.now() + CACHE_TTL_MS });
        deliver(addresses, opts, cb);
      })
      .catch(() => cb(err));
  });
}

module.exports = { dohLookup };
