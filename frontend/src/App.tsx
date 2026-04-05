import { Routes, Route } from 'react-router-dom';
import PhoneShell from './components/layout/PhoneShell';
import DriverPanel from './pages/DriverPanel';
import LandingPage from './pages/LandingPage';
import TrackingPage from './pages/TrackingPage';
import SafetyPage from './pages/SafetyPage';
import RatingPage from './pages/RatingPage';

export default function App() {
  return (
    <PhoneShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ride/:rideId" element={<TrackingPage />} />
        <Route path="/ride/:rideId/safety" element={<SafetyPage />} />
        <Route path="/rate/:rideId" element={<RatingPage />} />
        <Route path="/driver" element={<DriverPanel />} />
      </Routes>
    </PhoneShell>
  );
}
