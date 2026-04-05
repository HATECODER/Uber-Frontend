interface CTAButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function CTAButton({ label, onClick, variant = 'primary', disabled, loading, className = '' }: CTAButtonProps) {
  const bgColor = variant === 'primary' ? '#4CE5B1' : variant === 'danger' ? '#F52D56' : '#242E42';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full h-[48px] rounded-[24px] text-white font-semibold text-[17px] uppercase tracking-wide transition-opacity ${disabled ? 'opacity-50' : 'opacity-100'} ${className}`}
      style={{
        background: bgColor,
        fontFamily: 'Poppins, sans-serif',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? (
        <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        label
      )}
    </button>
  );
}
