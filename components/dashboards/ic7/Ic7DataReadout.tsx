

import React from 'react';
import { useAnimatedValue } from '../../../hooks/useAnimatedValue';
import { useSweepValue } from '../../../hooks/useSweepValue';

interface Ic7DataReadoutProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  precision?: number;
  lowWarn?: number;
  lowDanger?: number;
  highWarn?: number;
  highDanger?: number;
}

const Ic7DataReadout: React.FC<Ic7DataReadoutProps> = ({
  label,
  value,
  unit,
  min,
  max,
  precision = 0,
  lowWarn,
  lowDanger,
  highWarn,
  highDanger
}) => {
  const sweptValue = useSweepValue(value, min, max);
  const animatedValue = useAnimatedValue(sweptValue);
  const percentage = Math.max(0, Math.min(100, ((animatedValue - min) / (max - min)) * 100));

  const getBarColor = () => {
    if (highDanger && animatedValue >= highDanger) return 'var(--theme-accent-red)';
    if (highWarn && animatedValue >= highWarn) return 'var(--theme-accent-yellow)';
    if (lowDanger && animatedValue <= lowDanger) return 'var(--theme-accent-red)';
    if (lowWarn && animatedValue <= lowWarn) return 'var(--theme-accent-yellow)';
    return 'var(--theme-accent-primary)';
  };

  return (
    <div className="bg-black/50 p-2 rounded-md flex items-center gap-2 h-full">
      <div className="w-3 h-full bg-gray-800 rounded-full overflow-hidden flex flex-col justify-end">
        <div
          className="w-full rounded-full transition-all duration-150"
          style={{ height: `${percentage}%`, backgroundColor: getBarColor() }}
        />
      </div>
      <div className="flex-grow flex flex-col justify-center">
        <div className="font-mono text-white leading-none text-2xl md:text-3xl lg:text-4xl">
          {animatedValue.toFixed(precision)}
        </div>
        <div className="flex items-baseline justify-between">
            <div className="font-classic text-gray-400 text-sm md:text-base uppercase">{label}</div>
            <div className="font-sans text-gray-500 text-xs md:text-sm">{unit}</div>
        </div>
      </div>
    </div>
  );
};

export default Ic7DataReadout;