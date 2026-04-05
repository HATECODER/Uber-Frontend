import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export type SocketRole = 'driver' | 'rider';

interface UseSocketOptions {
  rideId: string | null;
  role?: SocketRole;
  onLocationUpdate?: (data: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
    timestamp: string;
    progress: number;
    eta: string;
    etaSeconds: number;
    trackingPhase: 'arrival' | 'trip' | 'completed';
    distanceRemaining?: string;
  }) => void;
  onProgressUpdate?: (data: {
    rideId: string;
    progress: number;
    eta: string;
    etaSeconds: number;
    speed: number;
    trackingPhase: 'arrival' | 'trip';
    distanceRemaining: string;
  }) => void;
  onStatusChanged?: (data: {
    rideId: string;
    status: string;
    timestamp: string;
    trackingPhase?: string;
  }) => void;
  onDriverArrived?: (data: { rideId: string }) => void;
  onPinVerified?: (data: { rideId: string; trackingPhase: string }) => void;
  onRideStarted?: (data: { rideId: string; trackingPhase: string }) => void;
  onRouteUpdated?: (data: {
    rideId: string;
    destAddress: string;
    newEta: string;
    newFare: number;
  }) => void;
  onRideCompleted?: (data: {
    rideId: string;
    totalFare: number;
    duration: string;
  }) => void;
  onPresence?: (data: {
    rideId: string;
    driverConnected: boolean;
    riderConnected: boolean;
    driverSockets: number;
    riderSockets: number;
  }) => void;
  onRiderLocation?: (data: {
    lat: number;
    lng: number;
    heading: number;
    speed: number;
  }) => void;
  onSocketError?: (data: { error: string; rideId?: string }) => void;
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const joinedRideRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      const opts = optionsRef.current;
      if (opts.rideId && joinedRideRef.current !== opts.rideId) {
        const role = opts.role || 'rider';
        socket.emit('ride:join', { rideId: opts.rideId, role });
        joinedRideRef.current = opts.rideId;
      }
    });

    socket.on('driver:location', (data) => {
      optionsRef.current.onLocationUpdate?.(data);
    });

    socket.on('ride:progress', (data) => {
      optionsRef.current.onProgressUpdate?.(data);
    });

    socket.on('ride:status_changed', (data) => {
      optionsRef.current.onStatusChanged?.(data);
    });

    socket.on('driver:arrived', (data) => {
      optionsRef.current.onDriverArrived?.(data);
    });

    socket.on('ride:pin_verified', (data) => {
      optionsRef.current.onPinVerified?.(data);
    });

    socket.on('ride:started', (data) => {
      optionsRef.current.onRideStarted?.(data);
    });

    socket.on('route:updated', (data) => {
      optionsRef.current.onRouteUpdated?.(data);
    });

    socket.on('ride:completed', (data) => {
      optionsRef.current.onRideCompleted?.(data);
    });

    socket.on('ride:presence', (data) => {
      optionsRef.current.onPresence?.(data);
    });

    socket.on('rider:location', (data) => {
      optionsRef.current.onRiderLocation?.(data);
    });

    socket.on('socket:error', (data) => {
      console.warn('[Socket] Error:', data);
      optionsRef.current.onSocketError?.(data);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socketRef.current = socket;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        if (joinedRideRef.current) {
          socketRef.current.emit('ride:leave', { rideId: joinedRideRef.current });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        joinedRideRef.current = null;
      }
    };
  }, [connect]);

  // Join new ride room when rideId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !options.rideId) return;

    if (joinedRideRef.current && joinedRideRef.current !== options.rideId) {
      socket.emit('ride:leave', { rideId: joinedRideRef.current });
    }

    const role = options.role || 'rider';
    socket.emit('ride:join', { rideId: options.rideId, role });
    joinedRideRef.current = options.rideId;
  }, [options.rideId, options.role]);

  return socketRef;
}
