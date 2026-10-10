import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function makePinIcon(color = '#2543eb') {
  return L.divIcon({
    className: '',
    html: `<div class="hr-map-pin" style="background:${color};"><span></span></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  });
}

export default function GeofenceMap({ center, radius = 100, interactive = false, onPick, height = 320, zoom = 15, className = '' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const lat = Number(center?.latitude ?? center?.lat);
  const lng = Number(center?.longitude ?? center?.lng);
  const hasCenter = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: hasCenter ? [lat, lng] : [13.0866182, 80.1916159],
      zoom,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer(OSM_TILES, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    map.on('click', (e) => {
      if (!interactive) return;
      onPick?.({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCenter) return;

    // Re-center only when the actual center changes, so the user's pan/zoom
    // position is preserved when just the radius is edited.
    map.setView([lat, lng], Math.max(map.getZoom(), zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, hasCenter, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCenter) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: makePinIcon(), draggable: interactive }).addTo(map);
      markerRef.current.on('dragend', (_e) => {
        if (!interactive) return;
        const ll = markerRef.current.getLatLng();
        onPick?.({ lat: Number(ll.lat.toFixed(6)), lng: Number(ll.lng.toFixed(6)) });
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
      if (interactive) {
        markerRef.current.dragging?.enable();
      } else {
        markerRef.current.dragging?.disable();
      }
    }

    if (!circleRef.current) {
      circleRef.current = L.circle([lat, lng], {
        radius: Math.max(1, Number(radius) || 1),
        color: '#2543eb',
        weight: 2,
        fillColor: 'rgba(37, 67, 235, 0.12)',
        fillOpacity: 1,
        dashArray: '6 4',
      }).addTo(map);
    } else {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(Math.max(1, Number(radius) || 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, radius, interactive, hasCenter, onPick]);

  return <div ref={containerRef} style={{ height }} className={`z-0 overflow-hidden rounded-xl ${className}`} />;
}