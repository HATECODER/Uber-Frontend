import { useParams, useNavigate } from 'react-router-dom';
import StatusBar from '../components/layout/StatusBar';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import CTAButton from '../components/ui/CTAButton';
import { useState } from 'react';

export default function SafetyPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const [junitEnabled, setJunitEnabled] = useState(true);
  const [marcEnabled, setMarcEnabled] = useState(false);

  return (
    <div className="relative w-[375px] h-[812px] bg-white overflow-hidden flex flex-col">
      {/* Green header */}
      <div style={{ background: '#4CE5B1' }}>
        <StatusBar variant="white" />
        <div className="flex items-center pb-3 px-4">
          <button onClick={() => navigate(`/ride/${rideId}`)} className="text-white mr-3" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
            </svg>
          </button>
          <span className="text-white text-[17px] font-semibold flex-1 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF UI Display", sans-serif' }}>
            Safety ACT
          </span>
          <div className="w-[24px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {/* Emergency Assistance */}
        <h3 className="text-[16px] font-semibold mb-3" style={{ color: '#242E42', fontFamily: '-apple-system, sans-serif' }}>
          Emergency Assistance
        </h3>
        <div className="flex gap-3 mb-5">
          <button
            className="flex-1 h-[64px] rounded-xl flex items-center justify-center gap-2"
            style={{ background: '#FFF0F0', border: '1px solid #F52D56', cursor: 'pointer' }}
            onClick={() => { window.location.href = 'tel:999'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#F52D56">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
            </svg>
            <div className="text-left">
              <p className="text-[14px] font-semibold" style={{ color: '#F52D56' }}>Call Police</p>
              <p className="text-[11px]" style={{ color: '#8A8A8F' }}>999</p>
            </div>
          </button>
          <button
            className="flex-1 h-[64px] rounded-xl flex items-center justify-center gap-2"
            style={{ background: '#E8FFF5', border: '1px solid #4CE5B1', cursor: 'pointer' }}
            onClick={() => { window.location.href = 'tel:999'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#4CE5B1">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
            </svg>
            <div className="text-left">
              <p className="text-[14px] font-semibold" style={{ color: '#4CE5B1' }}>Call Ambulance</p>
              <p className="text-[11px]" style={{ color: '#8A8A8F' }}>999</p>
            </div>
          </button>
        </div>

        {/* Trusted Contacts */}
        <h3 className="text-[16px] font-semibold mb-3" style={{ color: '#242E42', fontFamily: '-apple-system, sans-serif' }}>
          Trusted Contacts
        </h3>
        <div className="mb-5 rounded-xl p-3" style={{ background: '#FAFAFA' }}>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] rounded-full bg-blue-200 flex items-center justify-center text-[14px] font-semibold text-blue-700">J</div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: '#242E42' }}>Junit</p>
                <p className="text-[12px]" style={{ color: '#8A8A8F' }}>+880 123 456 789</p>
              </div>
            </div>
            <ToggleSwitch initialValue={junitEnabled} onChange={setJunitEnabled} />
          </div>
          <div className="w-full h-[1px]" style={{ background: '#E8E8E8' }} />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-[36px] h-[36px] rounded-full bg-orange-200 flex items-center justify-center text-[14px] font-semibold text-orange-700">M</div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: '#242E42' }}>Marc</p>
                <p className="text-[12px]" style={{ color: '#8A8A8F' }}>+880 987 654 321</p>
              </div>
            </div>
            <ToggleSwitch initialValue={marcEnabled} onChange={setMarcEnabled} />
          </div>
        </div>

        {/* Safety Toolkit */}
        <h3 className="text-[16px] font-semibold mb-3" style={{ color: '#242E42', fontFamily: '-apple-system, sans-serif' }}>
          Safety Toolkit
        </h3>
        <div className="space-y-2 mb-5">
          {[
            { icon: '📍', label: 'Share Trip', desc: 'Share your ride with trusted contacts' },
            { icon: '📡', label: 'Live Location', desc: 'Enable real-time location sharing' },
            { icon: '💡', label: 'Safety Tips', desc: 'View safety recommendations' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FAFAFA' }}>
              <span className="text-[22px]">{item.icon}</span>
              <div className="flex-1">
                <p className="text-[14px] font-medium" style={{ color: '#242E42' }}>{item.label}</p>
                <p className="text-[12px]" style={{ color: '#8A8A8F' }}>{item.desc}</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#C8C7CC">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </div>
          ))}
        </div>

        {/* Get Helpline CTA */}
        <CTAButton label="Get Helpline" onClick={() => { window.location.href = 'tel:999'; }} />
        <div className="h-6" />
      </div>
    </div>
  );
}
