import React, { createContext, useContext, useReducer, type ReactNode } from 'react';

export type RideStatus =
  | 'REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'PIN_VERIFIED'
  | 'RIDE_ACTIVE'
  | 'DESTINATION_REACHED'
  | 'RATING'
  | 'COMPLETED'
  | 'CANCELLED';

export type TrackingPhase = 'arrival' | 'trip' | 'completed';

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  rating: number;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

export interface RideState {
  rideId: string | null;
  status: RideStatus;
  trackingPhase: TrackingPhase;
  pin: string | null;
  driverInfo: DriverInfo | null;
  driverLocation: DriverLocation | null;
  pickupAddress: string;
  destAddress: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  estimatedFare: number;
  finalFare: number | null;
  eta: string;
  etaSeconds: number;
  progress: number;
  speed: number;
  distanceRemaining: string;
  riderRating: number | null;
}

const initialState: RideState = {
  rideId: null,
  status: 'REQUESTED',
  trackingPhase: 'arrival',
  pin: null,
  driverInfo: null,
  driverLocation: null,
  pickupAddress: '',
  destAddress: '',
  pickupLat: 0,
  pickupLng: 0,
  destLat: 0,
  destLng: 0,
  estimatedFare: 0,
  finalFare: null,
  eta: '',
  etaSeconds: 0,
  progress: 0,
  speed: 0,
  distanceRemaining: '',
  riderRating: null,
};

type RideAction =
  | { type: 'SET_RIDE'; payload: Partial<RideState> }
  | { type: 'UPDATE_STATUS'; payload: { status: RideStatus; trackingPhase?: TrackingPhase } }
  | { type: 'UPDATE_LOCATION'; payload: DriverLocation & { progress?: number; eta?: string; etaSeconds?: number; trackingPhase?: TrackingPhase; distanceRemaining?: string } }
  | { type: 'UPDATE_PROGRESS'; payload: { progress: number; eta: string; etaSeconds: number; speed: number; trackingPhase?: TrackingPhase; distanceRemaining: string } }
  | { type: 'UPDATE_ROUTE'; payload: { destAddress: string; newEta: string; newFare: number } }
  | { type: 'SET_COMPLETED'; payload: { totalFare: number; duration: string } }
  | { type: 'RESET' };

function getTrackingPhase(status: RideStatus): TrackingPhase {
  const arrivalStatuses: RideStatus[] = ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'];
  if (arrivalStatuses.includes(status)) return 'arrival';
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'completed';
  return 'trip';
}

function rideReducer(state: RideState, action: RideAction): RideState {
  switch (action.type) {
    case 'SET_RIDE':
      return { ...state, ...action.payload };

    case 'UPDATE_STATUS': {
      const status = action.payload.status;
      const trackingPhase = action.payload.trackingPhase
        ? (action.payload.trackingPhase as TrackingPhase)
        : getTrackingPhase(status);
      return { ...state, status, trackingPhase };
    }

    case 'UPDATE_LOCATION':
      return {
        ...state,
        driverLocation: {
          lat: action.payload.lat,
          lng: action.payload.lng,
          heading: action.payload.heading,
          speed: action.payload.speed,
        },
        speed: action.payload.speed,
        ...(action.payload.progress !== undefined && { progress: action.payload.progress }),
        ...(action.payload.eta !== undefined && { eta: action.payload.eta }),
        ...(action.payload.etaSeconds !== undefined && { etaSeconds: action.payload.etaSeconds }),
        ...(action.payload.distanceRemaining !== undefined && { distanceRemaining: action.payload.distanceRemaining }),
        ...(action.payload.trackingPhase && { trackingPhase: action.payload.trackingPhase as TrackingPhase }),
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
        eta: action.payload.eta,
        etaSeconds: action.payload.etaSeconds,
        speed: action.payload.speed,
        distanceRemaining: action.payload.distanceRemaining,
        ...(action.payload.trackingPhase && { trackingPhase: action.payload.trackingPhase as TrackingPhase }),
      };

    case 'UPDATE_ROUTE':
      return {
        ...state,
        destAddress: action.payload.destAddress,
        estimatedFare: action.payload.newFare,
      };

    case 'SET_COMPLETED':
      return {
        ...state,
        status: 'DESTINATION_REACHED',
        trackingPhase: 'completed',
        finalFare: action.payload.totalFare,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface RideContextValue {
  state: RideState;
  dispatch: React.Dispatch<RideAction>;
}

const RideContext = createContext<RideContextValue | null>(null);

export function RideProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(rideReducer, initialState);
  return (
    <RideContext.Provider value={{ state, dispatch }}>
      {children}
    </RideContext.Provider>
  );
}

export function useRide() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error('useRide must be used within RideProvider');
  return ctx;
}
