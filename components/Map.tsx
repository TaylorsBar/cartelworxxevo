
import React, { useState, useEffect } from 'react';

interface MapProps {
  lat: number;
  lon: number;
  zoom?: number;
}

const Map: React.FC<MapProps> = ({ lat, lon, zoom = 16 }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="w-full h-full bg-base-800 rounded-lg overflow-hidden flex items-center justify-center text-center text-gray-400 p-4">
        <div>
          <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" stroke="var(--theme-accent-red)" />
          </svg>
          <p className="mt-2 font-semibold text-gray-300">Map Unavailable</p>
          <p className="text-sm">Connect to the internet to view live map data.</p>
        </div>
      </div>
    );
  }

  const bbox = [
    lon - 0.005,
    lat - 0.005,
    lon + 0.005,
    lat + 0.005,
  ].join(',');

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  
  return (
    <div className="w-full h-full bg-gray-800 rounded-lg overflow-hidden">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={mapUrl}
        style={{ border: 'none' }}
        title="Live Map"
        loading="lazy"
      ></iframe>
    </div>
  );
};

export default Map;