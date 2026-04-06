/**
 * Manual fallback routes for when OSRM is unavailable.
 * All waypoints are in Uttara, Dhaka (grid layout = clean routes).
 */

export interface Waypoint {
  lat: number;
  lng: number;
}

// Uttara: Sector 7 → Sector 10 pickup (~500m south on grid road)
export const pickupRoute: Waypoint[] = [
  { lat: 23.8700, lng: 90.3944 },
  { lat: 23.8695, lng: 90.3943 },
  { lat: 23.8690, lng: 90.3943 },
  { lat: 23.8685, lng: 90.3942 },
  { lat: 23.8680, lng: 90.3942 },
  { lat: 23.8675, lng: 90.3941 },
  { lat: 23.8670, lng: 90.3941 },
  { lat: 23.8665, lng: 90.3940 },
  { lat: 23.8660, lng: 90.3940 },
];

// Uttara: Sector 10 → Sector 13 trip (~1.5 km south)
export const tripRoute: Waypoint[] = [
  { lat: 23.8660, lng: 90.3940 },
  { lat: 23.8650, lng: 90.3939 },
  { lat: 23.8640, lng: 90.3938 },
  { lat: 23.8630, lng: 90.3937 },
  { lat: 23.8620, lng: 90.3936 },
  { lat: 23.8610, lng: 90.3935 },
  { lat: 23.8600, lng: 90.3934 },
  { lat: 23.8590, lng: 90.3933 },
  { lat: 23.8580, lng: 90.3932 },
  { lat: 23.8570, lng: 90.3930 },
  { lat: 23.8560, lng: 90.3928 },
  { lat: 23.8550, lng: 90.3925 },
  { lat: 23.8540, lng: 90.3910 },
  { lat: 23.8530, lng: 90.3900 },
  { lat: 23.8520, lng: 90.3890 },
];
