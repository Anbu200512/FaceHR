import { useEffect, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import GeofenceMap from './GeofenceMap';
import { getCurrentLocation } from '../services/geo';

const RESOLVED_LOCATION_ERROR = {
  LOCATION_DENIED: 'Location permission was denied. Please allow location access for the HR portal and try again.',
  LOCATION_UNAVAILABLE: 'Location is unavailable on this device right now. Please try again.',
  LOCATION_TIMEOUT: 'Timed out while getting your location. Please try again.',
  POOR_ACCURACY: 'Your current location is too imprecise for the company geofence. Move to an open area and try again.',
};

function initialCenter(initial = {}) {
  const lat = Number(initial?.latitude ?? initial?.lat);
  const lng = Number(initial?.longitude ?? initial?.lng);
  return {
    lat: Number.isFinite(lat) ? lat : 13.0866182,
    lng: Number.isFinite(lng) ? lng : 80.1916159,
  };
}

export default function LocationPickerModal({ open, onClose, onConfirm, initial = {} }) {
  const [center, setCenter] = useState(() => initialCenter(initial));
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCenter(initialCenter(initial));
    setLocateError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const useMyLocation = async () => {
    if (!('geolocation' in navigator)) {
      setLocateError('Location is not supported by this browser or device. You can click the map to choose the company location instead.');
      return;
    }
    setLocating(true);
    setLocateError('');
    const res = await getCurrentLocation();
    setLocating(false);
    if (!res.ok) {
      const detail = RESOLVED_LOCATION_ERROR[res.code] || res.message || 'Could not get your location.';
      setLocateError(`${detail} You can also click the map to choose the company location.`);
      return;
    }
    setCenter({ lat: res.location.latitude, lng: res.location.longitude });
  };

  const handleConfirm = () => {
    onConfirm?.(center);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Company Location"
      subtitle="Click or drag the marker on the map to set the company's attendance location."
      size="xl"
      footer={
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LocateFixed className="h-4 w-4" /> {locating ? 'Locating…' : 'Use Current Location'}
          </button>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={handleConfirm} disabled={locating}>
              <MapPin className="h-4 w-4" /> Confirm Location
            </Button>
          </div>
        </div>
      }
    >
      {locateError && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          {locateError}
        </p>
      )}
      <GeofenceMap center={center} radius={0} interactive onPick={setCenter} height={380} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          Selected: <span className="font-mono text-slate-600 dark:text-slate-300">{center.lat}°, {center.lng}°</span>
        </span>
        <span>Click anywhere on the map to move the pin.</span>
      </div>
    </Modal>
  );
}