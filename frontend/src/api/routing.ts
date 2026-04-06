const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_MATCH_BASE = 'https://router.project-osrm.org/match/v1/driving';
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
  to: { lat: number; lng: number },
  via?: Array<{ lat: number; lng: number }>,
): Promise<[number, number][]> {
  const result = await fetchOSRMRouteDetailed(from, to, via);
  return result.coordinates;
}

/**
 * Fetch OSRM route with full metadata (distance, duration).
 * Pass `via` waypoints to force the route through specific roads
 * (prevents OSRM from taking small side-road shortcuts).
 */
export async function fetchOSRMRouteDetailed(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  via?: Array<{ lat: number; lng: number }>,
): Promise<OSRMRouteResult> {
  const empty: OSRMRouteResult = { coordinates: [], distance: 0, duration: 0 };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT);

    // Build coordinate string: from ; via1 ; via2 ; ... ; to
    const allPoints = [from, ...(via || []), to];
    const coordStr = allPoints.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`;
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
  } catch (e) {
    console.warn('[OSRM] Route fetch failed:', e);
    return empty;
  }
}


export async function matchToRoad(
  waypoints: Array<{ lat: number; lng: number }>,
): Promise<[number, number][]> {
  if (waypoints.length < 2) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT);

    const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
    const radiuses = waypoints.map(() => '50').join(';');
    const url = `${OSRM_MATCH_BASE}/${coords}?overview=full&geometries=geojson&radiuses=${radiuses}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();

    if (data.code === 'Ok' && data.matchings?.length > 0) {
      // Combine all matching geometries (usually just one)
      const allCoords: [number, number][] = [];
      for (const matching of data.matchings) {
        for (const [lng, lat] of matching.geometry.coordinates) {
          allCoords.push([lat, lng] as [number, number]);
        }
      }
      return allCoords;
    }
    return [];
  } catch (e) {
    console.warn('[OSRM] Match API failed:', e);
    return [];
  }
}
