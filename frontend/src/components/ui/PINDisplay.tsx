interface PINDisplayProps {
  pin: string;
  verified?: boolean;
}

export default function PINDisplay({ pin, verified }: PINDisplayProps) {
  const digits = pin.split('');

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[14px] font-semibold" style={{ color: '#242E42', fontFamily: 'Poppins, sans-serif' }}>
        {verified ? 'PIN Verified ✓' : 'Share this PIN with your driver'}
      </p>
      <div className="flex gap-3">
        {digits.map((d, i) => (
          <div
            key={i}
            className="w-[52px] h-[60px] flex items-center justify-center rounded-[12px] text-[24px] font-bold"
            style={{
              background: verified ? '#4CE5B1' : '#F7F4F4',
              color: verified ? 'white' : '#242E42',
              fontFamily: 'Poppins, sans-serif',
              border: verified ? 'none' : '2px solid #4CE5B1',
            }}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}
