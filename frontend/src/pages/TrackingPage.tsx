import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBar from '../components/layout/StatusBar';
import BottomNav from '../components/layout/BottomNav';
import PINDisplay from '../components/ui/PINDisplay';
import CTAButton from '../components/ui/CTAButton';
import OutlineButton from '../components/ui/OutlineButton';
import Toast from '../components/ui/Toast';
import MapLayer from '../components/map/MapLayer';
import { getRide, updateRoute } from '../api/rides';
import { fetchOSRMRoute } from '../api/routing';
import { useRide, type RideStatus, type TrackingPhase } from '../context/RideContext';
import { useSocket } from '../hooks/useSocket';






const PHASE1_STATUSES: RideStatus[] = ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'];





export default function TrackingPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useRide();
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [fullRoute, setFullRoute] = useState<[number, number][]>([]);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [showModifyRoute, setShowModifyRoute] = useState(false);
  const [newDestAddress, setNewDestAddress] = useState('');
  const arrivalRouteFetched = useRef(false);
  const tripRouteFetched = useRef(false);




  // Hydrate state from API on mount / refresh
  useEffect(() => {
    if (!rideId) return;
    getRide(rideId).then((ride) => {
      dispatch({
        type: 'SET_RIDE',
        payload: {
          rideId: ride.id,
          status: ride.status as RideStatus,
          pin: ride.pin,
          pickupAddress: ride.pickup_address,
          destAddress: ride.dest_address,
          pickupLat: ride.pickup_lat,
          pickupLng: ride.pickup_lng,
          destLat: ride.dest_lat,
          destLng: ride.dest_lng,
          estimatedFare: ride.estimated_fare,
          finalFare: ride.final_fare,
          driverInfo: ride.driver_name
            ? {
                id: ride.driver_id || '',
                name: ride.driver_name,
                phone: ride.driver_phone || '',
                vehicle: ride.driver_vehicle || '',
                licensePlate: ride.driver_license_plate || '',
                rating: ride.driver_avg_rating || 4.9,
              }
            : null,
        },
      });


    }).catch(console.error);
  }, [rideId, dispatch]);




  // Fetch OSRM route for arrival phase (driver -> pickup)
  useEffect(() => {
    if (
      state.trackingPhase === 'arrival' &&
      state.driverLocation &&
      state.pickupLat !== 0 &&
      !arrivalRouteFetched.current
    ) {
      arrivalRouteFetched.current = true;
      fetchOSRMRoute(
        { lat: state.driverLocation.lat, lng: state.driverLocation.lng },
        { lat: state.pickupLat, lng: state.pickupLng }
      ).then((route) => { if (route.length > 1) setFullRoute(route); });
    }
  }, [state.trackingPhase, state.driverLocation, state.pickupLat, state.pickupLng]);





  // Fetch OSRM route for trip phase (pickup -> destination)
  useEffect(() => {
    if (
      state.trackingPhase === 'trip' &&
      state.pickupLat !== 0 &&
      !tripRouteFetched.current
    ) {
      tripRouteFetched.current = true;
      setFullRoute([]);
      setRoutePoints([]);
      fetchOSRMRoute(
        { lat: state.pickupLat, lng: state.pickupLng },
        { lat: state.destLat, lng: state.destLng }
      ).then((route) => { if (route.length > 1) setFullRoute(route); });
    }
  }, [state.trackingPhase, state.pickupLat, state.pickupLng, state.destLat, state.destLng]);





  // Socket event handlers
  const onLocationUpdate = useCallback((data: { lat: number; lng: number; heading: number; speed: number; progress: number; eta: string; etaSeconds: number; trackingPhase: 'arrival' | 'trip' | 'completed'; timestamp: string; distanceRemaining?: string }) => {
    dispatch({ type: 'UPDATE_LOCATION', payload: data });
    // Build route trail from driver positions
    setRoutePoints((prev) => {
      const last = prev[prev.length - 1];
      if (!last || Math.abs(last[0] - data.lat) > 0.00001 || Math.abs(last[1] - data.lng) > 0.00001) {
        return [...prev, [data.lat, data.lng]];
      }
      return prev;
    });
  }, [dispatch]);




  const onProgressUpdate = useCallback((data: { rideId: string; progress: number; eta: string; etaSeconds: number; speed: number; trackingPhase: 'arrival' | 'trip'; distanceRemaining: string }) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: data });
  }, [dispatch]);





  const onStatusChanged = useCallback((data: { rideId: string; status: string; timestamp: string; trackingPhase?: string }) => {
    dispatch({ type: 'UPDATE_STATUS', payload: { status: data.status as RideStatus, trackingPhase: data.trackingPhase as TrackingPhase | undefined } });
    if (data.status === 'DRIVER_ARRIVED') {
      setToast({ visible: true, message: 'Driver has arrived!' });
    }
    if (data.status === 'PIN_VERIFIED') {
      setToast({ visible: true, message: 'PIN verified! Trip starting...' });
    }
    if (data.status === 'RIDE_ACTIVE') {
      setRoutePoints([]);
    }
  }, [dispatch]);






  const onDriverArrived = useCallback(() => {
    dispatch({ type: 'UPDATE_STATUS', payload: { status: 'DRIVER_ARRIVED', trackingPhase: 'arrival' } });
    setToast({ visible: true, message: 'Driver has arrived at pickup!' });
  }, [dispatch]);




  const onRideStarted = useCallback(() => {
    dispatch({ type: 'UPDATE_STATUS', payload: { status: 'RIDE_ACTIVE', trackingPhase: 'trip' } });
    setRoutePoints([]);
    setToast({ visible: true, message: 'Trip started!' });
  }, [dispatch]);




  const onRouteUpdated = useCallback((data: { rideId: string; destAddress: string; newEta: string; newFare: number }) => {
    dispatch({ type: 'UPDATE_ROUTE', payload: data });
    setShowModifyRoute(false);
    setToast({ visible: true, message: 'Route updated!' });
  }, [dispatch]);



  const onRideCompleted = useCallback((data: { rideId: string; totalFare: number; duration: string }) => {
    dispatch({ type: 'SET_COMPLETED', payload: data });
    setTimeout(() => navigate(`/rate/${rideId}`), 2000);
  }, [dispatch, navigate, rideId]);



  const onPinVerified = useCallback(() => {
    dispatch({ type: 'UPDATE_STATUS', payload: { status: 'PIN_VERIFIED', trackingPhase: 'trip' } });
    setToast({ visible: true, message: 'PIN verified! Trip starting soon...' });
  }, [dispatch]);



  const onSocketError = useCallback((data: { error: string }) => {
    console.warn('[Rider] Socket error:', data.error);
    setToast({ visible: true, message: `Connection error: ${data.error}` });
  }, []);



  useSocket({
    rideId: rideId || null,
    role: 'rider',
    onLocationUpdate,
    onProgressUpdate,
    onStatusChanged,
    onDriverArrived,
    onPinVerified,
    onRideStarted,
    onRouteUpdated,
    onRideCompleted,
    onSocketError,
  });




  const isPhase1 = PHASE1_STATUSES.includes(state.status);
  const isDriverArrived = state.status === 'DRIVER_ARRIVED';
  const isRideActive = state.status === 'RIDE_ACTIVE' || state.status === 'PIN_VERIFIED';






  // Map center logic
  const mapCenter = useMemo<[number, number]>(() => {
    if (isPhase1 && state.pickupLat) return [state.pickupLat, state.pickupLng];
    if (state.driverLocation) return [state.driverLocation.lat, state.driverLocation.lng];
    if (state.pickupLat) return [state.pickupLat, state.pickupLng];
    return [23.7843, 90.4075]; // Banani, Dhaka fallback
  }, [isPhase1, state.pickupLat, state.pickupLng, state.driverLocation]);







  const handleModifyRoute = async () => {
    if (!rideId || !newDestAddress.trim()) return;
    try {
      await updateRoute(rideId, {
        destLat: state.destLat + 0.005,
        destLng: state.destLng + 0.003,
        destAddress: newDestAddress,
      });
    } catch {
      setToast({ visible: true, message: 'Failed to update route' });
    }
  };




  const statusLabel = useMemo(() => {
    switch (state.status) {
      case 'REQUESTED': return 'Finding driver...';
      case 'DRIVER_ASSIGNED': return 'Driver assigned';
      case 'DRIVER_EN_ROUTE': return 'Driver on the way';
      case 'DRIVER_ARRIVED': return 'Driver arrived!';
      case 'PIN_VERIFIED': return 'PIN verified';
      case 'RIDE_ACTIVE': return "You're on your way";
      case 'DESTINATION_REACHED': return 'Destination reached!';
      case 'RATING': return 'Rate your trip';
      case 'COMPLETED': return 'Trip completed';
      default: return state.status;
    }
  }, [state.status]);






  return (
    <div className="relative w-[375px] h-[812px] bg-white overflow-hidden">
      {/* Green header bar */}
      <div className="relative z-50" style={{ background: '#4CE5B1' }}>
        <StatusBar variant="white" />
        <div className="text-center pb-3">
          <span className="text-white text-[17px] font-semibold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF UI Display", sans-serif' }}>
            Ride Status
          </span>
          {rideId && (
            <p className="text-white/70 text-[10px] font-mono">{rideId.slice(0, 8)}</p>
          )}
        </div>
      </div>






      {/* Route summary card */}
      <div className="relative z-30 mx-4 mt-2 p-3 bg-white rounded-xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-[10px] h-[10px] rounded-full" style={{ background: '#4CE5B1' }} />
          <span className="text-[13px] flex-1 truncate" style={{ color: '#242E42' }}>{state.pickupAddress || 'Pickup'}</span>
          <span className="text-[13px]" style={{ color: '#C8C7CC' }}>→</span>
          <svg width="10" height="14" viewBox="0 0 24 32" fill="#F52D56">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="text-[13px] flex-1 truncate" style={{ color: '#242E42' }}>{state.destAddress || 'Destination'}</span>
        </div>
      </div>






      {/* Map area */}
      <div className="absolute top-[120px] left-0 right-0 bottom-[280px] z-10">
        {state.pickupLat !== 0 && (
          <MapLayer
            center={mapCenter}
            pickupPos={[state.pickupLat, state.pickupLng]}
            destPos={[state.destLat, state.destLng]}
            driverPos={state.driverLocation ? { ...state.driverLocation } : null}
            fullRoute={fullRoute.length > 1 ? fullRoute : undefined}
            routePoints={routePoints}
            trackingPhase={state.trackingPhase}
          />
        )}
      </div>







      {/* Bottom sheet */}
      <div
        className="absolute bottom-[106px] left-0 right-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0px -5px 10px rgba(0,0,0,0.10)',
          padding: '12px 16px',
          maxHeight: isDriverArrived ? '360px' : '300px',
          overflowY: 'auto',
        }}
      >
        <div className="w-[50px] h-[5px] rounded-[3px] mx-auto mb-3" style={{ background: '#9B9B9B' }} />

        {/* Progress bar */}
        <div className="mb-3">
          <div className="w-full h-[6px] rounded-full" style={{ background: '#E8E8E8' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(state.progress, 100)}%`, background: '#4CE5B1' }}
            />
          </div>
          <p className="text-[14px] mt-2 font-medium" style={{ color: '#242E42', fontFamily: '-apple-system, sans-serif' }}>
            {statusLabel}
          </p>
          {state.eta && (
            <p className="text-[12px]" style={{ color: '#8A8A8F', fontFamily: 'Inter, sans-serif' }}>
              Est. Arrival: {state.eta} {state.distanceRemaining && `· ${state.distanceRemaining}`}
            </p>
          )}
        </div>

        {/* PIN display - share with driver */}
        {isDriverArrived && state.pin && state.status !== 'PIN_VERIFIED' && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: '#F7F7F7' }}>
            <p className="text-[13px] text-center mb-2" style={{ color: '#8A8A8F' }}>Share this PIN with your driver</p>
            <PINDisplay pin={state.pin} />
          </div>
        )}





        {state.status === 'PIN_VERIFIED' && state.pin && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: '#E8FFF5' }}>
            <PINDisplay pin={state.pin} verified />
          </div>
        )}




        {/* Driver info card */}
        {state.driverInfo && (
          <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: '#FAFAFA' }}>
            <div className="w-[50px] h-[50px] rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#8A8A8F">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-semibold" style={{ color: '#242E42', fontFamily: '-apple-system, sans-serif' }}>
                {state.driverInfo.name}
              </p>
              <p className="text-[13px]" style={{ color: '#8A8A8F' }}>
                {state.driverInfo.vehicle}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-[12px]" style={{ color: '#242E42' }}>{state.driverInfo.rating}</span>
              </div>
            </div>


            {/* Call / Message buttons */}
            <div className="flex gap-2">
              <a href={`tel:${state.driverInfo.phone}`} className="w-[40px] h-[40px] rounded-full flex items-center justify-center" style={{ background: '#5856D6' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
                </svg>
              </a>
              <a href={`tel:${state.driverInfo.phone}`} className="w-[40px] h-[40px] rounded-full flex items-center justify-center" style={{ background: '#4CE5B1' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
                </svg>
              </a>
            </div>
          </div>
        )}

 
 
        {/* Action buttons row */}
        <div className="flex gap-2">
          <OutlineButton label="Share Ride" color="#4CE5B1" className="flex-1 !text-[12px]" />
          <OutlineButton
            label="Call Emergency"
            color="#F52D56"
            className="flex-1 !text-[12px]"
            onClick={() => setToast({ visible: true, message: 'Emergency services notified' })}
          />
          {isRideActive && (
            <OutlineButton
              label="Safety"
              color="#4CE5B1"
              className="flex-1 !text-[12px]"
              onClick={() => navigate(`/ride/${rideId}/safety`)}
            />
          )}
        </div>




        {/* Modify route during active trip */}
        {isRideActive && !showModifyRoute && (
          <button
            onClick={() => setShowModifyRoute(true)}
            className="mt-2 text-[12px] underline w-full text-center"
            style={{ color: '#4CE5B1', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Modify Destination
          </button>
        )}




        {showModifyRoute && (
          <div className="mt-2 flex gap-2">
            <input
              value={newDestAddress}
              onChange={(e) => setNewDestAddress(e.target.value)}
              placeholder="New destination address"
              className="flex-1 h-[36px] px-3 rounded-lg text-[13px]"
              style={{ background: '#F7F4F4', border: '1px solid #CCCCCC' }}
            />
            <CTAButton label="Update" onClick={handleModifyRoute} className="!w-auto !h-[36px] px-4 !text-[12px]" />
          </div>
        )}




        {/* Speed info */}
        {state.speed > 0 && (
          <p className="text-[11px] mt-2 text-center" style={{ color: '#C8C7CC' }}>
            Speed: {state.speed.toFixed(0)} km/h
          </p>
        )}
      </div>

      <BottomNav activeTab="home" />

      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast({ visible: false, message: '' })} />
    </div>
  );

  
}
