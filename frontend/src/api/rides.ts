import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// ── Rides ──

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  rating: number;
}

export interface CreateRideResponse {
  rideId: string;
  pin: string;
  driverInfo: DriverInfo;
}

export interface RideData {
  id: string;
  rider_id: string;
  driver_id: string | null;
  status: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dest_lat: number;
  dest_lng: number;
  dest_address: string;
  estimated_fare: number;
  final_fare: number | null;
  pin: string | null;
  vehicle_type: string;
  started_at: string | null;
  completed_at: string | null;
  rider_rating: number | null;
  driver_rating: number | null;
  created_at: string;
  updated_at: string;
  driver_name?: string;
  driver_phone?: string;
  driver_vehicle?: string;
  driver_license_plate?: string;
  driver_avg_rating?: number;
}

export const DEMO_RIDER_ID = 'a0000000-0000-0000-0000-000000000001';

export async function createRide(params: {
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destLat: number;
  destLng: number;
  destAddress: string;
  vehicleType?: string;
}): Promise<CreateRideResponse> {
  const { data } = await api.post('/rides', params);
  return data;
}

export async function getRide(rideId: string): Promise<RideData> {
  const { data } = await api.get(`/rides/${rideId}`);
  return data;
}

export async function getRideStatus(rideId: string) {
  const { data } = await api.get(`/rides/${rideId}/status`);
  return data as { status: string; updated_at: string };
}

export async function verifyPin(rideId: string, pin: string) {
  const { data } = await api.post(`/rides/${rideId}/pin/verify`, { pin });
  return data as { success: boolean };
}

export async function updateRoute(rideId: string, params: {
  destLat: number;
  destLng: number;
  destAddress: string;
}) {
  const { data } = await api.patch(`/rides/${rideId}/route`, params);
  return data as { destAddress: string; newEta: string; newFare: number };
}

export async function submitRating(rideId: string, raterType: 'rider' | 'driver', rating: number) {
  const { data } = await api.post(`/rides/${rideId}/rate`, { raterType, rating });
  return data as { success: boolean; ratings: { riderRating: number | null; driverRating: number | null } };
}

export async function getRatings(rideId: string) {
  const { data } = await api.get(`/rides/${rideId}/rating`);
  return data as { riderRating: number | null; driverRating: number | null };
}

// ── Driver Panel ──

export async function getDriverRide(rideId: string) {
  const { data } = await api.get(`/driver/rides/${rideId}`);
  return data;
}

export async function getPendingRide(): Promise<RideData | null> {
  try {
    const { data } = await api.get('/driver/rides/pending');
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function advanceRide(rideId: string) {
  const { data } = await api.post(`/driver/rides/${rideId}/advance`);
  return data;
}

export async function setRideStatus(rideId: string, status: string) {
  const { data } = await api.post(`/driver/rides/${rideId}/set-status`, { status });
  return data;
}

export async function driverVerifyPin(rideId: string, pin: string) {
  const { data } = await api.post(`/driver/rides/${rideId}/verify-pin`, { pin });
  return data;
}
