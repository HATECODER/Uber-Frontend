export default function StatusBar({ variant = 'black' }: { variant?: 'black' | 'white' }) {
  const textColor = variant === 'white' ? 'text-white' : 'text-black';

  return (
    <div className="flex items-center justify-between px-6 h-[44px] w-[375px] relative z-50" style={{ minHeight: 44 }}>
      <span className={`text-[14px] font-semibold ${textColor}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
        9:41
      </span>
      <div className="flex items-center gap-1">
        {/* Signal bars */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          <rect x="0" y="7" width="3" height="4" rx="0.5" fill={variant === 'white' ? 'white' : 'black'} />
          <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill={variant === 'white' ? 'white' : 'black'} />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill={variant === 'white' ? 'white' : 'black'} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={variant === 'white' ? 'white' : 'black'} />
        </svg>
        {/* WiFi */}
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
          <path d="M7.5 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill={variant === 'white' ? 'white' : 'black'} />
          <path d="M3.75 8.25a5.25 5.25 0 017.5 0" stroke={variant === 'white' ? 'white' : 'black'} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M1.5 5.5a9 9 0 0112 0" stroke={variant === 'white' ? 'white' : 'black'} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {/* Battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0" y="0.5" width="22" height="11" rx="2" stroke={variant === 'white' ? 'white' : 'black'} strokeWidth="1" />
          <rect x="2" y="2.5" width="18" height="7" rx="1" fill={variant === 'white' ? 'white' : 'black'} />
          <path d="M23 4v4a2 2 0 000-4z" fill={variant === 'white' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
        </svg>
      </div>
    </div>
  );
}
