

import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { useSweepValue } from '../../hooks/useSweepValue';

interface HaltechTachometerProps {
  rpm: number;
  speed: number;
  gear: number;
  speedUnit: string;
}

const REDLINE_RPM = 7000;
const SHIFT_WARN_RPM = 6500;
const NUM_LEDS = 16;
const RPM_MAX = 8000;

const RpmArc: React.FC<{ rpm: number }> = ({ rpm }) => {
    const sweptRpm = useSweepValue(rpm, 0, RPM_MAX);
    const animatedRpm = useAnimatedValue(sweptRpm);
    const activeLeds = Math.min(NUM_LEDS, Math.max(0, Math.ceil((animatedRpm / RPM_MAX) * NUM_LEDS)));
    const flash = animatedRpm > REDLINE_RPM + 200 && Math.floor(Date.now() / 100) % 2 === 0;

    const getLedColor = (i: number) => {
        const ledRpm = (i + 1) * (RPM_MAX / NUM_LEDS);
        if (ledRpm > REDLINE_RPM) return flash ? 'white' : 'var(--theme-accent-red)';
        if (ledRpm > SHIFT_WARN_RPM) return 'var(--theme-accent-primary)';
        return '#00a1ff'; // A blueish color for the low end
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full">
            <svg viewBox="0 0 300 160">
                 <defs>
                    <filter id="led-glow-haltech" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    </filter>
                </defs>
                {Array.from({ length: NUM_LEDS }).map((_, i) => {
                    const angleRad = (1 * Math.PI) + (i / (NUM_LEDS - 1)) * Math.PI;
                    const x = 150 + 140 * Math.cos(angleRad);
                    const y = 150 + 140 * Math.sin(angleRad);
                    const angleDeg = angleRad * 180 / Math.PI;
                    const isActive = i < activeLeds;
                    const color = getLedColor(i);

                    return (
                         <rect
                            key={i}
                            x={-12} y={-5}
                            width="24" height="10"
                            rx="3"
                            fill={isActive ? color : '#1a1a1e'}
                            transform={`translate(${x} ${y}) rotate(${angleDeg})`}
                            style={{
                                transition: 'fill 0.05s linear',
                                filter: isActive ? 'url(#led-glow-haltech)' : 'none',
                            }}
                        />
                    )
                })}
            </svg>
        </div>
    )
};

const HaltechTachometer: React.FC<HaltechTachometerProps> = ({ rpm, speed, gear, speedUnit }) => {
    const sweptRpm = useSweepValue(rpm, 0, RPM_MAX);
    const animatedRpm = useAnimatedValue(sweptRpm);
    
    const speedMax = speedUnit === 'mph' ? 180 : 280;
    const sweptSpeed = useSweepValue(speed, 0, speedMax);
    const animatedSpeed = useAnimatedValue(sweptSpeed);


    const gearDisplay = gear === 0 ? 'N' : gear;

    return (
        <div className="w-full h-full glass-panel rounded-lg p-4 flex flex-col justify-between relative">
            <RpmArc rpm={animatedRpm} />
            <div className="flex-grow flex flex-col items-center justify-center">
                <div className="flex items-end justify-center gap-4">
                    <div className="font-mono font-black text-white" style={{ fontSize: '12rem', lineHeight: 1 }}>{Math.round(animatedSpeed)}</div>
                    <div className="font-mono font-black text-[var(--theme-accent-primary)] pb-4" style={{ fontSize: '7rem', lineHeight: 1 }}>{gearDisplay}</div>
                </div>
                <div className="font-sans text-xl text-gray-400 -mt-2 uppercase">{speedUnit}</div>
            </div>
            <div className="text-center">
                 <div className="font-mono text-5xl font-bold text-white tracking-wider">{Math.round(animatedRpm)}</div>
                 <div className="font-sans text-sm text-gray-400 uppercase tracking-widest">RPM</div>
            </div>
        </div>
    );
};

export default HaltechTachometer;