

import React from 'react';
import { useAnimatedValue } from '../../../hooks/useAnimatedValue';
import { useUnitConversion } from '../../../hooks/useUnitConversion';
import Ic7IndicatorIcons from './Ic7IndicatorIcons';
import { useSweepValue } from '../../../hooks/useSweepValue';

interface Ic7TachometerProps {
  rpm: number;
  speed: number;
  gear: number;
  speedUnit: string;
  trip: number;
  checkEngine?: boolean;
  lowOilPressure?: boolean;
  highCoolantTemp?: boolean;
  lowBattery?: boolean;
}

const RPM_MAX = 8000;
const REDLINE_START = 7000;
const START_ANGLE = -150;
const END_ANGLE = 150;
const ANGLE_RANGE = END_ANGLE - START_ANGLE;

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const start = { x: x + radius * Math.cos(startRad), y: y + radius * Math.sin(startRad) };
    const end = { x: x + radius * Math.cos(endRad), y: y + radius * Math.sin(endRad) };
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const Ic7Tachometer: React.FC<Ic7TachometerProps> = (props) => {
    const sweptRpm = useSweepValue(props.rpm, 0, RPM_MAX);
    const animatedRpm = useAnimatedValue(sweptRpm);
    const animatedSpeed = useAnimatedValue(props.speed);
    const { getDistanceUnit } = useUnitConversion();

    const valueToAngle = (val: number) => {
        const ratio = Math.max(0, Math.min(val, RPM_MAX)) / RPM_MAX;
        return START_ANGLE + ratio * ANGLE_RANGE;
    };
  
    const needleAngle = valueToAngle(animatedRpm);
    const gearDisplay = props.gear === 0 ? 'N' : props.gear;

    return (
        <div className="relative w-full aspect-square">
            <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                    <radialGradient id="ic7-bezel" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                        <stop offset="90%" stopColor="#383838" />
                        <stop offset="98%" stopColor="#c0c0c0" />
                        <stop offset="100%" stopColor="#505050" />
                    </radialGradient>
                    <pattern id="ic7-carbon" patternUnits="userSpaceOnUse" width="10" height="10">
                        <path d="M0 0 H10 V10 H0Z" fill="#111"/>
                        <path d="M0 0 H5 V5 H0Z" fill="#1a1a1a"/>
                        <path d="M5 5 H10 V10 H5Z" fill="#1a1a1a"/>
                    </pattern>
                    <radialGradient id="ic7-glare" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                    <filter id="ic7-red-glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="ic7-needle-shadow">
                        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5"/>
                    </filter>
                </defs>
                
                {/* Bezel & Face */}
                <circle cx="200" cy="200" r="200" fill="url(#ic7-bezel)" />
                <circle cx="200" cy="200" r="192" fill="#000" />
                <circle cx="200" cy="200" r="188" fill="url(#ic7-carbon)" />

                {/* Redline Arc */}
                <path d={describeArc(200, 200, 175, valueToAngle(REDLINE_START), END_ANGLE)} fill="none" stroke="#FF0000" strokeWidth="12" filter="url(#ic7-red-glow)" />
                
                {/* Minor Ticks */}
                {Array.from({ length: 41 }).map((_, i) => {
                    const r = i * 200;
                    if (r > RPM_MAX) return null;
                    const angle = valueToAngle(r);
                    return (
                        <g key={`minortick-${i}`} transform={`rotate(${angle} 200 200)`}>
                            <line x1="200" y1="20" x2="200" y2="30" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                        </g>
                    )
                })}
                
                {/* Major Ticks and Numbers */}
                {Array.from({ length: 9 }).map((_, i) => {
                    const r = i * 1000;
                    const angle = valueToAngle(r);
                    const isRed = r >= REDLINE_START;
                    return (
                        <g key={`tick-${i}`}>
                            <g transform={`rotate(${angle} 200 200)`}>
                                <line x1="200" y1="20" x2="200" y2="40" stroke={isRed ? "#FF0000" : "#FFFFFF"} strokeWidth="3" />
                            </g>
                            <text
                                x={200 + 155 * Math.cos((angle - 90) * Math.PI / 180)} 
                                y={200 + 155 * Math.sin((angle - 90) * Math.PI / 180)}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={isRed ? "#FF0000" : "#FFFFFF"}
                                fontSize="28"
                                className="font-display font-bold"
                             >
                                {i}
                            </text>
                        </g>
                    )
                })}

                {/* Branding */}
                <text x="200" y="130" textAnchor="middle" fontSize="32" className="font-classic">
                    <tspan fill="#cccccc" letterSpacing="-0.05em">CARTEL</tspan>
                    <tspan fill="var(--theme-accent-primary)" letterSpacing="0.02em">WORX</tspan>
                </text>
                
                {/* Indicators */}
                <foreignObject x="120" y="145" width="160" height="30">
                    <Ic7IndicatorIcons {...props} />
                </foreignObject>

                {/* Digital "LCD" Display */}
                <path d="M 120 240 Q 120 230, 130 230 H 270 Q 280 230, 280 240 V 310 H 120 Z" fill="#15181c" stroke="#25282c" strokeWidth="1" />
                <foreignObject x="110" y="235" width="180" height="80">
                    <div className="w-full h-full flex items-center justify-around text-white p-2">
                        <div className="text-center">
                            <div className="font-display font-black text-5xl leading-none">{gearDisplay}</div>
                            <div className="font-sans text-xs text-gray-400">Gear</div>
                        </div>
                        <div className="text-center">
                            <div className="font-display font-black text-5xl leading-none">{animatedSpeed.toFixed(0)}</div>
                            <div className="font-sans text-xs text-gray-400">{props.speedUnit}</div>
                        </div>
                        <div className="text-center">
                            <div className="font-display font-black text-2xl leading-none">{(props.trip * (getDistanceUnit() === 'mi' ? 0.621371 : 1)).toFixed(1)}</div>
                            <div className="font-sans text-xs text-gray-400">{getDistanceUnit()}</div>
                        </div>
                    </div>
                </foreignObject>
                
                {/* Needle */}
                <g transform={`rotate(${needleAngle} 200 200)`} style={{ transition: 'transform 0.1s ease-out' }} filter="url(#ic7-needle-shadow)">
                    <path d="M 198 215 L 197 40 L 203 40 L 202 215 A 15 15 0 0 1 198 215 Z" fill="#ff4d4d"/>
                    <path d="M 199.5 210 L 199 45 L 201 45 L 200.5 210 Z" fill="#ff0000"/>
                </g>
                <circle cx="200" cy="200" r="15" fill="#111" stroke="#333" strokeWidth="2" />
                
                {/* Glass Glare */}
                <circle cx="200" cy="200" r="188" fill="url(#ic7-glare)" />
            </svg>
        </div>
    );
};

export default Ic7Tachometer;
