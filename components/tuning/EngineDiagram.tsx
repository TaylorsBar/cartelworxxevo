import React, { useState, useEffect, useRef } from 'react';
import { GpsPoint } from '../../types';
import { useUnitConversion } from '../../hooks/useUnitConversion';

// FIX: Correctly typed the dynamically loaded Google Maps API to resolve namespace errors.
// This makes `google.maps` available as a global namespace with the necessary types and constructors.
declare namespace google {
  export namespace maps {
    export type Map = any;
    export type MapTypeStyle = any;
    export type Polyline = any;
    export const Map: { new (element: HTMLElement | null, opts: any): Map };
    export const Polyline: { new (opts: any): Polyline };

    export namespace marker {
      export type AdvancedMarkerElement = any;
      export const AdvancedMarkerElement: { new (opts: any): AdvancedMarkerElement };
    }
  }
}

const MAP_ID = 'CARTEWORX_DARK_THEME';

const mapStyle: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
    { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: 'var(--theme-accent-primary)' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#010103' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#F3F4F4' }] },
    { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#010103' }] },
    { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

const carSVG = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L4 20.5L12 17L20 20.5L12 2Z" fill="var(--theme-accent-primary)" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>
`;

interface LiveTrackMapProps {
    gpsPath: GpsPoint[];
    latestData: { speed: number; lateralGForce: number; longitudinalGForce: number };
}

const LiveTrackMap: React.FC<LiveTrackMapProps> = ({ gpsPath, latestData }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const carMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const trackPathRef = useRef<google.maps.Polyline | null>(null);
    const carMarkerDivRef = useRef<HTMLDivElement | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { convertSpeed, getSpeedUnit } = useUnitConversion();

    useEffect(() => {
        const loadGoogleMapsScript = () => {
            // FIX: Check for global `google` object directly instead of `window.google` to align with TypeScript's global namespace declaration.
            if (typeof google !== 'undefined' && google.maps) {
                initializeMap();
                return;
            }

            const script = document.createElement('script');
            // @ts-ignore
            const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
            
            if (!GOOGLE_MAPS_API_KEY) {
                setError("Google Maps API key is missing. Map cannot be loaded.");
                setIsLoading(false);
                return;
            }

            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=beta&libraries=maps,marker&map_ids=${MAP_ID}`;
            script.async = true;
            script.defer = true;
            script.onload = initializeMap;
            script.onerror = () => {
                setError("Failed to load Google Maps script. Please check your internet connection.");
                setIsLoading(false);
            };
            document.head.appendChild(script);
        };
        
        loadGoogleMapsScript();
        
    }, []);

    const initializeMap = async () => {
        if (!mapRef.current || mapInstance.current) return;
        
        try {
            const lastPoint = gpsPath.length > 0 ? gpsPath[gpsPath.length - 1] : { latitude: 0, longitude: 0 };
            
            const map = new google.maps.Map(mapRef.current, {
                center: { lat: lastPoint.latitude, lng: lastPoint.longitude },
                zoom: 18,
                tilt: 45,
                heading: 0,
                disableDefaultUI: true,
                mapId: MAP_ID,
                styles: mapStyle
            });

            // Create the car marker element
            const carMarkerDiv = document.createElement('div');
            carMarkerDiv.innerHTML = carSVG;
            carMarkerDiv.style.transform = 'rotate(0deg)';
            carMarkerDiv.style.transition = 'transform 0.1s linear';
            carMarkerDivRef.current = carMarkerDiv;
            
            const carMarker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: { lat: lastPoint.latitude, lng: lastPoint.longitude },
                content: carMarkerDiv
            });

            const trackPath = new google.maps.Polyline({
                map,
                path: gpsPath.map(p => ({ lat: p.latitude, lng: p.longitude })),
                strokeColor: 'var(--theme-accent-primary)',
                strokeOpacity: 0.8,
                strokeWeight: 4,
            });

            mapInstance.current = map;
            carMarkerRef.current = carMarker;
            trackPathRef.current = trackPath;
            setIsLoading(false);

        } catch (e: any) {
            setError(`Error initializing map: ${e.message}`);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!mapInstance.current || gpsPath.length < 2) return;

        const currentPoint = gpsPath[gpsPath.length - 1];
        const prevPoint = gpsPath[gpsPath.length - 2];
        
        const newPosition = { lat: currentPoint.latitude, lng: currentPoint.longitude };

        // Calculate heading
        const lat1 = prevPoint.latitude * Math.PI / 180;
        const lon1 = prevPoint.longitude * Math.PI / 180;
        const lat2 = currentPoint.latitude * Math.PI / 180;
        const lon2 = currentPoint.longitude * Math.PI / 180;

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        const heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

        // Update Marker
        if (carMarkerRef.current) {
            carMarkerRef.current.position = newPosition;
            if (carMarkerDivRef.current) {
                 carMarkerDivRef.current.style.transform = `rotate(${heading}deg)`;
            }
        }
        
        // Update Polyline
        trackPathRef.current?.setPath(gpsPath.map(p => ({ lat: p.latitude, lng: p.longitude })));

        // Update Camera
        if (isFollowing) {
            mapInstance.current.moveCamera({ center: newPosition, heading: heading });
        }

    }, [gpsPath, isFollowing]);

    return (
        <div className="w-full h-full relative glass-panel overflow-hidden">
            {isLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin border-t-[var(--theme-accent-primary)]"></div></div>}
            {error && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 text-red-400 p-4 text-center">{error}</div>}
            <div ref={mapRef} className="w-full h-full" />
            
            {/* HUD Elements */}
            <div className="absolute top-4 left-4 z-10">
                <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`btn text-xs px-3 py-1 ${isFollowing ? 'btn-primary' : 'btn-secondary'}`}
                >
                    {isFollowing ? 'Following' : 'Free Look'}
                </button>
            </div>
            
            {/* Speed Readout */}
            <div className="absolute bottom-4 left-4 z-10 glass-panel p-2 rounded-lg text-center">
                <div className="font-display font-bold text-4xl text-white" style={{ textShadow: '0 0 8px #fff'}}>{convertSpeed(latestData.speed).toFixed(0)}</div>
                <div className="font-sans text-xs text-gray-400">{getSpeedUnit()}</div>
            </div>

            {/* G-Force Meter */}
            <div className="absolute bottom-4 right-4 z-10 glass-panel p-2 rounded-lg w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <circle 
                        cx={50 + (latestData.lateralGForce / 2.0) * 45} 
                        cy={50 - (latestData.longitudinalGForce / 2.0) * 45} 
                        r="5" 
                        fill="var(--theme-accent-secondary)"
                        style={{ filter: 'drop-shadow(0 0 4px var(--theme-accent-secondary))', transition: 'all 0.1s linear' }}
                    />
                </svg>
            </div>
        </div>
    );
};

export default LiveTrackMap;