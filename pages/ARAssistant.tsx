import React, { useState, useEffect, useRef } from 'react';
import { IntentAction, ComponentHotspot, VoiceCommandIntent } from '../types';
import { getVoiceCommandIntent, generateComponentImage, getComponentTuningAnalysis } from '../services/geminiService';
import { useVehicleStore } from '../store/useVehicleStore';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import ReactMarkdown from 'react-markdown';

// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const MOCK_HOTSPOTS: ComponentHotspot[] = [
    { id: 'o2-sensor', name: 'O2 Sensor', cx: '75%', cy: '70%', status: 'Failing' },
    { id: 'map-sensor', name: 'MAP Sensor', cx: '40%', cy: '40%', status: 'Warning' },
    { id: 'alternator', name: 'Alternator', cx: '30%', cy: '65%', status: 'Normal' },
    { id: 'turbo', name: 'Turbocharger', cx: '70%', cy: '50%', status: 'Normal' },
    { id: 'intake', name: 'Air Intake / Throttle Body', cx: '25%', cy: '40%', status: 'Normal' },
    { id: 'coolant', name: 'Coolant Outlet', cx: '45%', cy: '35%', status: 'Normal' },
    { id: 'oil-filter', name: 'Oil Filter', cx: '35%', cy: '75%', status: 'Normal' },
];

const ARAssistant: React.FC = () => {
    // FIX: Use maintenanceLog from the vehicle store instead of non-existent mock data.
    const { latestData, maintenanceLog } = useVehicleStore(state => ({
        latestData: state.latestData,
        maintenanceLog: state.maintenanceLog,
    }));
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);
    const [assistantMessage, setAssistantMessage] = useState("Activate the microphone and ask a question, or click a component on the model to inspect it.");
    
    // AI Inspector State
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionResult, setInspectionResult] = useState<{ imageUrl: string | null; analysis: string | null; error: string | null } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const getLiveDataForComponent = (componentId: string | null): string | null => {
        if (!componentId || !latestData) return null;
        switch(componentId) {
            case 'turbo': return `Boost: ${latestData.turboBoost.toFixed(2)} bar`;
            case 'o2-sensor': return `Voltage: ${latestData.o2SensorVoltage.toFixed(2)} V`;
            case 'coolant': return `Temp: ${latestData.engineTemp.toFixed(1)} °C`;
            case 'oil-filter': return `Pressure: ${latestData.oilPressure.toFixed(1)} bar`;
            case 'map-sensor': return `Load: ${latestData.engineLoad.toFixed(0)}%`;
            case 'alternator': return `Voltage: ${latestData.batteryVoltage.toFixed(1)} V`;
            case 'intake': return `Temp: ${latestData.inletAirTemp.toFixed(1)} °C`;
            default: return null;
        }
    };

    const handleConnect = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setAssistantMessage("Camera access is not supported by your browser.");
            return;
        }
    
        setIsConnecting(true);
        setAssistantMessage("Requesting camera access...");
    
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" } // Prefer rear camera
            });
            streamRef.current = stream;
            if (videoRef.current) {
                const video = videoRef.current;
                // Set up the event listener *before* setting the source to avoid race conditions.
                video.onloadedmetadata = () => {
                    // The play() method returns a promise which should be handled for robust error checking.
                    video.play().then(() => {
                        setIsConnected(true);
                        setAssistantMessage("AR Link active. Point your camera at a component or use voice commands.");
                    }).catch(playError => {
                        console.error("Error playing video:", playError);
                        setAssistantMessage("Failed to start camera feed. Autoplay may be blocked by your browser.");
                        setIsConnected(false);
                    });
                };
                video.srcObject = stream;
            } else {
              // This case should not happen with the new rendering logic, but is kept as a safeguard.
              console.error("Video ref not found, cannot start AR stream.");
              setAssistantMessage("An internal error occurred: Video component not ready.");
              setIsConnected(false);
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            let message = "Failed to access camera.";
            if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
                message = "Camera permission was denied. Please allow camera access in your browser settings to use this feature.";
            }
            setAssistantMessage(message);
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    };
    
    // Cleanup effect to stop the camera stream when the component unmounts
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    const processCommand = async (command: string) => {
        setIsListening(false);
        setAssistantMessage("Thinking...");
        setHighlightedComponent(null); // Clear previous highlight
        const result: VoiceCommandIntent = await getVoiceCommandIntent(command);

        if (result.confidence < 0.7) {
            setAssistantMessage("I'm not quite sure what you mean. Could you try rephrasing?");
            return;
        }

        switch (result.intent) {
            case IntentAction.ShowComponent:
                if (result.component && MOCK_HOTSPOTS.find(h => h.id === result.component)) {
                    setHighlightedComponent(result.component);
                } else {
                    setAssistantMessage("I can't seem to find that component.");
                }
                break;
            case IntentAction.QueryService:
                const nextService = maintenanceLog.find(log => !log.verified && log.isAiRecommendation);
                if (nextService) {
                    setAssistantMessage(`Your next recommended service is: ${nextService.service} on or around ${nextService.date}.`);
                } else {
                    setAssistantMessage("Your service log is up to date. No immediate recommendations found.");
                }
                break;
            case IntentAction.HideComponent:
                setHighlightedComponent(null);
                setAssistantMessage("Highlights cleared. What's next?");
                break;
            default:
                setAssistantMessage("Sorry, I didn't understand that command. You can ask me to show a component or ask about your next service.");
        }
    };
    
    // Effect to trigger AI inspection when a component is highlighted
    useEffect(() => {
        const inspectComponent = async () => {
            if (!highlightedComponent) {
                setInspectionResult(null); // Clear results when no component is selected
                if (isConnected) {
                    setAssistantMessage("Select a component to inspect or use voice commands.");
                }
                return;
            }

            const componentData = MOCK_HOTSPOTS.find(h => h.id === highlightedComponent);
            if (!componentData) return;
            
            const liveData = getLiveDataForComponent(highlightedComponent);
            setAssistantMessage(`Highlighting the ${componentData.name}. Status: ${componentData.status}. ${liveData || ''}`);
            setIsInspecting(true);
            setInspectionResult(null); // Clear previous results
            
            try {
                // Fetch diagram and analysis in parallel
                const [imageUrl, analysis] = await Promise.all([
                    generateComponentImage(componentData.name),
                    getComponentTuningAnalysis(componentData.name, latestData)
                ]);
                setInspectionResult({ imageUrl, analysis, error: null });
            } catch (error) {
                console.error("Failed to inspect component:", error);
                setInspectionResult({ 
                    imageUrl: null, 
                    analysis: null, 
                    error: "Failed to generate AI analysis. Please check your connection." 
                });
            } finally {
                setIsInspecting(false);
            }
        };

        inspectComponent();
    }, [highlightedComponent, latestData, isConnected]);


    const handleListen = () => {
        if (!recognition) {
            setAssistantMessage("Sorry, your browser doesn't support voice commands.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setIsListening(true);
            setTranscript('');
            setHighlightedComponent(null); // Clear component on new voice command
            recognition.start();
        }
    };

    useEffect(() => {
        if (!recognition) return;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                setAssistantMessage("Microphone permission was denied. Please allow microphone access in your browser settings to use voice commands.");
            } else {
                setAssistantMessage(`An error occurred during speech recognition: ${event.error}.`);
            }
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const currentTranscript = event.results[0][0].transcript;
            setTranscript(currentTranscript);
            processCommand(currentTranscript);
        };
    }, []);

    const renderInspectorContent = () => {
        if (isInspecting) {
            return (
                <div className="space-y-4 animate-pulse">
                    <div className="w-full h-40 bg-base-700 rounded-md"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-base-700 rounded w-3/4"></div>
                        <div className="h-4 bg-base-700 rounded w-full"></div>
                        <div className="h-4 bg-base-700 rounded w-1/2"></div>
                    </div>
                </div>
            );
        }

        if (inspectionResult) {
            return (
                 <div className="animate-fade-in space-y-4">
                    {inspectionResult.error && <p className="text-red-400">{inspectionResult.error}</p>}
                    {inspectionResult.imageUrl && (
                        <img src={inspectionResult.imageUrl} alt="AI Generated Component Diagram" className="w-full h-auto rounded-md border-2 border-[var(--theme-accent-primary)]/50" />
                    )}
                    {inspectionResult.analysis && (
                        <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown>{inspectionResult.analysis}</ReactMarkdown>
                        </div>
                    )}
                </div>
            );
        }
        
        // Default message when not inspecting
        return <p className="text-gray-300 text-center flex-grow flex items-center justify-center">{assistantMessage}</p>;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full p-4">
            {/* Left Panel: Camera View and Controls */}
            <div className="w-full lg:w-2/3 bg-black p-6 rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg flex flex-col relative">
                <h1 className="text-xl font-bold text-gray-100 font-display border-b border-[var(--theme-accent-primary)]/30 pb-2 mb-4">Augmented Reality Assistant</h1>

                <div className="flex-grow relative engine-3d-container bg-black">
                    {/* Video element is now always in the DOM to ensure ref is available */}
                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
                    />
                    
                    {!isConnected ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-gray-400 mb-4">Connect to the vehicle's AR system to begin.</p>
                            <button onClick={handleConnect} disabled={isConnecting} className="btn btn-action">
                                {isConnecting ? 'Connecting...' : 'Activate AR Link'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {MOCK_HOTSPOTS.map(hotspot => {
                                const isHighlighted = highlightedComponent === hotspot.id;
                                const liveData = getLiveDataForComponent(hotspot.id);
                                
                                const getStatusClasses = (status: 'Normal' | 'Warning' | 'Failing') => {
                                    switch (status) {
                                        case 'Failing': return { border: 'border-red-500', bg: 'bg-red-500' };
                                        case 'Warning': return { border: 'border-yellow-500', bg: 'bg-yellow-500' };
                                        default: return { border: 'border-gray-500', bg: 'bg-gray-500' };
                                    }
                                };
                                const statusClasses = getStatusClasses(hotspot.status);

                                return (
                                    <button key={hotspot.id} onClick={() => setHighlightedComponent(hotspot.id)} className="absolute group" style={{ left: hotspot.cx, top: hotspot.cy, transform: 'translate(-50%, -50%)' }}>
                                        <div className={`relative flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-300 ${isHighlighted ? 'border-[var(--theme-accent-primary)] scale-150' : statusClasses.border}`}>
                                            <div className={`w-3 h-3 rounded-full ${isHighlighted ? 'bg-[var(--theme-accent-primary)] animate-pulse' : statusClasses.bg}`}></div>
                                        </div>
                                        <div className="absolute bottom-full mb-2 w-max bg-black/80 text-white text-sm px-3 py-1 rounded-md transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                            {hotspot.name}
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            {/* Right Panel: Assistant and Inspector */}
            <div className="w-full lg:w-1/3 bg-black p-6 rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg flex flex-col">
                <h2 className="text-lg font-semibold border-b border-[var(--theme-accent-primary)]/30 pb-2 mb-4 font-display">Assistant & Inspector</h2>
                <div className="flex flex-col flex-grow">
                     <div className="text-center my-4">
                        <button onClick={handleListen} disabled={!isConnected || isConnecting} className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mx-auto ${isListening ? 'bg-red-500 animate-ping' : 'bg-[var(--theme-accent-primary)]'}`}>
                            <MicrophoneIcon className="w-10 h-10 text-black" />
                        </button>
                        {isListening && <p className="text-sm text-gray-400 mt-2">Listening...</p>}
                    </div>

                    <div className="flex-grow mt-4 p-4 bg-base-800/50 rounded-md space-y-3 overflow-y-auto flex flex-col">
                       {renderInspectorContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ARAssistant;