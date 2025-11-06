

import React from 'react';
import { SensorDataPoint } from '../../../types';
import { useAnimatedValue } from '../../../hooks/useAnimatedValue';
import { useUnitConversion } from '../../../hooks/useUnitConversion';
import { useSweepValue } from '../../../hooks/useSweepValue';

const RPM_MAX = 8000;
const SHIFT_POINT_1 = 6000;
const SHIFT_POINT_2 = 6800;
const SHIFT_POINT_3 = 7500;
const NUM_RPM_LEDS = 15;

const RpmShiftLights: React.FC<{ rpm: number }> = ({ rpm }) => {
    const sweptRpm = useSweepValue(rpm, 0, RPM_MAX);
    const animatedRpm = useAnimatedValue(sweptRpm);
    const activeLeds = Math.round((animatedRpm / RPM_MAX) * NUM_RPM_LEDS);
    const flash = animatedRpm > SHIFT_POINT_3 + 200 && Math.floor(Date.now() / 100) % 2 === 0;

    const getLedColor = (i: number) => {
        const ledRpm = (i + 1) * (RPM_MAX / NUM_RPM_LEDS);
        if (ledRpm > SHIFT_POINT_3) return flash ? '#FFFFFF' : '#FF0000';
        if (ledRpm > SHIFT_POINT_2) return '#FFFF00';
        if (ledRpm > SHIFT_POINT_1) return '#00FF00';
        return '#00FFFF';
    };

    return (
        <div className="w-full h-full">
            <svg viewBox="0 0 500 150">
                <defs>
                    <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <g>
                    {Array.from({ length: NUM_RPM_LEDS }).map((_, i) => {
                        const angle = 202.5 + (i * (135 / (NUM_RPM_LEDS - 1)));
                        const x = 250 + 220 * Math.cos(angle * Math.PI / 180);
                        const y = 250 + 220 * Math.sin(angle * Math.PI / 180);
                        const isActive = i < activeLeds;
                        const color = isActive ? getLedColor(i) : '#1A202C';
                        
                        return (
                             <path
                                key={i}
                                d="M-12 -6 L12 -6 L10 6 L-10 6 Z" // Trapezoid
                                fill={color}
                                transform={`translate(${x}, ${y}) rotate(${angle + 90})`}
                                style={{
                                    transition: 'fill 0.05s linear',
                                    filter: isActive ? 'url(#ledGlow)' : 'none'
                                }}
                            />
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};


const RallyDataBlock: React.FC<{ label: string; value: number; unit: string; precision?: number, min?: number, max?: number }> = ({ label, value, unit, precision = 0, min=0, max=100 }) => {
    const sweptValue = useSweepValue(value, min, max);
    const animatedValue = useAnimatedValue(sweptValue);
    return (
        <div className="w-full text-center bg-black/20 p-3 rounded-lg border border-[var(--glass-border)]">
            <div className="text-gray-400 font-sans text-xs uppercase tracking-widest">{label}</div>
            <div className="font-mono text-white text-3xl font-bold tracking-tighter">
                {animatedValue.toFixed(precision)}
                <span className="text-lg text-gray-400 ml-1">{unit}</span>
            </div>
        </div>
    );
};

const carbonFiberStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    backgroundImage: 'linear-gradient(27deg, #151515 5px, transparent 5px), linear-gradient(207deg, #151515 5px, transparent 5px), linear-gradient(27deg, #222 5px, transparent 5px), linear-gradient(207deg, #222 5px, transparent 5px), linear-gradient(90deg, #1b1b1b 10px, transparent 10px), linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424)',
    backgroundSize: '20px 20px',
};


const DigitalGaugeCluster: React.FC<{ latestData: SensorDataPoint }> = ({ latestData }) => {
    const { rpm, speed, gear, turboBoost, engineTemp, oilPressure } = latestData;
    const { convertSpeed, getSpeedUnit, unitSystem } = useUnitConversion();

    const speedVal = convertSpeed(speed);
    const speedMax = unitSystem === 'imperial' ? 180 : 280;
    const sweptSpeed = useSweepValue(speedVal, 0, speedMax);
    const animatedSpeed = useAnimatedValue(sweptSpeed);

    return (
        <div 
            className="h-full w-full flex flex-col items-center justify-center p-4 glass-panel rounded-2xl shadow-glow-theme"
            style={carbonFiberStyle}
        >
            
            <div className="w-full h-32 -mb-16">
                 <RpmShiftLights rpm={rpm} />
            </div>
            
            <div className="flex flex-col items-center text-center">
                <div className="font-display text-[var(--theme-accent-primary)]" style={{ fontSize: '15rem', lineHeight: 1, textShadow: '0 0 40px var(--theme-accent-primary)' }}>
                    {gear === 0 ? 'N' : gear}
                </div>
                <div className="font-mono font-bold text-white -mt-8" style={{ fontSize: '7rem', textShadow: '0 0 20px rgba(255,255,255,0.7)' }}>
                    {animatedSpeed.toFixed(0)}
                </div>
                <div className="font-sans text-gray-400 text-xl -mt-2 uppercase">{getSpeedUnit()}</div>
            </div>
            
            <div className="w-full grid grid-cols-3 gap-4 mt-4">
                 <RallyDataBlock label="Boost" value={turboBoost} unit="bar" precision={2} min={-1} max={2.5}/>
                 <RallyDataBlock label="Water Temp" value={engineTemp} unit="°C" min={0} max={120} />
                 <RallyDataBlock label="Oil Press" value={oilPressure} unit="bar" precision={1} min={0} max={8} />
            </div>
        </div>
    );
};

export default DigitalGaugeCluster;