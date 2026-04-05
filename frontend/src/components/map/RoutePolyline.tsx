import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface RoutePolylineProps {
  positions: [number, number][];
  dashed?: boolean;
  color?: string;
}

export default function RoutePolyline({ positions, dashed = false, color = '#5A5AFF' }: RoutePolylineProps) {
  const map = useMap();
  const lineRef = useRef<L.Polyline | null>(null);

  // Create polyline on mount; recreate only when style options change
  useEffect(() => {
    if (lineRef.current) lineRef.current.remove();
    lineRef.current = null;

    if (positions.length < 2) return;

    lineRef.current = L.polyline(positions, {
      color,
      weight: 4,
      opacity: 0.85,
      dashArray: dashed ? '10 8' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    return () => {
      if (lineRef.current) {
        lineRef.current.remove();
        lineRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, dashed, color]);

  // Update positions in-place (no remove/recreate = no flicker)
  useEffect(() => {
    if (!lineRef.current) return;
    if (positions.length < 2) {
      lineRef.current.setLatLngs([]);
      return;
    }
    lineRef.current.setLatLngs(positions);
  }, [positions]);

  return null;
}
