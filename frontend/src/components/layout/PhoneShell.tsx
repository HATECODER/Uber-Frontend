import { type ReactNode } from 'react';
import '../../styles/phone-shell.css';

export default function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#1a1a2e' }}>
      <div className="phone-frame">
        <div className="phone-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
