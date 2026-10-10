export const COMPANY_LOCATION = {
  name: 'Nuvox Technologies',
  latitude: 13.0866182,
  longitude: 80.1916159,
};

export const DEFAULT_ALLOWED_RADIUS_METERS = 100;

const EARTH_RADIUS_METERS = 6371000;
const toRadians = (deg) => (Number(deg) * Math.PI) / 180;

export function haversineDistanceM(aLat, aLon, bLat, bLon) {
  const lat1 = Number(aLat);
  const lon1 = Number(aLon);
  const lat2 = Number(bLat);
  const lon2 = Number(bLon);
  if (![lat1, lon1, lat2, lon2].every((n) => Number.isFinite(n))) return null;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isWithinRadiusMeters(lat, lon, radiusMeters, center = COMPANY_LOCATION) {
  const d = haversineDistanceM(lat, lon, center.latitude, center.longitude);
  if (d === null) return null;
  return { within: d <= Number(radiusMeters), distance: Math.round(d) };
}

export function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      return resolve({
        ok: false,
        code: 'LOCATION_UNAVAILABLE',
        message: 'Location is not supported by this browser or device.',
      });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy;
        if (accuracy != null && accuracy > 500) {
          return resolve({
            ok: false,
            code: 'POOR_ACCURACY',
            message: 'Your current location is too imprecise to verify the geofence. Move to an open area and try again.',
          });
        }
        resolve({
          ok: true,
          location: {
            latitude: Math.round(pos.coords.latitude * 1e6) / 1e6,
            longitude: Math.round(pos.coords.longitude * 1e6) / 1e6,
            accuracy: accuracy != null ? Math.round(accuracy) : null,
          },
        });
      },
      (err) => resolve(geolocationError(err)),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  });
}

function geolocationError(err) {
  switch (err && err.code) {
    case 1:
      return { ok: false, code: 'LOCATION_DENIED', message: 'Location access was denied. Please allow location for the HR portal and try again.' };
    case 2:
      return { ok: false, code: 'LOCATION_UNAVAILABLE', message: 'Your location could not be determined right now. Please try again.' };
    case 3:
      return { ok: false, code: 'LOCATION_TIMEOUT', message: 'Timed out while trying to get your location. Please try again.' };
    default:
      return { ok: false, code: 'LOCATION_ERROR', message: 'Could not get your location. Please try again.' };
  }
}