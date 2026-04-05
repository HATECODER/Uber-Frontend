import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DriverMarker from './DriverMarker';
import RoutePolyline from './RoutePolyline';

interface MapLayerProps {
  center: [number, number];
  pickupPos: [number, number];
  destPos: [number, number];
  driverPos?: { lat: number; lng: number; heading: number } | null;
  /** Full OSRM road-matched route. When provided, renders completed+remaining split. */
  fullRoute?: [number, number][];
  /** Fallback trail of visited GPS points (used when fullRoute not yet loaded). */
  routePoints?: [number, number][];
  trackingPhase: 'arrival' | 'trip' | 'completed';
  zoom?: number;
}

const destIcon = L.divIcon({
  html: `<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" fill="#F52D56"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [24, 32],
  iconAnchor: [12, 32],
});

/** Find the index in `route` closest to `pos` (used to split completed vs remaining). */
function findSplitIndex(route: [number, number][], pos: { lat: number; lng: number }): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < route.length; i++) {
    const dlat = route[i][0] - pos.lat;
    const dlng = route[i][1] - pos.lng;
    const d = dlat * dlat + dlng * dlng;
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

function MapAutoCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

export default function MapLayer({ center, pickupPos, destPos, driverPos, fullRoute, routePoints, trackingPhase, zoom = 14 }: MapLayerProps) {
  const isDashed = trackingPhase === 'arrival';

  // Split fullRoute into completed (gray) + remaining (green) at driver position
  const { completedPath, remainingPath } = useMemo(() => {
    if (fullRoute && fullRoute.length > 1 && driverPos) {
      const idx = findSplitIndex(fullRoute, driverPos);
      return {
        completedPath: fullRoute.slice(0, idx + 1),
        remainingPath: fullRoute.slice(idx),
      };
    }
    return { completedPath: [] as [number, number][], remainingPath: [] as [number, number][] };
  }, [fullRoute, driverPos]);

  const hasSplitRoute = fullRoute && fullRoute.length > 1;
  const hasFallbackTrail = !hasSplitRoute && routePoints && routePoints.length > 1;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <CircleMarker
        center={pickupPos}
        radius={8}
        pathOptions={{ color: '#4CE5B1', fillColor: '#4CE5B1', fillOpacity: 1, weight: 2 }}
      />

      <Marker position={destPos} icon={destIcon} />

      {/* OSRM split route: completed segment in gray, remaining in green */}
      {hasSplitRoute && (
        <>
          <RoutePolyline positions={completedPath} color="#AAAAAA" dashed={false} />
          <RoutePolyline positions={remainingPath} color="#4CE5B1" dashed={isDashed} />
        </>
      )}

      {/* Fallback: show plain trail when OSRM route not yet loaded */}
      {hasFallbackTrail && (
        <RoutePolyline positions={routePoints!} color="#4CE5B1" dashed={isDashed} />
      )}

      {driverPos && (
        <DriverMarker lat={driverPos.lat} lng={driverPos.lng} heading={driverPos.heading} />
      )}

      <MapAutoCenter center={center} />
    </MapContainer>
  );
}
