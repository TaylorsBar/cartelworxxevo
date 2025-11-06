import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { useSweepValue } from '../../hooks/useSweepValue';

interface AuxGaugeProps {
  label: string;
  value: number;
  min: number; // for sweep
  max: number; // for sweep
  unit: string;
}

const AuxGauge: React.FC<AuxGaugeProps> = ({ label, value, min, max, unit }) => {
  const sweptValue = useSweepValue(value, min, max);
  const animatedValue = useAnimatedValue(sweptValue);

  return (
    <div className="relative w-full aspect-square flex flex-col items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full absolute">
            {/* Bezel and glow */}
            <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="47" fill="none" stroke="var(--theme-accent-secondary)" strokeWidth="1.5" style={{filter: 'blur(2px)'}} />
            <circle cx="50" cy="50" r="48" fill="rgba(0,0,0,0.3)" />
        </svg>
        <div className="relative z-10 flex flex-col items-center justify-center text-white">
            <div className="font-sans text-sm uppercase text-gray-400">{label}</div>
            <div className="font-display font-bold text-3xl my-1" style={{ color: 'var(--theme-accent-primary)', textShadow: '0 0 8px var(--theme-accent-primary)' }}>
                {animatedValue.toFixed(unit === '%' || unit === 'v' || unit === 'ratio' ? 1 : 0)}
            </div>
            <div className="font-sans text-sm text-gray-400">{unit}</div>
        </div>
    </div>
  );
};
export default AuxGauge;