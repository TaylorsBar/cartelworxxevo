

import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

interface ModernGaugeProps {
    value: number;
    min: number;
    max: number;
    label: string;
    size?: 'large' | 'small';
}

const ModernGauge: React.FC<ModernGaugeProps> = ({ value, min, max, label, size = 'large' }) => {
    const animatedValue = useAnimatedValue(value);

    const isLarge = size === 'large';
    const radius = isLarge ? 150 : 80;
    const center = radius;
    const strokeWidth = isLarge ? 2 : 1.5;
    
    const ANGLE_MIN = -225;
    const ANGLE_MAX = 45;
    const angleRange = ANGLE_MAX - ANGLE_MIN;

    const valueToAngle = (val: number) => {
        const valueRatio = (Math.max(min, Math.min(val, max)) - min) / (max - min);
        return ANGLE_MIN + valueRatio * angleRange;
    };

    const getTickColor = (tickValue: number) => {
        let redlineStart: number, warningStart: number;
        if (label === 'RPM') {
            redlineStart = 6000;
            warningStart = 5000;
        } else if (label === 'TURBO') {
            redlineStart = 25;
            warningStart = 20;
        } else { // THROTTLE
            redlineStart = 90;
            warningStart = 80;
        }

        if (tickValue >= redlineStart) return 'var(--theme-accent-red)';
        if (tickValue >= warningStart) return 'var(--theme-accent-yellow)';
        return 'var(--theme-accent-primary)';
    };

    const needleAngle = valueToAngle(animatedValue);
    const numTicks = label === 'TURBO' ? 7 : (isLarge ? 9 : 5);
    const numMinorTicks = isLarge ? 40 : 20;

    return (
        <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
            <svg viewBox={`0 0 ${radius * 2} ${radius * 2}`} className="w-full h-full">
                <defs>
                    <filter id={`modern-glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation={isLarge ? "2" : "1"} result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                     <filter id={`needle-shadow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy={isLarge ? 1 : 0.5} stdDeviation={isLarge ? 1 : 0.5} floodColor="#000" floodOpacity="0.7"/>
                    </filter>
                    <radialGradient id="modern-bezel" cx="50%" cy="50%" r="50%">
                        <stop offset="90%" stopColor="#1a1a1a" />
                        <stop offset="98%" stopColor="#4a4a4a" />
                        <stop offset="100%" stopColor="#2a2a2a" />
                    </radialGradient>
                    <radialGradient id="modern-face" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#080808" />
                        <stop offset="100%" stopColor="#000000" />
                    </radialGradient>
                    <radialGradient id="modern-glare" cx="50%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                </defs>
                
                <circle cx={center} cy={center} r={radius} fill="url(#modern-bezel)" />
                <circle cx={center} cy={center} r={radius * 0.9} fill="url(#modern-face)" />

                {isLarge && (
                    <text
                        x={center}
                        y={center * 0.65}
                        textAnchor="middle"
                        fill="rgba(255, 255, 255, 0.4)"
                        fontSize="22"
                        fontFamily="cursive"
                        fontStyle="italic"
                    >
                        CartelWorx
                    </text>
                )}

                {Array.from({ length: numMinorTicks + 1 }).map((_, i) => {
                    const tickValue = min + i * ((max - min) / numMinorTicks);
                    if (tickValue > max) return null;
                    const angle = valueToAngle(tickValue);
                    const color = getTickColor(tickValue);
                    return (
                        <g key={`minor-tick-${i}`} transform={`rotate(${angle} ${center} ${center})`}>
                            <line
                                x1={center} y1={radius * 0.1}
                                x2={center} y2={radius * 0.15}
                                stroke={color}
                                strokeOpacity="0.4"
                                strokeWidth={strokeWidth / 2}
                            />
                        </g>
                    );
                })}

                {Array.from({ length: numTicks }).map((_, i) => {
                    const tickValue = min + i * ((max - min) / (numTicks - 1));
                    const angle = valueToAngle(tickValue);
                    const textX = center + radius * 0.75 * Math.cos((angle - 90) * Math.PI / 180);
                    const textY = center + radius * 0.75 * Math.sin((angle - 90) * Math.PI / 180);
                    const color = getTickColor(tickValue);
                    
                    return (
                        <g key={`major-tick-${i}`}>
                            <g transform={`rotate(${angle} ${center} ${center})`}>
                                <line
                                    x1={center} y1={radius * 0.1}
                                    x2={center} y2={radius * 0.22}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                />
                            </g>
                            <text
                                x={textX} y={textY}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={color}
                                fontSize={isLarge ? "16" : "10"}
                                className="font-sans font-semibold"
                                opacity="0.8"
                            >
                                {label === 'RPM' ? tickValue / 1000 : tickValue.toFixed(0)}
                            </text>
                        </g>
                    );
                })}
                
                <g transform={`rotate(${needleAngle} ${center} ${center})`} style={{ transition: 'transform 0.1s ease-out' }} filter={`url(#needle-shadow-${size})`}>
                    <path d={`M ${center} ${center + radius * 0.15} L ${center} ${radius * 0.1}`} stroke="var(--theme-accent-yellow)" strokeWidth={isLarge ? 5 : 3} strokeLinecap="round" filter={`url(#modern-glow-${size})`} />
                </g>
                <circle cx={center} cy={center} r={radius * 0.1} fill="#1a1a1a" />
                <circle cx={center} cy={center} r={radius * 0.05} fill="#000" />

                <circle cx={center} cy={center} r={radius * 0.9} fill="url(#modern-glare)" />
            </svg>
        </div>
    );
};

export default ModernGauge;