import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface DriverMarkerProps {
  lat: number;
  lng: number;
  heading: number;
}

const CAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g transform="rotate(0, 16, 16)">
    <rect x="10" y="4" width="12" height="24" rx="4" fill="#242E42"/>
    <rect x="11.5" y="6" width="9" height="6" rx="2" fill="#5DADE2"/>
    <rect x="11.5" y="20" width="9" height="5" rx="2" fill="#F52D56"/>
    <rect x="8" y="10" width="3" height="5" rx="1.5" fill="#242E42"/>
    <rect x="21" y="10" width="3" height="5" rx="1.5" fill="#242E42"/>
    <rect x="8" y="18" width="3" height="5" rx="1.5" fill="#242E42"/>
    <rect x="21" y="18" width="3" height="5" rx="1.5" fill="#242E42"/>
  </g>
</svg>`;

export default function DriverMarker({ lat, lng, heading }: DriverMarkerProps) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const iconRef = useRef<L.DivIcon | null>(null);

  useEffect(() => {
    if (!iconRef.current) {
      iconRef.current = L.divIcon({
        html: `<div class="car-marker-icon" style="transform: rotate(${heading}deg); width: 32px; height: 32px;">${CAR_SVG}</div>`,
        className: 'car-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: iconRef.current, zIndexOffset: 1000 }).addTo(map);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!markerRef.current) return;

    // Smooth position update
    markerRef.current.setLatLng([lat, lng]);

    // Update heading rotation
    const el = markerRef.current.getElement();
    if (el) {
      const iconDiv = el.querySelector('.car-marker-icon') as HTMLElement;
      if (iconDiv) {
        iconDiv.style.transform = `rotate(${heading}deg)`;
      }
    }
  }, [lat, lng, heading]);

  return null;
}
