/**
 * Driver simulation engine.
 *
 * Walks a list of SimulationPoint[] emitting
 * `driver:location:update` telemetry to the backend via Socket.io.
 *
 * Tick interval is computed dynamically from OSRM duration so the
 * car follows every road curve without cutting through buildings.
 */

import type { Socket } from 'socket.io-client';
import { matchToRoad } from '../api/routing';

// ── Types ──

export interface SimulationPoint {
  lat: number;
  lng: number;
  heading: number;
  speed: number; // km/h
}

export type TrackingPhase = 'arrival' | 'trip';
export type RouteSource = 'osrm' | 'manual';

// ── Heading / distance helpers ──

export function calculateHeading(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return parseFloat((((toDeg(Math.atan2(y, x)) % 360) + 360) % 360).toFixed(2));
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── OSRM route → simulation points ──

/** Max simulation points (prevents socket spam on very long routes). */
const MAX_SIM_POINTS = 120;
/** Minimum tick interval in ms (floor to avoid overwhelming the socket). */
const MIN_TICK_MS = 300;
/** Default tick interval when no OSRM duration is available. */
const DEFAULT_TICK_MS = 4000;
/** Speed multiplier for demo — 6x means a 5 min drive completes in ~50 sec. */
const SIM_SPEED_MULTIPLIER = 6;

/**
 * Lightly downsample to MAX_SIM_POINTS only when the OSRM route is
 * extremely dense.  Keeps road-level precision intact for typical routes.
 */
function downsample(
  coords: Array<{ lat: number; lng: number }>,
  maxCount: number,
): Array<{ lat: number; lng: number }> {
  if (coords.length <= maxCount) return coords;

  const step = (coords.length - 1) / (maxCount - 1);
  const result: Array<{ lat: number; lng: number }> = [];
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.min(Math.round(i * step), coords.length - 1);
    result.push(coords[idx]);
  }
  // Ensure last point is exact destination
  result[result.length - 1] = coords[coords.length - 1];
  return result;
}

function headingDelta(h1: number, h2: number): number {
  let d = Math.abs(h2 - h1);
  if (d > 180) d = 360 - d;
  return d;
}

function assignSpeedProfile(points: Array<{ lat: number; lng: number; heading: number }>): SimulationPoint[] {
  return points.map((p, i, arr) => {
    // Start slow, end slow, faster in middle
    const fraction = i / Math.max(arr.length - 1, 1);

    // Base speed curve: ramp up → cruise → ramp down
    let speed: number;
    if (fraction < 0.1) {
      speed = 10 + fraction * 200; // 10-30 km/h ramp up
    } else if (fraction > 0.9) {
      speed = 10 + (1 - fraction) * 200; // ramp down
    } else {
      speed = 30 + Math.random() * 15; // cruise 30-45 km/h
    }

    // Slow down at turns
    if (i > 0 && i < arr.length - 1) {
      const delta = headingDelta(arr[i - 1].heading, p.heading);
      if (delta > 30) speed = Math.max(12, speed * 0.5);
      else if (delta > 15) speed = Math.max(18, speed * 0.7);
    }

    // First and last point speed = 0
    if (i === 0 || i === arr.length - 1) speed = 0;

    return { lat: p.lat, lng: p.lng, heading: p.heading, speed: parseFloat(speed.toFixed(1)) };
  });
}

/**
 * Build simulation points from OSRM coordinates.
 * Uses ALL OSRM points — they are already road-matched, so no
 * downsampling is needed.  MIN_TICK_MS prevents socket flooding.
 */
export function buildSimulationPointsFromOsrm(
  osrmCoords: [number, number][], // [lat, lng] already flipped
): SimulationPoint[] {
  const asObjects = osrmCoords.map(([lat, lng]) => ({ lat, lng }));

  const withHeadings = asObjects.map((p, i, arr) => {
    const next = arr[Math.min(i + 1, arr.length - 1)];
    return {
      ...p,
      heading: i < arr.length - 1
        ? calculateHeading(p.lat, p.lng, next.lat, next.lng)
        : (i > 0 ? calculateHeading(arr[i - 1].lat, arr[i - 1].lng, p.lat, p.lng) : 0),
    };
  });

  return assignSpeedProfile(withHeadings);
}

/**
 * Build simulation points from manual/fallback waypoints.
 * Snaps them to roads via OSRM Match API first; if that fails,
 * uses the raw waypoints as-is.
 */
export async function buildSimulationPointsFromManual(
  waypoints: Array<{ lat: number; lng: number }>,
): Promise<SimulationPoint[]> {
  // Try snapping to roads via Match API
  try {
    const matched = await matchToRoad(waypoints);
    if (matched.length > 1) {
      const sampled = downsample(
        matched.map(([lat, lng]) => ({ lat, lng })),
        MAX_SIM_POINTS,
      );
      const withHeadings = sampled.map((p, i, arr) => {
        const next = arr[Math.min(i + 1, arr.length - 1)];
        return {
          ...p,
          heading: i < arr.length - 1
            ? calculateHeading(p.lat, p.lng, next.lat, next.lng)
            : (i > 0 ? calculateHeading(arr[i - 1].lat, arr[i - 1].lng, p.lat, p.lng) : 0),
        };
      });
      return assignSpeedProfile(withHeadings);
    }
  } catch { /* fall through to raw waypoints */ }

  // Fallback: use raw waypoints without road snapping
  const withHeadings = waypoints.map((p, i, arr) => {
    const next = arr[Math.min(i + 1, arr.length - 1)];
    return {
      ...p,
      heading: i < arr.length - 1
        ? calculateHeading(p.lat, p.lng, next.lat, next.lng)
        : (i > 0 ? calculateHeading(arr[i - 1].lat, arr[i - 1].lng, p.lat, p.lng) : 0),
    };
  });

  return assignSpeedProfile(withHeadings);
}

/**
 * Compute the tick interval in ms from OSRM duration and point count.
 * Falls back to DEFAULT_TICK_MS (4s) when duration is unavailable.
 */
export function computeTickInterval(durationSeconds: number, pointCount: number): number {
  if (!durationSeconds || pointCount <= 1) return DEFAULT_TICK_MS;
  const raw = (durationSeconds * 1000) / pointCount / SIM_SPEED_MULTIPLIER;
  return Math.max(raw, MIN_TICK_MS);
}

// ── Simulation runner ──

export interface SimulationHandle {
  stop: () => void;
  isRunning: () => boolean;
}

export function startSimulation(
  socket: Socket,
  rideId: string,
  points: SimulationPoint[],
  phase: TrackingPhase,
  tickMs: number = DEFAULT_TICK_MS,
  onTick?: (point: SimulationPoint, index: number, total: number) => void,
  onComplete?: () => void,
): SimulationHandle {
  let index = 0;
  let stopped = false;
  const tickSeconds = tickMs / 1000;

  const timer = setInterval(() => {
    if (stopped || index >= points.length) {
      clearInterval(timer);
      if (!stopped) onComplete?.();
      return;
    }

    const point = points[index];
    const progress = Math.round((index / Math.max(points.length - 1, 1)) * 100);
    const remaining = points.slice(index).reduce((sum, p, i, arr) => {
      if (i === 0) return 0;
      return sum + haversineDistance(arr[i - 1].lat, arr[i - 1].lng, p.lat, p.lng);
    }, 0);
    const etaSeconds = Math.round((points.length - 1 - index) * tickSeconds);
    const etaStr = etaSeconds >= 60
      ? `${Math.ceil(etaSeconds / 60)} min`
      : `${etaSeconds} sec`;

    socket.emit('driver:location:update', {
      rideId,
      lat: point.lat,
      lng: point.lng,
      heading: point.heading,
      speed: point.speed,
      progress,
      eta: etaStr,
      etaSeconds,
      distanceRemaining: remaining >= 1
        ? `${remaining.toFixed(1)} km`
        : `${(remaining * 1000).toFixed(0)} m`,
      trackingPhase: phase,
      timestamp: new Date().toISOString(),
    });

    onTick?.(point, index, points.length);
    index += 1;
  }, tickMs);

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
    isRunning: () => !stopped && index < points.length,
  };
}
