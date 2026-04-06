import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StatusBar from "../components/layout/StatusBar";
import StarRating from "../components/ui/StarRating";
import CTAButton from "../components/ui/CTAButton";
import { submitRating } from "../api/rides";
import { useRide } from "../context/RideContext";

export default function RatingPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const { state } = useRide();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rideId || rating === 0) return;
    setSubmitting(true);
    try {
      await submitRating(rideId, "rider", rating);
      setSubmitted(true);
      setTimeout(() => navigate("/"), 2000);
    } catch {
      alert("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-[375px] h-[812px] bg-white overflow-hidden flex flex-col">
      {/* Green header */}
      <div style={{ background: "#4CE5B1" }}>
        <StatusBar variant="white" />
        <div className="text-center pb-3">
          <span
            className="text-white text-[17px] font-semibold"
            style={{
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF UI Display", sans-serif',
            }}
          >
            Rate Your Trip
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-8">
        {/* Driver photo circle */}
        <div className="w-[90px] h-[90px] rounded-full bg-gray-200 flex items-center justify-center mb-4 overflow-hidden">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="#8A8A8F">
            <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
          </svg>
        </div>

        {/* Driver name */}
        <p
          className="text-[18px] font-semibold mb-1"
          style={{ color: "#242E42", fontFamily: "-apple-system, sans-serif" }}
        >
          Himel
        </p>
        <p className="text-[14px] mb-6" style={{ color: "#8A8A8F" }}>
          {state.driverInfo?.vehicle || ""}
        </p>

        {/* Fare summary */}
        {state.finalFare && (
          <div
            className="w-full p-4 rounded-xl mb-6"
            style={{ background: "#F7F7F7" }}
          >
            <div className="flex justify-between">
              <span className="text-[14px]" style={{ color: "#8A8A8F" }}>
                Trip Fare
              </span>
              <span
                className="text-[18px] font-bold"
                style={{ color: "#242E42" }}
              >
                ৳{state.finalFare}
              </span>
            </div>
          </div>
        )}

        {/* How is your trip? */}
        <p
          className="text-[20px] font-semibold mb-4"
          style={{ color: "#242E42", fontFamily: "Poppins, sans-serif" }}
        >
          How is your trip?
        </p>

        {/* Star rating */}
        <div className="mb-6">
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          rows={3}
          className="w-full p-3 rounded-xl text-[14px] resize-none"
          style={{
            background: "#F7F4F4",
            border: "1px solid #CCCCCC",
            fontFamily: "Inter, sans-serif",
            color: "#242E42",
          }}
        />

        <div className="flex-1" />

        {/* Submit */}
        {!submitted ? (
          <div className="w-full pb-8">
            <CTAButton
              label="Submit Review"
              onClick={handleSubmit}
              loading={submitting}
              disabled={rating === 0}
            />
          </div>
        ) : (
          <div className="pb-8 text-center">
            <p
              className="text-[16px] font-semibold"
              style={{ color: "#4CE5B1" }}
            >
              Thank you for your feedback!
            </p>
            <p className="text-[13px] mt-1" style={{ color: "#8A8A8F" }}>
              Redirecting to home...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
