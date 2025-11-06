import React from 'react';
import { SavedRaceSession } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useUnitConversion } from '../hooks/useUnitConversion';

interface SessionComparisonProps {
    sessions: [SavedRaceSession, SavedRaceSession];
}

const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const milliseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${milliseconds}`;
};

const StatRow: React.FC<{ label: string, value1: string, value2: string }> = ({ label, value1, value2 }) => (
    <div className="grid grid-cols-3 items-center text-center py-2 border-b border-base-800">
        <span className="font-mono text-lg text-white">{value1}</span>
        <span className="text-sm text-gray-400">{label}</span>
        <span className="font-mono text-lg text-white">{value2}</span>
    </div>
);

const SessionComparison: React.FC<SessionComparisonProps> = ({ sessions }) => {
    const { convertSpeed, getSpeedUnit } = useUnitConversion();
    const [sessionA, sessionB] = sessions;

    const combinedData = React.useMemo(() => {
        const normalizedA = sessionA.data.map(d => ({ ...d, elapsedTime: d.time - sessionA.data[0].time }));
        const normalizedB = sessionB.data.map(d => ({ ...d, elapsedTime: d.time - sessionB.data[0].time }));
        
        const allTimestamps = [...new Set([...normalizedA.map(d => d.elapsedTime), ...normalizedB.map(d => d.elapsedTime)])].sort((a,b) => a - b);
        
        const merged = allTimestamps.map(time => {
            const findPoint = (data: typeof normalizedA, t: number) => {
                const exact = data.find(d => d.elapsedTime === t);
                if (exact) return exact.speed;

                const before = data.filter(d => d.elapsedTime < t).pop();
                const after = data.find(d => d.elapsedTime > t);
                if (!before || !after) return null;
                
                const ratio = (t - before.elapsedTime) / (after.elapsedTime - before.elapsedTime);
                return before.speed + (after.speed - before.speed) * ratio;
            };

            return {
                time: (time / 1000).toFixed(2),
                [sessionA.id]: findPoint(normalizedA, time),
                [sessionB.id]: findPoint(normalizedB, time),
            };
        });
        return merged.filter(d => d[sessionA.id] !== null || d[sessionB.id] !== null);

    }, [sessionA, sessionB]);

    const renderStat = (value: number | null, unit: string, precision: number = 2) => value ? `${value.toFixed(precision)}${unit}` : '--';

    return (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4 animate-fade-in">
            <div className="lg:col-span-2 bg-base-900 p-4 rounded-md">
                <h3 className="font-bold text-center mb-2">Performance Metrics</h3>
                 <div className="grid grid-cols-3 text-center text-xs font-bold text-gray-500 pb-2">
                    <span>{new Date(sessionA.date).toLocaleTimeString()}</span>
                    <span>BENCHMARK</span>
                    <span>{new Date(sessionB.date).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-1">
                    <StatRow label={`0-100 ${getSpeedUnit()}`} value1={renderStat(sessionA.zeroToHundredKmhTime, 's')} value2={renderStat(sessionB.zeroToHundredKmhTime, 's')} />
                    <StatRow label="0-60 mph" value1={renderStat(sessionA.zeroToSixtyMphTime, 's')} value2={renderStat(sessionB.zeroToSixtyMphTime, 's')} />
                    <StatRow label="60-130 mph" value1={renderStat(sessionA.sixtyToHundredThirtyMphTime, 's')} value2={renderStat(sessionB.sixtyToHundredThirtyMphTime, 's')} />
                    <StatRow label="100-200 km/h" value1={renderStat(sessionA.hundredToTwoHundredKmhTime, 's')} value2={renderStat(sessionB.hundredToTwoHundredKmhTime, 's')} />
                    <StatRow label="1/4 Mile Time" value1={renderStat(sessionA.quarterMileTime, 's')} value2={renderStat(sessionB.quarterMileTime, 's')} />
                    <StatRow label={`1/4 Mile ${getSpeedUnit()}`} value1={renderStat(convertSpeed(sessionA.quarterMileSpeed || 0), '', 0)} value2={renderStat(convertSpeed(sessionB.quarterMileSpeed || 0), '', 0)} />
                    <StatRow label="Max Speed" value1={renderStat(convertSpeed(sessionA.maxSpeed), '', 0)} value2={renderStat(convertSpeed(sessionB.maxSpeed), '', 0)} />
                    <StatRow label="Total Time" value1={formatTime(sessionA.totalTime)} value2={formatTime(sessionB.totalTime)} />
                </div>
            </div>
             <div className="lg:col-span-3 bg-base-900 p-4 rounded-md h-96">
                <h3 className="font-bold mb-2">Speed vs. Time</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D2D42" />
                        <XAxis dataKey="time" stroke="#7F7F98" label={{ value: 'Time (s)', position: 'insideBottom', offset: -15 }} tick={{fontSize: 12}} />
                        <YAxis stroke="#7F7F98" label={{ value: `Speed (${getSpeedUnit()})`, angle: -90, position: 'insideLeft' }} tickFormatter={(val) => convertSpeed(val).toFixed(0)} tick={{fontSize: 12}} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0A0A0F', border: '1px solid #1E1E2D' }}
                            labelStyle={{ color: '#AAAAAA' }}
                            formatter={(value: number, name: string) => [`${convertSpeed(value).toFixed(1)} ${getSpeedUnit()}`, new Date(name).toLocaleTimeString()]}
                         />
                        <Legend />
                        <Line type="monotone" dataKey={sessionA.id} name={new Date(sessionA.date).toLocaleTimeString()} stroke="#8884d8" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey={sessionB.id} name={new Date(sessionB.date).toLocaleTimeString()} stroke="#82ca9d" dot={false} strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
             </div>
        </div>
    );
};

export default SessionComparison;