import React, { useState, useEffect, useRef } from 'react';
import { SensorDataPoint, GpsPoint, LapTime } from '../types';
import { useUnitConversion } from '../hooks/useUnitConversion';

interface TrackCameraProps {
    latestData: SensorDataPoint;
    gpsPath: GpsPoint[];
    lapTimes: LapTime[];
    elapsedTime: number;
}

type CameraStatus = 'initializing' | 'active' | 'error';

const formatTime = (ms: number, showMs = true) => {
    if (ms <= 0) return showMs ? '00:00.00' : '00:00';
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    if (!showMs) return `${minutes}:${seconds}`;
    const milliseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${milliseconds}`;
};

const drawTelemetryOverlay = (ctx: CanvasRenderingContext2D, data: SensorDataPoint, lapTimes: LapTime[], elapsedTime: number, convertSpeed: (s: number) => number, getSpeedUnit: () => string) => {
    const { width, height } = ctx.canvas;
    const RPM_MAX = 8000;
    const RPM_SHIFT_WARN = 6500;
    const RPM_REDLINE = 7200;

    // --- Calculations ---
    const speed = convertSpeed(data.speed).toFixed(0);
    const gear = data.gear > 0 ? data.gear.toString() : 'N';
    const rpm = data.rpm;
    const throttle = data.engineLoad / 100;
    const brake = Math.max(0, Math.min(1, -data.longitudinalGForce / 1.2));

    const totalLapsTime = lapTimes.reduce((acc, lap) => acc + lap.time, 0);
    const currentLapTime = elapsedTime - totalLapsTime;
    const lastLap = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1].time : 0;
    const bestLap = lapTimes.length > 0 ? Math.min(...lapTimes.map(l => l.time)) : 0;
    
    // --- Styles ---
    const primaryColor = 'var(--theme-accent-primary)';
    const redColor = 'var(--theme-accent-red)';
    const yellowColor = 'var(--theme-accent-yellow)';
    const greenColor = 'var(--theme-accent-green)';
    const whiteColor = 'rgba(255, 255, 255, 0.9)';
    const textColor = 'rgba(200, 210, 220, 0.9)';
    const bgPanel = 'rgba(10, 15, 25, 0.7)';

    // This function only draws the overlay, it should not clear the canvas.
    // The main draw loop is responsible for drawing the video frame first, which acts as the "clear".
    
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 5;

    // --- RPM Bar (Bottom) ---
    const rpmBarHeight = 40;
    const rpmBarY = height - rpmBarHeight;
    const rpmRatio = rpm / RPM_MAX;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, rpmBarY, width, rpmBarHeight);

    const segments = 100;
    for (let i = 0; i < segments; i++) {
        if (i / segments < rpmRatio) {
            const segRPM = (i / segments) * RPM_MAX;
            if (segRPM > RPM_REDLINE) ctx.fillStyle = redColor;
            else if (segRPM > RPM_SHIFT_WARN) ctx.fillStyle = yellowColor;
            else ctx.fillStyle = primaryColor;
            
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            ctx.fillRect((i / segments) * width, rpmBarY, (1 / segments) * width + 1, rpmBarHeight);
        }
    }
    ctx.shadowBlur = 0; // Reset shadow

    ctx.font = 'bold 24px "Orbitron", sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'right';
    ctx.fillText(`${rpm.toFixed(0)}`, width - 15, height - 10);
    ctx.textAlign = 'left';
    ctx.fillText('RPM', 15, height - 10);

    // --- Speed & Gear (Center) ---
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = whiteColor;

    ctx.font = 'bold 180px "Orbitron", sans-serif';
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 20;
    ctx.fillText(speed, width / 2 - 60, height / 2);

    ctx.font = 'bold 100px "Orbitron", sans-serif';
    ctx.fillStyle = rpm > RPM_REDLINE ? redColor : primaryColor;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillText(gear, width / 2 + 130, height / 2 + 30);
    ctx.shadowBlur = 0;

    ctx.font = '24px "Roboto Mono", monospace';
    ctx.fillStyle = textColor;
    ctx.fillText(getSpeedUnit(), width / 2 - 60, height / 2 + 70);
    
    // --- Input Meters (Left/Right) ---
    const barWidth = 15;
    const barHeight = 200;
    const barY = height / 2 - barHeight / 2;

    // Brake
    ctx.fillStyle = 'rgba(20,0,0,0.7)';
    ctx.fillRect(20, barY, barWidth, barHeight);
    ctx.fillStyle = redColor;
    ctx.shadowColor = redColor;
    ctx.shadowBlur = 15;
    ctx.fillRect(20, barY + barHeight * (1 - brake), barWidth, barHeight * brake);

    // Throttle
    ctx.fillStyle = 'rgba(0,20,0,0.7)';
    ctx.fillRect(width - 20 - barWidth, barY, barWidth, barHeight);
    ctx.fillStyle = greenColor;
    ctx.shadowColor = greenColor;
    ctx.shadowBlur = 15;
    ctx.fillRect(width - 20 - barWidth, barY + barHeight * (1 - throttle), barWidth, barHeight * throttle);
    ctx.shadowBlur = 0;

    // --- Lap Timer (Top Right) ---
    ctx.fillStyle = bgPanel;
    ctx.fillRect(width - 230, 20, 210, 110);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 18px "Roboto Mono", monospace';
    ctx.fillStyle = textColor;

    ctx.fillText('CURRENT', width - 30, 30);
    ctx.fillText('LAST', width - 30, 65);
    ctx.fillText('BEST', width - 30, 100);
    
    ctx.font = '30px "Roboto Mono", monospace';
    ctx.fillStyle = whiteColor;
    ctx.fillText(formatTime(currentLapTime), width - 110, 25);
    ctx.fillText(formatTime(lastLap), width - 110, 60);
    
    if (bestLap > 0 && lastLap === bestLap) ctx.fillStyle = '#A855F7'; // Purple for best
    ctx.fillText(formatTime(bestLap), width - 110, 95);


    // --- Ancillary Data (Top Left) ---
    ctx.fillStyle = bgPanel;
    ctx.fillRect(20, 20, 200, 80);
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px "Roboto Mono", monospace';
    
    ctx.fillStyle = '#3498db';
    ctx.fillText('WATER', 30, 30);
    ctx.fillStyle = whiteColor;
    ctx.fillText(`${data.engineTemp.toFixed(0)}°C`, 120, 30);

    ctx.fillStyle = yellowColor;
    ctx.fillText('OIL', 30, 65);
    ctx.fillStyle = whiteColor;
    ctx.fillText(`${data.oilPressure.toFixed(1)} Bar`, 120, 65);
    
    // --- G-Force Meter (Bottom Right) ---
    const gForceX = width - 100;
    const gForceY = height - 150;
    const gSize = 120;
    ctx.fillStyle = bgPanel;
    ctx.fillRect(gForceX - gSize/2, gForceY - gSize/2, gSize, gSize);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gForceX - gSize/2, gForceY); ctx.lineTo(gForceX + gSize/2, gForceY);
    ctx.moveTo(gForceX, gForceY - gSize/2); ctx.lineTo(gForceX, gForceY + gSize/2);
    ctx.stroke();

    const maxG = 2.0;
    const gDotX = gForceX + (data.lateralGForce / maxG) * (gSize / 2);
    const gDotY = gForceY - (data.longitudinalGForce / maxG) * (gSize / 2);
    
    ctx.fillStyle = '#FF00FF';
    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(gDotX, gDotY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
};

const TrackCamera: React.FC<TrackCameraProps> = ({ latestData, gpsPath, lapTimes, elapsedTime }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    
    const { convertSpeed, getSpeedUnit } = useUnitConversion();

    // Refs to hold latest props for the animation loop
    const latestDataRef = useRef(latestData);
    const gpsPathRef = useRef(gpsPath);
    const lapTimesRef = useRef(lapTimes);
    const elapsedTimeRef = useRef(elapsedTime);
    const conversionFnsRef = useRef({ convertSpeed, getSpeedUnit });

    const [isRecording, setIsRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('initializing');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);


    // This effect runs on every render to keep the refs updated with the latest props
    useEffect(() => {
        latestDataRef.current = latestData;
        gpsPathRef.current = gpsPath;
        lapTimesRef.current = lapTimes;
        elapsedTimeRef.current = elapsedTime;
        conversionFnsRef.current = { convertSpeed, getSpeedUnit };
    });

    // This effect runs only ONCE on mount to set up the camera and drawing loop
    useEffect(() => {
        let animationFrameId: number;
        let stream: MediaStream | undefined;

        const setupAndRun = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!canvas || !video) return;
            
            setCameraStatus('initializing');

            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                
                // Set up the event listener *before* setting the source to avoid race conditions.
                video.onloadedmetadata = () => {
                    // The play() method returns a promise which should be handled for robust error checking.
                    video.play().then(() => {
                        setCameraStatus('active');
                    }).catch(playError => {
                        console.error("Error playing video:", playError);
                        setErrorMessage("Failed to start camera feed. Autoplay may be blocked by your browser.");
                        setCameraStatus('error');
                    });
                };
                
                video.srcObject = stream;

            } catch (err) {
                console.error("Camera access error:", err);
                setErrorMessage("Camera access was denied or is unavailable. Please check your browser permissions.");
                setCameraStatus('error');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Start the drawing loop
            const drawLoop = () => {
                if (video && canvas && video.readyState >= 2) { // HAVE_CURRENT_DATA
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    drawTelemetryOverlay(
                        ctx,
                        latestDataRef.current,
                        lapTimesRef.current,
                        elapsedTimeRef.current,
                        conversionFnsRef.current.convertSpeed,
                        conversionFnsRef.current.getSpeedUnit
                    );
                }
                animationFrameId = requestAnimationFrame(drawLoop);
            };
            drawLoop();
        };

        setupAndRun();

        // Cleanup function
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []); // Empty dependency array ensures this runs only once

    const handleStartRecording = () => {
        if (!canvasRef.current || cameraStatus !== 'active') return;

        if (typeof (canvasRef.current as any).captureStream !== 'function' || typeof window.MediaRecorder !== 'function') {
            setErrorMessage("Video recording is not supported on this browser. Please use a recent version of Chrome, Firefox, or Edge.");
            setCameraStatus('error');
            return;
        }

        setVideoUrl(null);
        recordedChunksRef.current = [];

        const mimeType = 'video/webm; codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
             console.warn(`Recording format (${mimeType}) not supported. Video may not be playable.`);
        }

        const stream = (canvasRef.current as any).captureStream(30); // 30 FPS
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    return (
        <div className="w-full h-full relative bg-black rounded-lg overflow-hidden border-2 border-[var(--theme-accent-primary)]/30">
            {cameraStatus === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4 z-10">
                    <p className="font-bold text-red-500">Camera Error</p>
                    <p className="text-gray-300 text-sm mt-2">{errorMessage}</p>
                </div>
            )}
            {cameraStatus === 'initializing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <p className="text-gray-300">Initializing camera...</p>
                </div>
            )}
            <video ref={videoRef} playsInline muted className="absolute w-px h-px opacity-0 -z-10" />
            <canvas ref={canvasRef} width="1280" height="720" className="w-full h-full" />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                <div>
                    {videoUrl && <a href={videoUrl} download={`race-session-${new Date().toISOString()}.webm`} className="btn btn-secondary">Download Recording</a>}
                </div>
                {!isRecording ? (
                    <button onClick={handleStartRecording} disabled={cameraStatus !== 'active'} className="btn btn-danger flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                        REC
                    </button>
                ) : (
                    <button onClick={handleStopRecording} className="btn btn-secondary">Stop</button>
                )}
            </div>
        </div>
    );
};

export default TrackCamera;
