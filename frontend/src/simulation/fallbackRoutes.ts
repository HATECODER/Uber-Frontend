/**
 * Manual fallback routes for when OSRM is unavailable.
 * All waypoints are on Airport Road (major 6-lane highway) — Dhaka, Bangladesh.
 */

export interface Waypoint {
  lat: number;
  lng: number;
}

// Airport Road: Mohakhali → Tejgaon pickup (~1.2 km, staying on highway)
export const pickupRoute: Waypoint[] = [
  { lat: 23.7750, lng: 90.3967 },
  { lat: 23.7745, lng: 90.3966 },
  { lat: 23.7740, lng: 90.3965 },
  { lat: 23.7735, lng: 90.3964 },
  { lat: 23.7730, lng: 90.3963 },
  { lat: 23.7725, lng: 90.3962 },
  { lat: 23.7720, lng: 90.3961 },
  { lat: 23.7715, lng: 90.3960 },
  { lat: 23.7710, lng: 90.3959 },
  { lat: 23.7705, lng: 90.3958 },
  { lat: 23.7700, lng: 90.3957 },
];

// Airport Road: Tejgaon → Farmgate trip (~3.6 km, staying on highway)
export const tripRoute: Waypoint[] = [
  { lat: 23.7700, lng: 90.3957 },
  { lat: 23.7693, lng: 90.3955 },
  { lat: 23.7685, lng: 90.3953 },
  { lat: 23.7677, lng: 90.3951 },
  { lat: 23.7670, lng: 90.3949 },
  { lat: 23.7662, lng: 90.3947 },
  { lat: 23.7654, lng: 90.3945 },
  { lat: 23.7646, lng: 90.3943 },
  { lat: 23.7638, lng: 90.3940 },
  { lat: 23.7630, lng: 90.3937 },
  { lat: 23.7622, lng: 90.3934 },
  { lat: 23.7614, lng: 90.3931 },
  { lat: 23.7606, lng: 90.3928 },
  { lat: 23.7598, lng: 90.3925 },
  { lat: 23.7590, lng: 90.3921 },
  { lat: 23.7582, lng: 90.3917 },
  { lat: 23.7575, lng: 90.3913 },
  { lat: 23.7570, lng: 90.3905 },
];
