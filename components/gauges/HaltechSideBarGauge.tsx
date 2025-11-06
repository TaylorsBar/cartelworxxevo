

import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import { useSweepValue } from '../../hooks/useSweepValue';

interface HaltechSideBarGaugeProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  warning?: number;
  danger?: number;
}

const NUM_SEGMENTS = 24;

const HaltechSideBarGauge: React.FC<HaltechSideBarGaugeProps> = ({ label, value, unit, min, max, warning, danger }) => {
    const sweptValue = useSweepValue(value, min, max);
    const animatedValue = useAnimatedValue(sweptValue);
    
    const percentage = ((Math.max(min, Math.min(animatedValue, max)) - min) / (max - min)) * 100;
    const activeSegments = Math.ceil((percentage / 100) * NUM_SEGMENTS);

    const getSegmentColor = (segmentIndex: number) => {
        const segmentValue = min + (segmentIndex / NUM_SEGMENTS) * (max - min);
        if (danger && segmentValue >= danger) {
            return 'var(--theme-accent-red)';
        }
        if (warning && segmentValue >= warning) {
            return 'var(--theme-accent-primary)';
        }
        return 'var(--theme-text-primary)';
    };
    
    return (
        <div className="w-full h-full glass-panel rounded-lg p-2 flex flex-col justify-between items-center">
            <div className="font-sans text-sm text-center font-bold text-gray-300 uppercase">{label}</div>
            
            <div className="w-full flex-grow flex items-center justify-center py-2">
                <div className="w-8 h-full bg-black/50 rounded-md flex flex-col-reverse gap-[2px] p-1">
                    {Array.from({ length: NUM_SEGMENTS }).map((_, i) => (
                        <div
                            key={i}
                            className="w-full flex-1 rounded-sm"
                            style={{
                                backgroundColor: i < activeSegments ? getSegmentColor(i + 1) : 'transparent',
                                transition: 'background-color 0.1s ease-out'
                            }}
                        />
                    ))}
                </div>
            </div>
            
            <div className="text-center">
                <div className="font-mono text-3xl font-bold text-white tracking-wider">{animatedValue.toFixed(1)}</div>
                <div className="font-sans text-xs text-gray-400">{unit}</div>
            </div>
        </div>
    );
};

export default HaltechSideBarGauge;