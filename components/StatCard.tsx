
import React from 'react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

interface DataReadoutProps {
  title: string;
  value: string | number;
  unit?: string;
  max?: number;
}

const DataReadout: React.FC<DataReadoutProps> = ({ title, value, unit, max=100 }) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const animatedValue = useAnimatedValue(isNaN(numericValue) ? 0 : numericValue);
  
  const getPrecision = () => {
    if (title.includes('Duty') || title.includes('Angle') || title.includes('Dashbatt')) return 1;
    return 0;
  }

  const displayValue = animatedValue.toFixed(getPrecision());
  const percentage = (animatedValue / max) * 100;

  return (
    <div className="relative pl-3">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-base-800 rounded-full overflow-hidden">
            <div className="w-full bg-[var(--theme-accent-primary)] rounded-full" style={{height: `${Math.min(100, percentage)}%`}}></div>
        </div>
        <div className="flex justify-between items-baseline">
            <div>
                <div className="text-4xl font-display font-bold text-white">{displayValue}</div>
                <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</div>
            </div>
            <div className="text-sm text-gray-500">{unit}</div>
        </div>
    </div>
  );
};

export default DataReadout;
