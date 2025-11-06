import React from 'react';

interface ShiftLightProps {
  rpm: number;
  shiftPoint: number | null;
  onClick: () => void;
}

const ShiftLight: React.FC<ShiftLightProps> = ({ rpm, shiftPoint, onClick }) => {
  const isOn = shiftPoint !== null && rpm >= shiftPoint;
  const isFlashing = shiftPoint !== null && rpm >= (shiftPoint + 150);

  const flashAnimation = isFlashing ? 'shiftlight-flash 0.1s infinite alternate' : 'none';
  
  const lightFill = isOn ? '#ff1a1a' : '#4d0000';
  const lightFilter = isOn ? 'url(#shiftlight-glow)' : 'none';

  return (
    <>
      <style>{`
        @keyframes shiftlight-flash {
          from { 
            filter: url(#shiftlight-glow) brightness(1.7) saturate(1.5);
          }
          to { 
            filter: url(#shiftlight-glow) brightness(0.9) saturate(1);
          }
        }
      `}</style>
      <div 
        className="absolute top-[8%] right-[2%] w-24 h-28 transform -rotate-[15deg] cursor-pointer group z-20"
        onClick={onClick}
        title={shiftPoint ? `Shift point: ${shiftPoint.toFixed(0)} RPM. Click to clear.` : 'Click to set shift point at current RPM.'}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full" style={{filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.6))'}}>
          <defs>
            <filter id="shiftlight-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="body-metal-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2a2a2e" />
                <stop offset="50%" stopColor="#4a4a4e" />
                <stop offset="100%" stopColor="#2a2a2e" />
            </linearGradient>
            <radialGradient id="screw-metal-grad" cx="50%" cy="50%" r="50%" fx="25%" fy="25%">
                <stop offset="0%" stopColor="#e0e0e0" />
                <stop offset="100%" stopColor="#808080" />
            </radialGradient>
          </defs>
          
          {/* Mount */}
          <rect x="85" y="45" width="20" height="30" rx="3" fill="url(#body-metal-grad)" stroke="#111" strokeWidth="1" />
          
          {/* Main Body */}
          <rect x="10" y="10" width="80" height="100" rx="15" fill="url(#body-metal-grad)" stroke="#111" strokeWidth="2" />
          <path d="M 10 25 C 20 15, 70 15, 80 25" fill="rgba(255,255,255,0.1)" />

          {/* Bezel Ring */}
          <circle cx="50" cy="60" r="45" fill="none" stroke="#202022" strokeWidth="10" />
          
          {/* Screws */}
          <circle cx="50" cy="21" r="3.5" fill="url(#screw-metal-grad)" />
          <circle cx="50" cy="99" r="3.5" fill="url(#screw-metal-grad)" />

          {/* Lens */}
          <circle cx="50" cy="60" r="36" fill="#1a0000" />
          <circle 
            cx="50" cy="60" r="34" 
            fill={lightFill}
            style={{ 
              filter: lightFilter, 
              animation: flashAnimation,
              transition: 'fill 0.05s linear'
            }}
          />
           {/* Lens Glare */}
           <path 
            d="M 25 35 C 40 30, 60 32, 75 42 Q 55 52, 30 48 Z"
            fill="rgba(255,255,255,0.15)"
           />
        </svg>
      </div>
    </>
  );
};

export default ShiftLight;