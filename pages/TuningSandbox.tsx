import React from 'react';
import { useVehicleStore } from '../store/useVehicleStore';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

interface MetricBarProps {
    label: string;
    value: number;
    unit: string;
    min: number;
    max: number;
    thresholds: { warn?: number; danger?: number; lowWarn?: number; lowDanger?: number; };
    precision?: number;
}


const MetricBar: React.FC<MetricBarProps> = ({ label, value, unit, min, max, thresholds, precision = 1 }) => {
    const animatedValue = useAnimatedValue(value);
    const percentage = Math.max(0, Math.min(100, ((animatedValue - min) / (max - min)) * 100));

    let barColor = 'var(--theme-accent-primary)';
    if (thresholds.danger && animatedValue >= thresholds.danger) {
        barColor = 'var(--theme-accent-red)';
    } else if (thresholds.warn && animatedValue >= thresholds.warn) {
        barColor = 'var(--theme-accent-yellow)';
    } else if (thresholds.lowDanger && animatedValue <= thresholds.lowDanger) {
        barColor = 'var(--theme-accent-red)';
    } else if (thresholds.lowWarn && animatedValue <= thresholds.lowWarn) {
        barColor = 'var(--theme-accent-yellow)';
    }


    return (
        <div className="bg-base-900/50 p-3 rounded-lg border border-base-700">
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-gray-300">{label}</span>
                <span className="font-mono text-xl text-white">
                    {animatedValue.toFixed(precision)}
                    <span className="text-xs text-gray-400 ml-1">{unit}</span>
                </span>
            </div>
            <div className="w-full h-5 bg-black rounded-full overflow-hidden border border-base-800">
                <div 
                    className="h-full rounded-full transition-all duration-150"
                    style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: barColor,
                        boxShadow: `0 0 8px ${barColor}`
                    }}
                />
            </div>
        </div>
    );
};

const RealtimeMetrics: React.FC = () => {
    const latestData = useVehicleStore(state => state.latestData);

    // Derived & Simulated values
    const afr = 14.7 + (latestData.o2SensorVoltage - 0.45) * 5;
    const idc = Math.min(100, (latestData.rpm / 8000) * latestData.engineLoad * 0.9 + Math.random() * 2);
    const mapKpa = (latestData.turboBoost * 100) + 101.3;
    // Simulate knock being more likely at high load/RPM
    const knock = Math.max(0, (latestData.engineLoad / 100) * (latestData.rpm / 7000) * 4 - 1 + (Math.random() - 0.5) * 0.5);

    return (
        <div className="mt-4 p-4 border-t border-[var(--theme-accent-primary)]/30">
            <h3 className="text-md font-semibold text-center mb-4 font-display">Real-time Engine Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricBar 
                    label="Air/Fuel Ratio"
                    value={afr}
                    unit="AFR"
                    min={10} max={18}
                    precision={1}
                    thresholds={{ lowWarn: 11.5, lowDanger: 10.5, warn: 15.5, danger: 16.5 }}
                />
                <MetricBar 
                    label="Injector Duty"
                    value={idc}
                    unit="%"
                    min={0} max={100}
                    precision={0}
                    thresholds={{ warn: 85, danger: 95 }}
                />
                <MetricBar 
                    label="Knock Level"
                    value={knock}
                    unit="count"
                    min={0} max={5}
                    precision={1}
                    thresholds={{ warn: 1.5, danger: 3 }}
                />
                <MetricBar 
                    label="MAP"
                    value={mapKpa}
                    unit="kPa"
                    min={20} max={250}
                    precision={0}
                    thresholds={{ warn: 220, danger: 240 }}
                />
            </div>
        </div>
    );
};

export default RealtimeMetrics;
