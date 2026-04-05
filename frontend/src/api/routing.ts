const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_TIMEOUT = 5000; // 5 seconds max

export interface OSRMRouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs (Leaflet order)
  distance: number; // metres
  duration: number; // seconds
}

/**
 * Fetch a road-matched route from the OSRM public demo server.
 * Returns an array of [lat, lng] pairs ready for Leaflet.
 * Falls back to [] on any error (caller should use hardcoded trail as fallback).
 */
export async function fetchOSRMRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<[number, number][]> {
  const result = await fetchOSRMRouteDetailed(from, to);
  return result.coordinates;
}

/**
 * Fetch OSRM route with full metadata (distance, duration).
 */
export async function fetchOSRMRouteDetailed(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<OSRMRouteResult> {
  const empty: OSRMRouteResult = { coordinates: [], distance: 0, duration: 0 };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT);

    const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return empty;
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];
      // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );
      return {
        coordinates,
        distance: route.distance ?? 0,
        duration: route.duration ?? 0,
      };
    }
    return empty;
  } catch {
    return empty;
  }
}
