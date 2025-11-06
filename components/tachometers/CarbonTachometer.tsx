
import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { useSweepValue } from '../../hooks/useSweepValue';

interface DefaultTachometerProps {
  rpm: number;
  speed: number;
  gear: number;
  speedUnit: string;
}

const RPM_MAX = 8000;
const REDLINE_START = 7000;
const START_ANGLE = -135;
const END_ANGLE = 135;
const ANGLE_RANGE = END_ANGLE - START_ANGLE;

const CarbonTachometer: React.FC<DefaultTachometerProps> = ({ rpm, speed, gear, speedUnit }) => {
  const sweptRpm = useSweepValue(rpm, 0, RPM_MAX);
  const animatedRpm = useAnimatedValue(sweptRpm);
  const animatedSpeed = useAnimatedValue(speed);

  const valueToAngle = (val: number) => {
    const ratio = Math.max(0, Math.min(val, RPM_MAX)) / RPM_MAX;
    return START_ANGLE + ratio * ANGLE_RANGE;
  };
  
  const needleAngle = valueToAngle(animatedRpm);

  const gearDisplay = gear === 0 ? 'N' : gear;
  
  return (
    <div className="relative h-full w-full max-w-[500px] aspect-square">
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <defs>
            <pattern id="carbonPattern" patternUnits="userSpaceOnUse" width="12" height="12">
                <path d="M0 0 H12 V12 H0Z" fill="#111115"/>
                <path d="M0 0 H6 V6 H0Z" fill="#222228"/>
                <path d="M6 6 H12 V12 H6Z" fill="#222228"/>
            </pattern>
            <radialGradient id="silverBezel" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#f5f5f5"/>
                <stop offset="80%" stopColor="#e0e0e0"/>
                <stop offset="95%" stopColor="#a0a0a0"/>
                <stop offset="100%" stopColor="#606060"/>
            </radialGradient>
            <filter id="red-glow-filter">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            </filter>
        </defs>
        
        {/* Bezel */}
        <circle cx="200" cy="200" r="200" fill="url(#silverBezel)" />
        <circle cx="200" cy="200" r="195" fill="#222" />
        
        {/* Face */}
        <circle cx="200" cy="200" r="185" fill="url(#carbonPattern)" />
        <circle cx="200" cy="200" r="185" fill="rgba(0,0,0,0.2)" />
        
        {/* Redline Arc */}
        <path 
            d={`M ${200 + 175 * Math.cos((valueToAngle(REDLINE_START)-90) * Math.PI/180)} ${200 + 175 * Math.sin((valueToAngle(REDLINE_START)-90) * Math.PI/180)} A 175 175 0 0 1 ${200 + 175 * Math.cos((END_ANGLE-90) * Math.PI/180)} ${200 + 175 * Math.sin((END_ANGLE-90) * Math.PI/180)}`} 
            stroke="none"
            fill="var(--theme-accent-red)"
            opacity="0.8"
            filter="url(#red-glow-filter)"
        />
        
        {/* Ticks and Numbers */}
        {Array.from({ length: 41 }).map((_, i) => {
            const r = i * 200;
            if (r > RPM_MAX) return null;
            const angle = valueToAngle(r);
            const isMajor = i % 5 === 0;

            return (
                <g key={`tick-${i}`} transform={`rotate(${angle} 200 200)`}>
                    <line 
                        x1="200" y1="20" x2="200" y2={isMajor ? "40" : "30"} 
                        stroke={"rgba(255,255,255,0.8)"} 
                        strokeWidth={isMajor ? "3" : "1.5"} 
                    />
                     {isMajor && i > 0 && 
                        <text
                            x="200" y="60"
                            textAnchor="middle"
                            fill="white"
                            fontSize="36"
                            transform="rotate(180 200 60)"
                            className="font-display font-bold"
                        >
                            {i/5}
                        </text>
                     }
                </g>
            )
        })}
         <text x="200" y="60" textAnchor="middle" fill="white" fontSize="36" className="font-display font-bold" transform={`rotate(${valueToAngle(0)} 200 200) rotate(180 200 60)`}>0</text>
         {/* Redline ticks inside arc */}
         {Array.from({ length: 5 }).map((_, i) => {
             const r = 7000 + i * 200;
             const angle = valueToAngle(r);
             return (
                 <g key={`redtick-${i}`} transform={`rotate(${angle} 200 200)`}>
                    <line x1="200" y1="25" x2="200" y2="40" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
                 </g>
             )
         })}


        {/* Logo */}
        <text x="200" y="150" textAnchor="middle" fontSize="32" className="font-classic">
            <tspan fill="#cccccc" letterSpacing="-0.05em">CARTEL</tspan>
            <tspan fill="var(--theme-accent-primary)" letterSpacing="0.02em">WORX</tspan>
        </text>

        {/* Small check engine light */}
        <path transform="translate(145, 170)" d="M12 2L2 22h20L12 2zm1 16h-2v-2h2v2zm0-4h-2V9h2v5z" fill={rpm > 7500 ? 'var(--theme-accent-red)' : 'rgba(255,0,0,0.1)'} />

        {/* Central Display */}
        <rect x="150" y="270" width="100" height="60" rx="5" fill="rgba(10,10,15,0.7)" />
        <foreignObject x="150" y="270" width="100" height="60">
            <div className="w-full h-full flex flex-col items-center justify-center text-white font-mono text-center leading-tight">
                <div className="text-2xl font-bold">{gearDisplay}</div>
                <div className="text-xs -mt-1">Gear</div>
                <div className="text-2xl font-bold mt-1">{animatedSpeed.toFixed(0)}</div>
                <div className="text-xs -mt-1">{speedUnit}</div>
            </div>
        </foreignObject>

        {/* Needle */}
        <g transform={`rotate(${needleAngle} 200 200)`} style={{ transition: 'transform 0.1s cubic-bezier(.4, 0, .2, 1)' }}>
            <path d="M 200 220 L 197 30 L 203 30 L 200 220 Z" fill="var(--theme-accent-red)" style={{filter: 'drop-shadow(0 0 5px var(--theme-accent-red))'}} />
        </g>
        <circle cx="200" cy="200" r="12" fill="#333" stroke="#111" strokeWidth="2" />

      </svg>
    </div>
  );
};

export default CarbonTachometer;
