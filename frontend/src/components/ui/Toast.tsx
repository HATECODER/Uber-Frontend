import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onHide, duration = 3000 }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onHide, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible && !show) return null;

  return (
    <div
      className="absolute bottom-[120px] left-1/2 z-[100] px-5 py-3 rounded-xl text-white text-[14px] font-medium shadow-lg transition-all duration-300"
      style={{
        transform: `translateX(-50%) translateY(${show ? '0' : '20px'})`,
        opacity: show ? 1 : 0,
        background: '#242E42',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {message}
    </div>
  );
}
