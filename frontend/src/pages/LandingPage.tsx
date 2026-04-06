import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusBar from "../components/layout/StatusBar";
import BottomNav from "../components/layout/BottomNav";
import CTAButton from "../components/ui/CTAButton";
import { createRide, DEMO_RIDER_ID } from "../api/rides";
import { useRide } from "../context/RideContext";

// Pre-filled demo locations — both on Airport Road (major highway)
const PICKUP = {
  lat: 23.77,
  lng: 90.3957,
  address: "Airport Road, Tejgaon, Dhaka",
};

const DESTINATION = {
  lat: 23.757,
  lng: 90.3905,
  address: "Farmgate, Dhaka",
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { dispatch } = useRide();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBookRide = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await createRide({
        riderId: DEMO_RIDER_ID,
        pickupLat: PICKUP.lat,
        pickupLng: PICKUP.lng,
        pickupAddress: PICKUP.address,
        destLat: DESTINATION.lat,
        destLng: DESTINATION.lng,
        destAddress: DESTINATION.address,
        vehicleType: "UberX",
      });

      dispatch({
        type: "SET_RIDE",
        payload: {
          rideId: res.rideId,
          pin: res.pin,
          status: "REQUESTED",
          trackingPhase: "arrival",
          pickupAddress: PICKUP.address,
          destAddress: DESTINATION.address,
          pickupLat: PICKUP.lat,
          pickupLng: PICKUP.lng,
          destLat: DESTINATION.lat,
          destLng: DESTINATION.lng,
          driverInfo: null,
        },
      });

      navigate(`/ride/${res.rideId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to book ride";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-[375px] h-[812px] bg-white overflow-hidden">
      <StatusBar variant="black" />

      {/* Map background placeholder */}
      <div
        className="absolute top-[44px] left-0 right-0 bottom-[106px]"
        style={{ background: "#e8e4de" }}
      >
        <div className="w-full h-full flex items-center justify-center opacity-50">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="#4CE5B1">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
          </svg>
        </div>
      </div>

      {/* Location chips row */}
      <div className="absolute top-[380px] left-4 right-4 flex gap-2 z-10">
        {["Home", "Office", "Apartment"].map((label) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 h-[29px] rounded-[19px]"
            style={{ border: "2px solid #4CE5B1", background: "#FEFEFF" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#3CC585">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            </svg>
            <span
              className="text-[12px]"
              style={{ color: "#3CC585", fontFamily: "Inter, sans-serif" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom content area */}
      <div
        className="absolute bottom-[106px] left-0 right-0 z-20"
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "16px 16px 0 0",
          boxShadow: "0px -5px 10px rgba(0,0,0,0.10)",
          padding: "20px",
        }}
      >
        {/* Route summary */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-[12px] h-[12px] rounded-full border-2"
              style={{ borderColor: "#4CE5B1", background: "#4CE5B1" }}
            />
            <span
              className="text-[15px]"
              style={{
                color: "#242E42",
                fontFamily: "-apple-system, sans-serif",
              }}
            >
              {PICKUP.address}
            </span>
          </div>
          <div
            className="ml-[5px] w-[2px] h-[20px] mb-2"
            style={{ background: "#C8C7CC", borderLeft: "2px dashed #C8C7CC" }}
          />
          <div className="flex items-center gap-3">
            <svg width="12" height="16" viewBox="0 0 24 32" fill="#F52D56">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z" />
            </svg>
            <span
              className="text-[15px]"
              style={{
                color: "#242E42",
                fontFamily: "-apple-system, sans-serif",
              }}
            >
              {DESTINATION.address}
            </span>
          </div>
        </div>

        {/* Distance */}
        <div
          className="flex items-center justify-between py-3 mb-3"
          style={{
            borderTop: "1px solid #CCCCCC",
            borderBottom: "1px solid #CCCCCC",
          }}
        >
          <span
            className="text-[15px] font-semibold"
            style={{ color: "#242E42" }}
          >
            Distance
          </span>
          <span className="text-[15px]" style={{ color: "#8A8A8F" }}>
            3.6 km
          </span>
        </div>

        {error && (
          <p
            className="text-[13px] text-center mb-3"
            style={{ color: "#F52D56" }}
          >
            {error}
          </p>
        )}

        <CTAButton
          label="CONTINUE"
          onClick={handleBookRide}
          loading={loading}
        />

        <div className="mt-3">
          <CTAButton label="CHANGE PICKUP" variant="secondary" />
        </div>

        <p
          className="text-center mt-3 text-[13px] cursor-pointer"
          style={{ color: "#8A8A8F", fontFamily: "Inter, sans-serif" }}
        >
          Skip for now
        </p>
      </div>

      <BottomNav activeTab="home" />
    </div>
  );
}
