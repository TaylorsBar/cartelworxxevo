

import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { useSweepValue } from '../../hooks/useSweepValue';

interface ClassicGaugeProps {
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    size: 'large' | 'small';
    coldZoneEndValue?: number;
    warningValue?: number;
    redlineValue?: number;
    dangerZone?: 'high' | 'low';
}

const sizeConfig = {
    large: { radius: 200, ticks: 9, stroke: 3, font: 20, valueFont: 36, unitFont: 14, labelFont: 16 },
    small: { radius: 100, ticks: 5, stroke: 2, font: 14, valueFont: 24, unitFont: 10, labelFont: 10 },
};

const ClassicGauge: React.FC<ClassicGaugeProps> = ({ label, value, min, max, unit, size, coldZoneEndValue, warningValue, redlineValue, dangerZone = 'high' }) => {
    const sweptValue = useSweepValue(value, min, max);
    const animatedValue = useAnimatedValue(sweptValue);
    const config = sizeConfig[size];
    const radius = config.radius;
    const center = radius;
    
    const ANGLE_MIN = -135;
    const ANGLE_MAX = 135;
    const angleRange = ANGLE_MAX - ANGLE_MIN;
    
    const valueRatio = (Math.max(min, Math.min(animatedValue, max)) - min) / (max - min);
    const angle = ANGLE_MIN + valueRatio * angleRange;

    const tickValue = (i: number) => min + (i / (config.ticks - 1)) * (max - min);
    
    const displayValue = unit === 'x1000' ? (animatedValue / 1000).toFixed(1) : animatedValue.toFixed(0);

    const inRedline = React.useMemo(() => {
        if (dangerZone === 'low') {
            return redlineValue !== undefined && animatedValue <= redlineValue;
        }
        return redlineValue !== undefined && animatedValue >= redlineValue;
    }, [animatedValue, redlineValue, dangerZone]);

    const inWarning = React.useMemo(() => {
        if (dangerZone === 'low') {
            return warningValue !== undefined && animatedValue <= warningValue && !inRedline;
        }
        return warningValue !== undefined && animatedValue >= warningValue && !inRedline;
    }, [animatedValue, warningValue, dangerZone, inRedline]);
    
    const getBacklightStyle = () => {
        if (inRedline) return { fill: 'var(--theme-accent-red)', opacity: 0.35, filter: 'url(#classic-glow-red)' };
        if (inWarning) return { fill: 'var(--theme-accent-primary)', opacity: 0.25, filter: 'url(#classic-glow-yellow)' };
        return { fill: 'transparent', opacity: 0 };
    };
    
    const needleWidth = radius * 0.03;
    const needleTailLength = radius * 0.15;
    const needlePath = `
      M ${center - needleWidth * 0.7} ${center}
      L ${center} ${radius * 0.12}
      L ${center + needleWidth * 0.7} ${center}
      L ${center} ${center + needleTailLength}
      Z
    `;

    const needleFill = React.useMemo(() => {
        return inRedline ? 'url(#classic-needle-grad-red)' : 'url(#classic-needle-grad)';
    }, [inRedline]);

    return (
        <div className="relative w-full h-full filter drop-shadow-lg">
            <svg viewBox={`0 0 ${radius * 2} ${radius * 2}`} className="w-full h-full">
                <defs>
                    <radialGradient id="classic-chrome-bezel" cx="50%" cy="50%" r="50%" fx="35%" fy="35%">
                        <stop offset="0%" stopColor="#f5f5f5" />
                        <stop offset="85%" stopColor="#c0c0c0" />
                        <stop offset="95%" stopColor="#a0a0a0" />
                        <stop offset="100%" stopColor="#444444" />
                    </radialGradient>
                    <radialGradient id="classic-face-grad">
                        <stop offset="0%" stopColor="#1a1a1a" />
                        <stop offset="100%" stopColor="#000" />
                    </radialGradient>
                    <linearGradient id="classic-glare" x1="0" y1="0" x2="1" y2="1">
                         <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                         <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                     <linearGradient id="classic-needle-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--theme-needle-color)" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#FFFF00" />
                        <stop offset="100%" stopColor="var(--theme-needle-color)" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="classic-needle-grad-red" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ff4d4d" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#ff0000" />
                        <stop offset="100%" stopColor="#ff4d4d" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="classic-needle-shadow">
                        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.6"/>
                    </filter>
                    <filter id="classic-glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="15" result="coloredBlur" />
                    </filter>
                    <filter id="classic-glow-red" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Bezel & Face */}
                <circle cx={center} cy={center} r={radius} fill="url(#classic-chrome-bezel)" />
                <circle cx={center} cy={center} r={radius * 0.95} fill="#111" />
                <circle cx={center} cy={center} r={radius * 0.9} fill="url(#classic-face-grad)" />
                <circle cx={center} cy={center} r={radius * 0.9} fill="transparent" stroke="rgba(0,0,0,0.5)" strokeWidth={radius*0.03} />

                
                {/* Dynamic Backlight */}
                <circle cx={center} cy={center} r={radius * 0.88} {...getBacklightStyle()} style={{ transition: 'fill 0.3s, opacity 0.3s' }} />

                {/* Ticks & Numbers */}
                {Array.from({ length: config.ticks }).map((_, i) => {
                    const tv = tickValue(i);
                    const isCold = coldZoneEndValue !== undefined && tv <= coldZoneEndValue;
                    const getNumberFill = () => 'var(--theme-text-primary)';
                    const tickAngle = ANGLE_MIN + (i / (config.ticks - 1)) * angleRange;
                    const textAngle = tickAngle + 90;
                    const textX = center + radius * 0.7 * Math.cos(textAngle * Math.PI / 180);
                    const textY = center + radius * 0.7 * Math.sin(textAngle * Math.PI / 180);
                    
                    return (
                        <g key={`tick-${i}`}>
                            <g transform={`rotate(${tickAngle} ${center} ${center})`}>
                                <line x1={center} y1={radius * 0.1} x2={center} y2={radius * 0.2} stroke={isCold ? '#60a5fa' : 'var(--theme-text-secondary)'} strokeWidth={config.stroke} />
                            </g>
                             <text
                                x={textX} y={textY}
                                textAnchor="middle" dominantBaseline="middle"
                                fill={getNumberFill()}
                                fontSize={config.font}
                                className="font-classic"
                            >
                                {unit === 'x1000' ? tv / 1000 : tv.toFixed(0)}
                            </text>
                        </g>
                    )
                })}

                {/* Labels and Digital Readout */}
                <text x={center} y={center - radius * 0.4} textAnchor="middle" fill="var(--theme-text-secondary)" fontSize={config.labelFont * 1.5} className="font-sans uppercase font-bold">{label}</text>
                 <foreignObject x={0} y={center - radius * 0.2} width={radius*2} height={radius*0.6}>
                     <div className="flex flex-col items-center justify-center text-center w-full h-full">
                        <div 
                           className="font-mono font-bold" 
                           style={{
                                color: 'var(--theme-text-primary)',
                                fontSize: `${config.valueFont}px`, 
                                textShadow: `0 0 8px rgba(255,255,255,0.7)`
                            }}
                        >
                            {displayValue}
                        </div>
                        <div className="font-sans text-gray-400 -mt-1" style={{fontSize: `${config.unitFont}px`}}>{unit}</div>
                    </div>
                </foreignObject>

                {/* High-Fidelity Needle */}
                <g 
                    transform={`rotate(${angle} ${center} ${center})`} 
                    style={{ transition: 'transform 0.1s ease-out' }} 
                    filter={`url(#classic-needle-shadow) ${inRedline ? 'url(#classic-glow-red)' : ''}`}
                >
                    <path d={needlePath} fill={needleFill} />
                    <path d={`M ${center} ${center + needleTailLength * 0.8} L ${center} ${radius * 0.15}`} stroke="rgba(255,255,255,0.5)" strokeWidth={radius * 0.008} />
                </g>
                
                {/* Pivot */}
                <circle cx={center} cy={center} r={radius * 0.08} fill="#444" stroke="#111" strokeWidth="2" />
                <circle cx={center} cy={center} r={radius * 0.04} fill="#222" />
                <line x1={center - radius*0.025} y1={center} x2={center + radius*0.025} y2={center} stroke="#555" strokeWidth="1.5" />


                {/* Glare */}
                <path d={`M ${center-radius*0.9} ${center-radius*0.1} A ${radius} ${radius} 0 0 1 ${center+radius*0.3} ${center-radius*0.8}`} fill="url(#classic-glare)" />
            </svg>
        </div>
    );
};

export default ClassicGauge;