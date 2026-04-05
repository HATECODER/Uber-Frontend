/**
 * Manual fallback routes for when OSRM is unavailable.
 * Ported from backend waypoints — Dhaka, Bangladesh roads.
 */

export interface Waypoint {
  lat: number;
  lng: number;
}

// Gulshan Circle → Banani pickup (~20 waypoints, ~80s at 4s tick)
export const pickupRoute: Waypoint[] = [
  { lat: 23.8103, lng: 90.4125 },
  { lat: 23.8090, lng: 90.4122 },
  { lat: 23.8075, lng: 90.4118 },
  { lat: 23.8060, lng: 90.4115 },
  { lat: 23.8045, lng: 90.4112 },
  { lat: 23.8030, lng: 90.4108 },
  { lat: 23.8015, lng: 90.4105 },
  { lat: 23.8000, lng: 90.4100 },
  { lat: 23.7985, lng: 90.4098 },
  { lat: 23.7970, lng: 90.4095 },
  { lat: 23.7955, lng: 90.4092 },
  { lat: 23.7940, lng: 90.4088 },
  { lat: 23.7928, lng: 90.4085 },
  { lat: 23.7922, lng: 90.4082 },
  { lat: 23.7918, lng: 90.4080 },
  { lat: 23.7908, lng: 90.4078 },
  { lat: 23.7895, lng: 90.4077 },
  { lat: 23.7880, lng: 90.4076 },
  { lat: 23.7865, lng: 90.4075 },
  { lat: 23.7852, lng: 90.4075 },
  { lat: 23.7843, lng: 90.4075 },
];

// Banani → Motijheel trip (~40 waypoints, ~160s at 4s tick)
export const tripRoute: Waypoint[] = [
  { lat: 23.7843, lng: 90.4075 },
  { lat: 23.7835, lng: 90.4072 },
  { lat: 23.7825, lng: 90.4068 },
  { lat: 23.7815, lng: 90.4062 },
  { lat: 23.7805, lng: 90.4055 },
  { lat: 23.7795, lng: 90.4050 },
  { lat: 23.7788, lng: 90.4045 },
  { lat: 23.7785, lng: 90.4040 },
  { lat: 23.7782, lng: 90.4038 },
  { lat: 23.7780, lng: 90.4032 },
  { lat: 23.7778, lng: 90.4030 },
  { lat: 23.7775, lng: 90.4020 },
  { lat: 23.7770, lng: 90.4010 },
  { lat: 23.7765, lng: 90.4000 },
  { lat: 23.7760, lng: 90.3992 },
  { lat: 23.7755, lng: 90.3985 },
  { lat: 23.7748, lng: 90.3978 },
  { lat: 23.7740, lng: 90.3972 },
  { lat: 23.7732, lng: 90.3968 },
  { lat: 23.7722, lng: 90.3965 },
  { lat: 23.7716, lng: 90.3964 },
  { lat: 23.7710, lng: 90.3963 },
  { lat: 23.7702, lng: 90.3966 },
  { lat: 23.7698, lng: 90.3968 },
  { lat: 23.7692, lng: 90.3972 },
  { lat: 23.7686, lng: 90.3975 },
  { lat: 23.7675, lng: 90.3978 },
  { lat: 23.7665, lng: 90.3985 },
  { lat: 23.7655, lng: 90.3990 },
  { lat: 23.7645, lng: 90.3995 },
  { lat: 23.7635, lng: 90.4000 },
  { lat: 23.7625, lng: 90.4004 },
  { lat: 23.7615, lng: 90.4008 },
  { lat: 23.7605, lng: 90.4010 },
  { lat: 23.7595, lng: 90.4012 },
  { lat: 23.7582, lng: 90.4014 },
  { lat: 23.7570, lng: 90.4015 },
  { lat: 23.7558, lng: 90.4015 },
  { lat: 23.7545, lng: 90.4015 },
  { lat: 23.7530, lng: 90.4015 },
];
