
import React from 'react';
import { GpsPoint } from '../types';

interface RouteMapProps {
    path: GpsPoint[];
}

const RouteMap: React.FC<RouteMapProps> = ({ path }) => {
    if (path.length < 2) {
        return <div className="w-full h-full flex items-center justify-center bg-base-800/50 rounded-md text-gray-500">Not enough data to display route.</div>;
    }

    // Find bounds
    const lats = path.map(p => p.latitude);
    const lons = path.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    // Add some padding to prevent path touching the edges
    const latPadding = (maxLat - minLat) * 0.1 || 0.001;
    const lonPadding = (maxLon - minLon) * 0.1 || 0.001;

    const vbMinX = minLon - lonPadding;
    const vbMinY = minLat - latPadding;
    const vbWidth = (maxLon + lonPadding) - vbMinX;
    const vbHeight = (maxLat + latPadding) - vbMinY;

    // Convert lat/lon to SVG points string for the polyline
    const points = path.map(p => 
        `${(p.longitude - vbMinX) / vbWidth * 100},${(1 - (p.latitude - vbMinY) / vbHeight) * 100}`
    ).join(' ');

    const startPoint = points.split(' ')[0].split(',');
    const endPoint = points.split(' ')[points.split(' ').length - 1].split(',');

    return (
        <div className="w-full h-full p-2 bg-black rounded-md border border-brand-cyan/30">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <polyline points={points} fill="none" stroke="var(--theme-accent-primary)" strokeWidth="0.5" strokeLinejoin="round" strokeLinecap="round" />
                {/* Start Point */}
                <circle cx={startPoint[0]} cy={startPoint[1]} r="1.5" fill="var(--theme-accent-green)" stroke="black" strokeWidth="0.5" />
                 {/* End Point */}
                <circle cx={endPoint[0]} cy={endPoint[1]} r="1.5" fill="var(--theme-accent-red)" stroke="black" strokeWidth="0.5"/>
            </svg>
        </div>
    );
};

export default RouteMap;
