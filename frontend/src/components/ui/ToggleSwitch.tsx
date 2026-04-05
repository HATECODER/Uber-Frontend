import { useState } from 'react';

interface ToggleSwitchProps {
  initialValue?: boolean;
  onChange?: (value: boolean) => void;
}

export default function ToggleSwitch({ initialValue = false, onChange }: ToggleSwitchProps) {
  const [on, setOn] = useState(initialValue);

  return (
    <div
      className="w-[51px] h-[31px] rounded-full relative cursor-pointer transition-colors"
      style={{ background: on ? '#4CE5B1' : '#C8C7CC' }}
      onClick={() => {
        setOn(!on);
        onChange?.(!on);
      }}
    >
      <div
        className="w-[27px] h-[27px] bg-white rounded-full absolute top-[2px] transition-all shadow-sm"
        style={{ left: on ? '22px' : '2px' }}
      />
    </div>
  );
}
