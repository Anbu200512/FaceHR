/**
 * The React client was written against MongoDB and reads `_id` everywhere.
 * PostgreSQL rows use `id` (UUID). This middleware adds an `_id` alias to every
 * object that has an `id` (recursively) so existing client code keeps working
 * while the API also exposes the modern `id` field.
 */
function withMongoAliases(value) {
  if (Array.isArray(value)) return value.map(withMongoAliases);
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = withMongoAliases(val);
    }
    if (out.id !== undefined && out._id === undefined) out._id = out.id;
    return out;
  }
  return value;
}

module.exports = function mongoCompat(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(withMongoAliases(body));
  next();
};

module.exports.withMongoAliases = withMongoAliases;
