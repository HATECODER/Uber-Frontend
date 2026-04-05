import { type ReactNode } from 'react';

interface BottomSheetProps {
  children: ReactNode;
  className?: string;
}

export default function BottomSheet({ children, className = '' }: BottomSheetProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-40 ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0px -5px 10px rgba(0, 0, 0, 0.10)',
        padding: '16px 20px',
      }}
    >
      <div className="w-[50px] h-[5px] rounded-[3px] mx-auto mb-3" style={{ background: '#9B9B9B' }} />
      {children}
    </div>
  );
}
