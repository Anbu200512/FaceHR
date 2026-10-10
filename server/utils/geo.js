const EARTH_RADIUS_METERS = 6371000;

const toRadians = (deg) => (Number(deg) * Math.PI) / 180;

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const aLat = Number(lat1);
  const aLon = Number(lon1);
  const bLat = Number(lat2);
  const bLon = Number(lon2);

  if (![aLat, aLon, bLat, bLon].every((n) => Number.isFinite(n))) return null;

  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
}

function isWithinRadiusMeters(lat1, lon1, lat2, lon2, radiusMeters) {
  const distance = haversineDistanceMeters(lat1, lon1, lat2, lon2);
  if (distance === null) return null;
  const radius = Number(radiusMeters);
  if (!Number.isFinite(radius) || radius <= 0) return false;
  return distance <= radius;
}

module.exports = { haversineDistanceMeters, isWithinRadiusMeters, EARTH_RADIUS_METERS };