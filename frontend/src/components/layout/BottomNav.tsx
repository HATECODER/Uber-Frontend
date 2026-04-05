interface BottomNavProps {
  activeTab?: string;
}

const tabs = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'bookings', label: 'Bookings', icon: BookingsIcon },
  { id: 'notifications', label: 'Notifications', icon: NotificationsIcon },
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav({ activeTab = 'home' }: BottomNavProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white z-50">
      <div className="flex items-center justify-around h-[72px] px-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <div key={tab.id} className="flex flex-col items-center gap-1 cursor-pointer">
              <tab.icon active={isActive} />
              <span
                className="text-[12px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: isActive ? '#4CE5B1' : '#000000',
                }}
              >
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Home indicator */}
      <div className="flex justify-center pb-2">
        <div className="w-[134px] h-[5px] rounded-full" style={{ background: '#191052' }} />
      </div>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? '#4CE5B1' : '#000000';
  return (
    <svg width="24" height="24" fill={color} viewBox="0 0 24 24">
      <path d="M12 3l-10 9h3v9h6v-6h2v6h6v-9h3L12 3z" />
    </svg>
  );
}

function BookingsIcon({ active }: { active: boolean }) {
  const color = active ? '#4CE5B1' : '#000000';
  return (
    <svg width="24" height="24" fill={color} viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-4h8v2H8v-2z" />
    </svg>
  );
}

function NotificationsIcon({ active }: { active: boolean }) {
  const color = active ? '#4CE5B1' : '#000000';
  return (
    <svg width="24" height="24" fill={color} viewBox="0 0 24 24">
      <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

function WalletIcon({ active }: { active: boolean }) {
  const color = active ? '#4CE5B1' : '#000000';
  return (
    <svg width="24" height="24" fill={color} viewBox="0 0 24 24">
      <path d="M21 7H3a1 1 0 00-1 1v10a2 2 0 002 2h16a2 2 0 002-2V8a1 1 0 00-1-1zm-1 11H4V9h16v9zM3 5h18a1 1 0 100-2H3a1 1 0 100 2zm14 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const color = active ? '#4CE5B1' : '#000000';
  return (
    <svg width="24" height="24" fill={color} viewBox="0 0 24 24">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z" />
    </svg>
  );
}
