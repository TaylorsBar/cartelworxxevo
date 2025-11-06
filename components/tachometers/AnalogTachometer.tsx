// This file is repurposed to create the new primary CyberGauge component
// for the new UI/UX redesign, as new file creation is not permitted.

import React, { useMemo } from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { useSweepValue } from '../../hooks/useSweepValue';

interface CyberGaugeProps {
  rpm: number;
  speed: number;
  gear: number;
  speedUnit: string;
}

const RPM_MAX = 8000;
const REDLINE_START = 6500;
const START_ANGLE = -160;
const END_ANGLE = 160;
const ANGLE_RANGE = END_ANGLE - START_ANGLE;

const describeArc = (x:number, y:number, radius:number, startAngle:number, endAngle:number) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const start = { x: x + radius * Math.cos(startRad), y: y + radius * Math.sin(startRad) };
    const end = { x: x + radius * Math.cos(endRad), y: y + radius * Math.sin(endRad) };
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const valueToAngle = (val: number, min: number, max: number, start: number, range: number) => {
    const ratio = (Math.max(min, Math.min(val, max)) - min) / (max - min);
    return start + ratio * range;
};

const CyberGauge: React.FC<CyberGaugeProps> = ({ rpm, speed, gear, speedUnit }) => {
  const sweptRpm = useSweepValue(rpm, 0, RPM_MAX);
  const animatedRpm = useAnimatedValue(sweptRpm, { duration: 150 });
  const animatedSpeed = useAnimatedValue(speed, { duration: 150 });
  
  // FIX: Memoize expensive calculations to prevent re-computation on every render.
  const rpmRatio = useMemo(() => Math.min(1, animatedRpm / RPM_MAX), [animatedRpm]);
  const redlineRatio = useMemo(() => Math.max(0, (animatedRpm - (REDLINE_START - 1000)) / (RPM_MAX - (REDLINE_START - 1000))), [animatedRpm]);

  // FIX: Memoize SVG path strings to avoid re-generating them if inputs haven't changed.
  const backgroundArcPath = useMemo(() => describeArc(200, 200, 180, START_ANGLE, END_ANGLE), []);
  const mainArcPath = useMemo(() => describeArc(200, 200, 180, START_ANGLE, valueToAngle(REDLINE_START, 0, RPM_MAX, START_ANGLE, ANGLE_RANGE)), []);
  const redlineArcPath = useMemo(() => describeArc(200, 200, 180, valueToAngle(REDLINE_START, 0, RPM_MAX, START_ANGLE, ANGLE_RANGE), END_ANGLE), []);
  const rpmFillArcPath = useMemo(() => describeArc(200, 200, 180, START_ANGLE, START_ANGLE + (ANGLE_RANGE * rpmRatio)), [rpmRatio]);


  const gearDisplay = gear === 0 ? 'N' : gear;
  const flash = animatedRpm > REDLINE_START + 500 && Math.floor(Date.now() / 150) % 2 === 0;

  return (
    <div className="relative w-full h-full max-w-[500px] aspect-square">
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <defs>
          <filter id="cyber-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
          </filter>
        </defs>
        
        {/* Background arcs */}
        <path d={backgroundArcPath} fill="none" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="12" />
        <path d={mainArcPath} fill="none" stroke="rgba(0, 255, 255, 0.2)" strokeWidth="12" />
        <path d={redlineArcPath} fill="none" stroke="rgba(255, 0, 255, 0.3)" strokeWidth="12" />
        
        {/* RPM Fill Arc */}
        <path 
          d={rpmFillArcPath} 
          fill="none" 
          stroke="var(--theme-accent-primary)" 
          strokeWidth="14" 
          strokeLinecap="round"
          filter="url(#cyber-glow)"
          style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.2s', stroke: flash ? '#FFF' : `hsl(${200 - redlineRatio*200}, 100%, 50%)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display font-black text-white" style={{ fontSize: 'clamp(3rem, 18vw, 10rem)', lineHeight: 1, textShadow: '0 0 20px rgba(255,255,255,0.7)' }}>
          {animatedSpeed.toFixed(0)}
        </div>
        <div className="font-sans text-gray-400 text-2xl -mt-2 uppercase">{speedUnit}</div>
        <div className="absolute top-1/2 mt-16 flex items-baseline gap-4">
            <div className="text-center">
                <div className="font-display text-5xl font-bold text-white">{gearDisplay}</div>
                <div className="font-sans text-xs text-gray-500">GEAR</div>
            </div>
             <div className="text-center">
                <div className="font-display text-5xl font-bold text-white">{(animatedRpm / 1000).toFixed(1)}</div>
                <div className="font-sans text-xs text-gray-500">x1000 RPM</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CyberGauge;