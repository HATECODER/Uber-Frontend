interface OutlineButtonProps {
  label: string;
  onClick?: () => void;
  color?: string;
  className?: string;
}

export default function OutlineButton({ label, onClick, color = '#4CE5B1', className = '' }: OutlineButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`h-[40px] px-5 rounded-[20px] font-semibold text-[14px] transition-opacity ${className}`}
      style={{
        border: `2px solid ${color}`,
        background: 'transparent',
        color,
        fontFamily: 'Poppins, sans-serif',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
