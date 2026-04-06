import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  getDriverRide,
  setRideStatus,
  driverVerifyPin,
  submitRating,
  getPendingRide,
} from "../api/rides";
import { fetchOSRMRouteDetailed } from "../api/routing";
import { useSocket } from "../hooks/useSocket";
import {
  startSimulation,
  buildSimulationPointsFromOsrm,
  buildSimulationPointsFromManual,
  computeTickInterval,
  type SimulationHandle,
  type SimulationPoint,
  type RouteSource,
} from "../simulation/simulationEngine";
import { pickupRoute, tripRoute } from "../simulation/fallbackRoutes";
import StatusBar from "../components/layout/StatusBar";
import MapLayer from "../components/map/MapLayer";
import StarRating from "../components/ui/StarRating";

type DriverStatus =
  | "OFFLINE"
  | "ONLINE"
  | "RIDE_REQUEST"
  | "EN_ROUTE"
  | "ARRIVED"
  | "START_RIDE"
  | "ACTIVE_RIDE"
  | "COMPLETE"
  | "RATE";

interface RideInfo {
  id: string;
  riderName: string;
  pickupAddress: string;
  destAddress: string;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
  estimatedFare: number;
  finalFare: number | null;
  pin: string | null;
  status: string;
}

export default function DriverPanel() {
  const [driverStatus, setDriverStatus] = useState<DriverStatus>("OFFLINE");
  const [ride, setRide] = useState<RideInfo | null>(null);
  const [loading, setLoading] = useState("");
  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lng: number;
    heading: number;
  } | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [eta, setEta] = useState("2 min");
  const [distance, setDistance] = useState("0.5 mi");
  const [tripTime, setTripTime] = useState("");
  const [tripDistance, setTripDistance] = useState("");
  const [riderRating, setRiderRating] = useState(0);
  const [navInstruction, setNavInstruction] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [fullRoute, setFullRoute] = useState<[number, number][]>([]);
  const [nearPickup, setNearPickup] = useState(false);
  const arrivalRouteFetched = useRef(false);
  const tripRouteFetched = useRef(false);

  // Simulation state
  const simulationRef = useRef<SimulationHandle | null>(null);
  const [routeSource, setRouteSource] = useState<RouteSource>("manual");
  const [socketError, setSocketError] = useState("");

  // Map ride backend status to driver UI status
  const mapBackendStatus = useCallback((status: string): DriverStatus => {
    switch (status) {
      case "REQUESTED":
        return "RIDE_REQUEST";
      case "DRIVER_ASSIGNED":
      case "DRIVER_EN_ROUTE":
        return "EN_ROUTE";
      case "DRIVER_ARRIVED":
        return "ARRIVED";
      case "PIN_VERIFIED":
        return "START_RIDE";
      case "RIDE_ACTIVE":
        return "ACTIVE_RIDE";
      case "DESTINATION_REACHED":
        return "COMPLETE";
      case "RATING":
        return "RATE";
      case "COMPLETED":
        return "RATE";
      default:
        return "ONLINE";
    }
  }, []);

  // Socket listeners — driver receives its own relayed location from backend
  const onLocationUpdate = useCallback(
    (data: {
      lat: number;
      lng: number;
      heading: number;
      speed: number;
      eta: string;
    }) => {
      setDriverLocation({
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
      });
      setRoutePoints((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.abs(last[0] - data.lat) > 0.00001) {
          return [...prev, [data.lat, data.lng]];
        }
        return prev;
      });
    },
    [],
  );

  const onProgressUpdate = useCallback(
    (data: {
      eta: string;
      distanceRemaining: string;
      trackingPhase: string;
    }) => {
      setEta(data.eta || "");
      setDistance(data.distanceRemaining || "");
      if (data.trackingPhase === "trip") {
        setNavInstruction("Go Straight for 10 meters");
      }
    },
    [],
  );

  const onStatusChanged = useCallback(
    (data: { status: string }) => {
      const newStatus = mapBackendStatus(data.status);
      setDriverStatus(newStatus);
      if (data.status === "RIDE_ACTIVE") {
        setRoutePoints([]);
        setNavInstruction("Go Straight for 10 meters");
      }
    },
    [mapBackendStatus],
  );

  const onDriverArrived = useCallback(() => setDriverStatus("ARRIVED"), []);

  const onPinVerified = useCallback(() => {
    setDriverStatus("START_RIDE");
    setPinInput("");
    setPinError("");
  }, []);

  const onRideStarted = useCallback(() => {
    setDriverStatus("ACTIVE_RIDE");
    setRoutePoints([]);
  }, []);
  const onRideCompleted = useCallback(
    (data: { totalFare: number; duration: string }) => {
      setDriverStatus("COMPLETE");
      setTripTime(data.duration || "18 min");
      if (ride) setRide({ ...ride, finalFare: data.totalFare });
    },
    [ride],
  );

  const onSocketError = useCallback((data: { error: string }) => {
    console.error("[Driver] Socket error:", data.error);
    setSocketError(data.error);
    setTimeout(() => setSocketError(""), 5000);
  }, []);

  const socketRef = useSocket({
    rideId: ride?.id || null,
    role: "driver",
    onLocationUpdate,
    onProgressUpdate,
    onStatusChanged,
    onDriverArrived,
    onPinVerified,
    onRideStarted,
    onRouteUpdated: () => {},
    onRideCompleted,
    onSocketError,
  });

  // ── Helper: stop any running simulation ──
  const stopSim = useCallback(() => {
    if (simulationRef.current?.isRunning()) {
      simulationRef.current.stop();
    }
    simulationRef.current = null;
  }, []);

  // ── Helper: build simulation points from OSRM or fallback ──
  const buildSimPoints = useCallback(
    async (
      from: { lat: number; lng: number },
      to: { lat: number; lng: number },
      phase: "arrival" | "trip",
      fallbackWaypoints: Array<{ lat: number; lng: number }>,
      via?: Array<{ lat: number; lng: number }>,
    ): Promise<{
      points: SimulationPoint[];
      source: RouteSource;
      displayRoute: [number, number][];
      durationSeconds: number;
      distanceMetres: number;
    }> => {
      try {
        const result = await fetchOSRMRouteDetailed(from, to, via);
        if (result.coordinates.length > 1) {
          console.log(
            `[buildSimPoints] ${phase}: OSRM success — ${result.coordinates.length} coords, ${result.duration}s, via=${via?.length ?? 0} waypoints`,
          );
          return {
            points: buildSimulationPointsFromOsrm(result.coordinates),
            source: "osrm",
            displayRoute: result.coordinates,
            durationSeconds: result.duration,
            distanceMetres: result.distance,
          };
        }
      } catch (e) {
        console.warn(`[buildSimPoints] ${phase}: OSRM failed`, e);
      }
      console.log(
        `[buildSimPoints] ${phase}: falling back to manual route (${fallbackWaypoints.length} waypoints)`,
      );
      const points = await buildSimulationPointsFromManual(fallbackWaypoints);
      return {
        points,
        source: "manual",
        displayRoute: fallbackWaypoints.map(
          (w) => [w.lat, w.lng] as [number, number],
        ),
        durationSeconds: 0,
        distanceMetres: 0,
      };
    },
    [],
  );

  // Polling ref for finding rides
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Helper: set ride from backend data
  const setRideFromData = useCallback((rideData: any) => {
    setRide({
      id: rideData.id,
      riderName: "Rider",
      pickupAddress: rideData.pickup_address,
      destAddress: rideData.dest_address,
      pickupLat: rideData.pickup_lat,
      pickupLng: rideData.pickup_lng,
      destLat: rideData.dest_lat,
      destLng: rideData.dest_lng,
      estimatedFare: rideData.estimated_fare,
      finalFare: rideData.final_fare,
      pin: rideData.pin,
      status: rideData.status,
    });
  }, []);

  // Go Online: find a pending ride from the backend
  const handleGoOnline = async () => {
    setDriverStatus("ONLINE");
    setLoading("online");
    try {
      const rideData = await getPendingRide();
      if (rideData) {
        setRideFromData(rideData);
        setDriverStatus("RIDE_REQUEST");
        setLoading("");
        return;
      }
      // No pending ride yet — start polling every 3 seconds
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const found = await getPendingRide();
          if (found) {
            setRideFromData(found);
            setDriverStatus("RIDE_REQUEST");
            stopPolling();
          }
        } catch {
          /* retry next interval */
        }
      }, 3000);
    } catch (e) {
      console.error(e);
      setDriverStatus("OFFLINE");
    } finally {
      setLoading("");
    }
  };

  // Load existing ride by ID
  const handleLoadRide = async (rideId: string) => {
    setLoading("load");
    stopPolling();
    try {
      const rideData = await getDriverRide(rideId);
      setRideFromData(rideData);
      setDriverStatus(mapBackendStatus(rideData.status));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading("");
    }
  };

  // Accept ride → emit driver:heading_to_pickup + start Phase 1 simulation
  const handleAccept = async () => {
    if (!ride) return;
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.error("Socket not connected");
      return;
    }

    setLoading("accept");
    try {
      // Emit lifecycle event
      socket.emit("driver:heading_to_pickup", { rideId: ride.id });
      setDriverStatus("EN_ROUTE");

      // Build simulation points for arrival phase (driver → pickup)
      const driverStart = { lat: 23.87, lng: 90.3944 }; // Uttara Sector 7 (grid road)
      const pickup = { lat: ride.pickupLat, lng: ride.pickupLng };
      // No via-waypoints needed — Uttara grid gives clean direct routes
      const arrivalVia: Array<{ lat: number; lng: number }> = [];
      const { points, source, displayRoute, durationSeconds } =
        await buildSimPoints(
          driverStart,
          pickup,
          "arrival",
          pickupRoute,
          arrivalVia,
        );
      setRouteSource(source);
      setFullRoute(displayRoute);
      arrivalRouteFetched.current = true;

      const tickMs = computeTickInterval(durationSeconds, points.length);
      const tickSec = tickMs / 1000;
      console.log(
        `[Driver] arrival route: source=${source}, points=${points.length}, duration=${durationSeconds}s, tickMs=${tickMs}`,
      );

      // Start simulation — emits driver:location:update at dynamic tick rate
      stopSim();
      simulationRef.current = startSimulation(
        socket,
        ride.id,
        points,
        "arrival",
        tickMs,
        (point, idx, total) => {
          setDriverLocation({
            lat: point.lat,
            lng: point.lng,
            heading: point.heading,
          });
          setRoutePoints((prev) => [...prev, [point.lat, point.lng]]);
          const etaSec = Math.round((total - 1 - idx) * tickSec);
          setEta(
            etaSec >= 60 ? `${Math.ceil(etaSec / 60)} min` : `${etaSec} sec`,
          );
        },
        () => {
          // Arrival simulation complete → driver is near pickup, show Arrived button
          setNearPickup(true);
        },
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading("");
    }
  };

  const handleDecline = async () => {
    if (!ride) return;
    stopSim();
    stopPolling();
    try {
      await setRideStatus(ride.id, "CANCELLED");
    } catch {}
    setRide(null);
    setDriverStatus("ONLINE");
  };

  const handleArrived = async () => {
    if (!ride) return;
    const socket = socketRef.current;
    if (!socket?.connected) return;
    setLoading("arrived");
    stopSim();
    socket.emit("driver:arrived_at_pickup", { rideId: ride.id });
    setDriverStatus("ARRIVED");
    setLoading("");
  };

  const handleVerifyAndStart = async () => {
    if (!ride) return;
    if (pinInput.length !== 4) {
      setPinError("Please enter the 4-digit PIN");
      return;
    }
    setLoading("start");
    setPinError("");
    try {
      await driverVerifyPin(ride.id, pinInput);
      // PIN verified by backend → status becomes PIN_VERIFIED
      // The onPinVerified socket callback will set START_RIDE status
      setPinInput("");
    } catch (e: any) {
      if (e?.response?.status === 400) {
        setPinError("Invalid PIN. Please try again.");
      } else {
        setPinError("Failed to verify PIN. Try again.");
      }
    } finally {
      setLoading("");
    }
  };

  // Start ride → emit driver:start_ride + start Phase 2 simulation
  const handleStartRide = async () => {
    if (!ride) return;
    const socket = socketRef.current;
    if (!socket?.connected) return;

    setLoading("startride");
    try {
      socket.emit("driver:start_ride", { rideId: ride.id });
      setDriverStatus("ACTIVE_RIDE");
      setRoutePoints([]);
      setNavInstruction("Go Straight for 10 meters");

      // Build simulation points for trip phase (pickup → destination)
      const pickup = { lat: ride.pickupLat, lng: ride.pickupLng };
      const dest = { lat: ride.destLat, lng: ride.destLng };
      // No via-waypoints needed — Uttara grid gives clean direct routes
      const tripVia: Array<{ lat: number; lng: number }> = [];
      const { points, source, displayRoute, durationSeconds, distanceMetres } =
        await buildSimPoints(pickup, dest, "trip", tripRoute, tripVia);
      setRouteSource(source);
      setFullRoute(displayRoute);
      tripRouteFetched.current = true;

      const tickMs = computeTickInterval(durationSeconds, points.length);
      const tickSec = tickMs / 1000;
      console.log(
        `[Driver] trip route: source=${source}, points=${points.length}, duration=${durationSeconds}s, tickMs=${tickMs}`,
      );

      stopSim();
      simulationRef.current = startSimulation(
        socket,
        ride.id,
        points,
        "trip",
        tickMs,
        (point, idx, total) => {
          setDriverLocation({
            lat: point.lat,
            lng: point.lng,
            heading: point.heading,
          });
          setRoutePoints((prev) => [...prev, [point.lat, point.lng]]);
          const etaSec = Math.round((total - 1 - idx) * tickSec);
          setEta(
            etaSec >= 60 ? `${Math.ceil(etaSec / 60)} min` : `${etaSec} sec`,
          );
          setNavInstruction(
            idx < total / 2
              ? "Go Straight for 10 meters"
              : "Turn left in 50 meters",
          );
        },
        () => {
          // Trip simulation complete → show Complete Trip button (don't auto-emit yet)
          setDriverStatus("COMPLETE");
          setTripTime(`${Math.round((points.length * tickSec) / 60)} min`);
          const km = distanceMetres / 1000;
          setTripDistance(
            km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(distanceMetres)} m`,
          );
        },
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading("");
    }
  };

  const handleCompleteTrip = async () => {
    if (!ride) return;
    const socket = socketRef.current;
    setLoading("complete");
    stopSim();
    try {
      // Emit complete_ride so rider side gets notified
      if (socket?.connected) {
        socket.emit("driver:complete_ride", { rideId: ride.id });
      }
      await setRideStatus(ride.id, "RATING");
    } catch {
      /* already at correct state */
    }
    setDriverStatus("RATE");
    setLoading("");
  };

  const handleRateRider = async () => {
    if (!ride || riderRating === 0) return;
    setLoading("rate");
    try {
      await submitRating(ride.id, "driver", riderRating);
      setRide(null);
      setDriverStatus("OFFLINE");
      setRiderRating(0);
      setRoutePoints([]);
      setNearPickup(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading("");
    }
  };

  const handleCancelTrip = async () => {
    if (!ride) return;
    stopSim();
    stopPolling();
    try {
      await setRideStatus(ride.id, "CANCELLED");
    } catch {}
    setRide(null);
    setDriverStatus("ONLINE");
    setRoutePoints([]);
  };

  const trackingPhase = useMemo(() => {
    if (driverStatus === "ACTIVE_RIDE" || driverStatus === "COMPLETE")
      return "trip" as const;
    return "arrival" as const;
  }, [driverStatus]);

  // Reset route refs when ride changes
  useEffect(() => {
    arrivalRouteFetched.current = false;
    tripRouteFetched.current = false;
    setFullRoute([]);
  }, [ride?.id]);

  // Cleanup simulation and polling on unmount
  useEffect(() => {
    return () => {
      stopSim();
      stopPolling();
    };
  }, [stopSim, stopPolling]);

  // Determine map center
  const mapCenter = useMemo<[number, number]>(() => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (ride) return [ride.pickupLat, ride.pickupLng];
    return [23.866, 90.394];
  }, [driverLocation, ride]);

  // Quick ride ID input
  const [rideIdInput, setRideIdInput] = useState("");
  const [showRideInput, setShowRideInput] = useState(false);

  return (
    <div className="relative w-[375px] h-[812px] bg-white overflow-hidden">
      {/* Top bar */}
      <div className="relative z-50 bg-white">
        <StatusBar variant="black" />
        <div className="flex items-center justify-between px-4 pb-2">
          <span
            className="text-[24px] font-bold"
            style={{ color: "#242E42", fontFamily: "Poppins, sans-serif" }}
          >
            &#2547;
            {driverStatus === "COMPLETE" || driverStatus === "RATE"
              ? ride?.finalFare || ride?.estimatedFare || 0
              : 0}
          </span>
          {ride && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 font-mono truncate max-w-[120px]"
              style={{ color: "#8A8A8F" }}
            >
              {ride.id.slice(0, 8)}
            </span>
          )}
          {ride && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: routeSource === "osrm" ? "#4CE5B1" : "#FFD700",
                color: "#242E42",
              }}
            >
              {routeSource === "osrm" ? "OSRM" : "Manual"}
            </span>
          )}
          <div className="w-[40px] h-[40px] rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#8A8A8F">
              <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Go Offline button (when online/finding) */}
      {(driverStatus === "ONLINE" || driverStatus === "RIDE_REQUEST") && (
        <div className="relative z-40 px-4 mb-2">
          <button
            onClick={() => {
              stopPolling();
              if (ride) handleDecline();
              else setDriverStatus("OFFLINE");
            }}
            className="w-full h-[44px] rounded-full text-white text-[16px] font-semibold"
            style={{
              background: "linear-gradient(135deg, #FF6B6B, #EE5A24)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Go Offline
          </button>
        </div>
      )}

      {/* Route card (when en-route / arrived / start ride) */}
      {ride &&
        (driverStatus === "EN_ROUTE" ||
          driverStatus === "ARRIVED" ||
          driverStatus === "START_RIDE") && (
          <div
            className="relative z-30 mx-4 mb-2 p-3 bg-white rounded-xl"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <div className="flex items-start gap-2 mb-2">
              <div className="mt-1">
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{ background: "#4CE5B1" }}
                />
                <div
                  className="w-[1px] h-[20px] mx-auto"
                  style={{ background: "#CCCCCC" }}
                />
                <div
                  className="w-[10px] h-[10px] rounded-full"
                  style={{ background: "#4CE5B1" }}
                />
              </div>
              <div className="flex-1">
                <p className="text-[11px]" style={{ color: "#8A8A8F" }}>
                  Uttara Sector 10
                </p>
                <p
                  className="text-[16px] font-bold mb-3"
                  style={{ color: "#242E42" }}
                >
                  {ride.pickupAddress}
                </p>
                <p className="text-[11px]" style={{ color: "#8A8A8F" }}>
                  Uttara Sector 13
                </p>
                <p
                  className="text-[16px] font-bold"
                  style={{ color: "#242E42" }}
                >
                  {ride.destAddress}
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Map area */}
      <div
        className="absolute left-0 right-0 z-10"
        style={{
          top:
            driverStatus === "OFFLINE" || driverStatus === "ONLINE"
              ? "90px"
              : ride &&
                  (driverStatus === "EN_ROUTE" ||
                    driverStatus === "ARRIVED" ||
                    driverStatus === "START_RIDE")
                ? "220px"
                : "130px",
          bottom:
            driverStatus === "OFFLINE"
              ? "200px"
              : driverStatus === "COMPLETE"
                ? "200px"
                : "180px",
        }}
      >
        <MapLayer
          center={mapCenter}
          pickupPos={ride ? [ride.pickupLat, ride.pickupLng] : [23.866, 90.394]}
          destPos={ride ? [ride.destLat, ride.destLng] : [23.852, 90.389]}
          driverPos={driverLocation}
          riderPos={
            ride && trackingPhase === "arrival"
              ? [ride.pickupLat, ride.pickupLng]
              : null
          }
          fullRoute={fullRoute.length > 1 ? fullRoute : undefined}
          routePoints={routePoints}
          trackingPhase={trackingPhase}
        />
        {/* GPS button overlay */}
        <button
          className="absolute bottom-4 right-4 w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center z-20"
          style={{
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4CE5B1"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
          </svg>
        </button>
      </div>

      {/* Bottom sheets per status */}
      <div
        className="absolute bottom-0 left-0 right-0 z-40"
        style={{
          background: "rgba(255,255,255,0.98)",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0px -5px 10px rgba(0,0,0,0.10)",
        }}
      >
        <div
          className="w-[50px] h-[5px] rounded-[3px] mx-auto mt-2 mb-2"
          style={{ background: "#CCCCCC" }}
        />

        {/* OFFLINE */}
        {driverStatus === "OFFLINE" && (
          <div className="px-4 pb-6">
            <p
              className="text-center text-[18px] font-semibold mb-4"
              style={{ color: "#F52D56" }}
            >
              You're Offline
            </p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[50px] h-[50px] rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#8A8A8F">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p
                  className="text-[16px] font-semibold"
                  style={{ color: "#242E42" }}
                >
                  Himel
                </p>
                <div className="flex items-center gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="#FFD700"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-[13px]" style={{ color: "#4CE5B1" }}>
                    4.9
                  </span>
                </div>
              </div>
              <button
                onClick={handleGoOnline}
                disabled={loading === "online"}
                className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-white text-[14px] font-bold"
                style={{
                  background: "#4CE5B1",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loading === "online" ? "..." : "Go"}
              </button>
            </div>
            {/* Stats row */}
            <div
              className="flex justify-around pt-3"
              style={{ borderTop: "1px solid #E8E8E8" }}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#4CE5B1"
                  >
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                  </svg>
                  <span
                    className="text-[16px] font-bold"
                    style={{ color: "#242E42" }}
                  >
                    95.0%
                  </span>
                </div>
                <span className="text-[12px]" style={{ color: "#8A8A8F" }}>
                  Acceptance
                </span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="#FFD700"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span
                    className="text-[16px] font-bold"
                    style={{ color: "#242E42" }}
                  >
                    4.9
                  </span>
                </div>
                <span className="text-[12px]" style={{ color: "#8A8A8F" }}>
                  Rating
                </span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="#F52D56"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                  </svg>
                  <span
                    className="text-[16px] font-bold"
                    style={{ color: "#242E42" }}
                  >
                    2.0%
                  </span>
                </div>
                <span className="text-[12px]" style={{ color: "#8A8A8F" }}>
                  Cancellation
                </span>
              </div>
            </div>
            {/* Quick load ride */}
            <button
              onClick={() => setShowRideInput(!showRideInput)}
              className="mt-3 text-[12px] underline w-full text-center"
              style={{
                color: "#8A8A8F",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Load existing ride by ID
            </button>
            {showRideInput && (
              <div className="mt-2 flex gap-2">
                <input
                  value={rideIdInput}
                  onChange={(e) => setRideIdInput(e.target.value)}
                  placeholder="Ride ID"
                  className="flex-1 h-[36px] px-3 rounded-lg text-[13px]"
                  style={{ background: "#F7F4F4", border: "1px solid #CCCCCC" }}
                />
                <button
                  onClick={() => {
                    handleLoadRide(rideIdInput);
                    setShowRideInput(false);
                  }}
                  className="h-[36px] px-4 rounded-lg text-white text-[13px] font-semibold"
                  style={{
                    background: "#5856D6",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Load
                </button>
              </div>
            )}
          </div>
        )}

        {/* ONLINE / FINDING */}
        {driverStatus === "ONLINE" && (
          <div className="px-4 pb-6 text-center">
            <p
              className="text-[18px] font-bold mb-1"
              style={{ color: "#242E42" }}
            >
              You're Online
            </p>
            <p
              className="text-[16px] font-semibold mb-1"
              style={{ color: "#4CE5B1" }}
            >
              Finding Trips
            </p>
            <p className="text-[14px] mb-2" style={{ color: "#8A8A8F" }}>
              Waiting for rider to book a ride...
            </p>
            <div className="flex justify-center">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "#4CE5B1",
                  borderTopColor: "transparent",
                }}
              />
            </div>
          </div>
        )}

        {/* RIDE REQUEST */}
        {driverStatus === "RIDE_REQUEST" && ride && (
          <div className="px-4 pb-4">
            <div className="flex justify-center mb-2">
              <div
                className="w-[40px] h-[40px] rounded-full flex items-center justify-center"
                style={{ background: "#F0F0F0" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#242E42">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </div>
            </div>
            <p
              className="text-center text-[20px] font-bold mb-1"
              style={{ color: "#4CE5B1" }}
            >
              NEW RIDE REQUEST
            </p>
            <p
              className="text-center text-[14px] mb-3"
              style={{ color: "#8A8A8F" }}
            >
              {eta} <span className="mx-1">&#128100;</span> {distance}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-[10px] h-[10px] rounded-full"
                style={{ background: "#4CE5B1" }}
              />
              <div>
                <p className="text-[12px]" style={{ color: "#8A8A8F" }}>
                  Pick up: {ride.pickupAddress}
                </p>
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: "#242E42" }}
                >
                  {ride.destAddress}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="flex-1 h-[48px] rounded-full text-white text-[16px] font-semibold"
                style={{
                  background: "linear-gradient(135deg, #FF6B6B, #EE5A24)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                DECLINE
              </button>
              <button
                onClick={handleAccept}
                disabled={loading === "accept"}
                className="flex-1 h-[48px] rounded-full text-white text-[16px] font-semibold"
                style={{
                  background: "linear-gradient(135deg, #FF6B6B, #EE5A24)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loading === "accept" ? "..." : "ACCEPT"}
              </button>
            </div>
          </div>
        )}

        {/* EN ROUTE to pickup */}
        {driverStatus === "EN_ROUTE" && ride && (
          <div className="px-4 pb-4">
            <div className="text-center mb-3">
              <span
                className="text-[22px] font-bold"
                style={{ color: "#242E42" }}
              >
                {eta}
              </span>
              <span className="mx-2">&#128100;</span>
              <span
                className="text-[22px] font-bold"
                style={{ color: "#242E42" }}
              >
                {distance}
              </span>
            </div>
            <p
              className="text-center text-[14px] mb-4"
              style={{ color: "#8A8A8F" }}
            >
              Picking up {ride.riderName}
            </p>
            <div className="flex justify-center gap-6 mb-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
                  style={{ background: "#4CE5B1" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
                  </svg>
                </div>
                <span className="text-[12px] mt-1" style={{ color: "#242E42" }}>
                  Call
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
                  style={{ background: "#E8E8E8" }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#242E42"
                  >
                    <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <span className="text-[12px] mt-1" style={{ color: "#242E42" }}>
                  Message
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
                  style={{ background: "#E8E8E8" }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#242E42"
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </div>
                <span className="text-[12px] mt-1" style={{ color: "#242E42" }}>
                  Cancel Trip
                </span>
              </div>
            </div>
            {nearPickup && (
              <button
                onClick={handleArrived}
                disabled={!!loading}
                className="w-full h-[48px] rounded-full text-white text-[16px] font-semibold"
                style={{
                  background: "#4CE5B1",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {loading === "arrived" ? "..." : "Arrived"}
              </button>
            )}
          </div>
        )}

        {/* ARRIVED - verify PIN */}
        {driverStatus === "ARRIVED" && ride && (
          <div className="px-4 pb-4">
            <div className="text-center mb-3">
              <span
                className="text-[22px] font-bold"
                style={{ color: "#242E42" }}
              >
                {eta}
              </span>
              <span className="mx-2">&#128100;</span>
              <span
                className="text-[22px] font-bold"
                style={{ color: "#242E42" }}
              >
                {distance}
              </span>
            </div>
            <p
              className="text-center text-[14px] mb-4"
              style={{ color: "#8A8A8F" }}
            >
              Picking up {ride.riderName}
            </p>
            <div className="flex justify-center gap-6 mb-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
                  style={{ background: "#4CE5B1" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
                  </svg>
                </div>
                <span className="text-[12px] mt-1" style={{ color: "#242E42" }}>
                  Call
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
                  style={{ background: "#E8E8E8" }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#242E42"
                  >
                    <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <span className="text-[12px] mt-1" style={{ color: "#242E42" }}>
                  Message
                </span>
              </div>
              <div
                className="flex flex-col items-center"
                onClick={handleCancelTrip}
                style={{ cursor: "pointer" }}
              >
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
                  style={{ background: "#E8E8E8" }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#242E42"
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </div>
                <span className="text-[12px] mt-1" style={{ color: "#242E42" }}>
                  Cancel Trip
                </span>
              </div>
            </div>
            {/* PIN Input */}
            <div className="mb-3">
              <p
                className="text-center text-[13px] mb-2"
                style={{ color: "#8A8A8F" }}
              >
                Enter rider's 4-digit PIN
              </p>
              <input
                type="text"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ""));
                  setPinError("");
                }}
                placeholder="Enter PIN"
                className="w-full h-[44px] px-3 rounded-lg text-center text-[20px] font-bold tracking-[8px]"
                style={{
                  background: "#F7F4F4",
                  border: "1px solid #CCCCCC",
                  fontFamily: "Poppins, sans-serif",
                }}
              />
              {pinError && (
                <p
                  className="text-[12px] mt-1 text-center"
                  style={{ color: "#F52D56" }}
                >
                  {pinError}
                </p>
              )}
            </div>
            <button
              onClick={handleVerifyAndStart}
              disabled={!!loading || pinInput.length !== 4}
              className="w-full h-[48px] rounded-full text-white text-[16px] font-semibold"
              style={{
                background: pinInput.length === 4 ? "#4CE5B1" : "#C8C7CC",
                border: "none",
                cursor: "pointer",
              }}
            >
              {loading === "start" ? "..." : "Verify PIN & Start"}
            </button>
          </div>
        )}

        {/* START RIDE */}
        {driverStatus === "START_RIDE" && ride && (
          <div className="px-4 pb-4">
            <div className="text-center mb-3">
              <span
                className="text-[22px] font-bold"
                style={{ color: "#242E42" }}
              >
                {eta}
              </span>
              <span className="mx-2">&#128100;</span>
              <span
                className="text-[22px] font-bold"
                style={{ color: "#242E42" }}
              >
                {distance}
              </span>
            </div>
            <p
              className="text-center text-[14px] mb-4"
              style={{ color: "#8A8A8F" }}
            >
              Picking up {ride.riderName}
            </p>
            <button
              onClick={handleStartRide}
              disabled={!!loading}
              className="w-full h-[48px] rounded-full text-white text-[16px] font-semibold"
              style={{
                background: "#4CE5B1",
                border: "none",
                cursor: "pointer",
              }}
            >
              {loading === "startride" ? "..." : "Start"}
            </button>
          </div>
        )}

        {/* ACTIVE RIDE - navigation */}
        {driverStatus === "ACTIVE_RIDE" && ride && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between">
              <p
                className="text-[16px] font-semibold"
                style={{ color: "#242E42" }}
              >
                {navInstruction || "Navigating..."}
              </p>
              <button
                onClick={handleCompleteTrip}
                className="text-[22px]"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#4CE5B1",
                }}
              >
                &#10132;
              </button>
            </div>
          </div>
        )}

        {/* COMPLETE */}
        {driverStatus === "COMPLETE" && ride && (
          <div className="px-4 pb-4 text-center">
            <p
              className="text-[18px] font-bold mb-2"
              style={{ color: "#4CE5B1" }}
            >
              RIDE COMPLETE
            </p>
            <p
              className="text-[36px] font-bold mb-2"
              style={{ color: "#4CE5B1" }}
            >
              &#2547;{ride.finalFare || ride.estimatedFare}
            </p>
            <p className="text-[14px] mb-1" style={{ color: "#8A8A8F" }}>
              Time: {tripTime || "18 min"}
            </p>
            <p className="text-[14px] mb-4" style={{ color: "#8A8A8F" }}>
              Distance: {tripDistance || "—"}
            </p>
            <button
              onClick={handleCompleteTrip}
              disabled={!!loading}
              className="w-full h-[48px] rounded-full text-white text-[16px] font-semibold"
              style={{
                background: "#4CE5B1",
                border: "none",
                cursor: "pointer",
              }}
            >
              {loading === "complete" ? "..." : "COMPLETE TRIP"}
            </button>
          </div>
        )}

        {/* RATE RIDER */}
        {driverStatus === "RATE" && ride && (
          <div className="px-4 pb-6 text-center">
            <div className="flex justify-center mb-2">
              <StarRating value={riderRating} onChange={setRiderRating} />
            </div>
            <p
              className="text-[16px] font-semibold mb-4"
              style={{ color: "#242E42" }}
            >
              {ride.riderName}
            </p>
            <button
              onClick={handleRateRider}
              disabled={!riderRating || !!loading}
              className="w-full h-[48px] rounded-full text-white text-[16px] font-semibold"
              style={{
                background: "#4CE5B1",
                border: "none",
                cursor: "pointer",
                opacity: riderRating ? 1 : 0.5,
              }}
            >
              {loading === "rate" ? "..." : "Rate Rider"}
            </button>
          </div>
        )}
      </div>

      {/* Socket error banner */}
      {socketError && (
        <div
          className="absolute top-[80px] left-4 right-4 z-50 p-2 rounded-lg text-center text-[12px] text-white font-semibold"
          style={{ background: "#F52D56" }}
        >
          {socketError}
        </div>
      )}
    </div>
  );
}
