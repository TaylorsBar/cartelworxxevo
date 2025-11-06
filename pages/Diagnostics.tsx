import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLiveConversation } from '../hooks/useLiveConversation';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import SoundWaveIcon from '../components/icons/SoundWaveIcon';
import { useVehicleStore } from '../store/useVehicleStore';
import { ConnectionStatus, DTCInfo, GroundedResponse } from '../types';
import GlassCard from '../components/Header'; // Repurposed for GlassCard
import DataCard from '../components/StatCard'; // Repurposed for DataCard
import { analyzeImage } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import CameraIcon from '../components/icons/CameraIcon';
import SparklesIcon from '../components/icons/SparklesIcon';
import FeatureLock from '../components/DataBar';
import GroundingSources from '../components/GroundingSources';

const TabButton: React.FC<{ label: string; icon?: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${isActive ? 'bg-[var(--glass-bg)] border-b-2 border-b-[var(--theme-accent-primary)] text-white' : 'bg-transparent text-gray-400 hover:text-white'}`}
    >
        {icon}
        {label}
    </button>
);

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = () => {
        switch(status) {
            case 'CONNECTED': return 'text-green-400';
            case 'DISCONNECTED': return 'text-red-400';
            case 'ERROR': return 'text-red-500';
            default: return 'text-yellow-400';
        }
    }
    return (
        <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor().replace('text', 'bg')}`}></div>
            <span className={`text-sm font-semibold ${getStatusColor()}`}>{status}</span>
        </div>
    );
};

const ConversationalDiagnostics: React.FC = () => {
    const { 
        connectionState, 
        userTranscript, 
        aiTranscript,
        error, 
        connect, 
        disconnect 
    } = useLiveConversation();

    const [lastUserTranscript, setLastUserTranscript] = useState('');
    const [lastAiTranscript, setLastAiTranscript] = useState("Hello! I'm KC. How can I help you with your vehicle diagnostics today?");

    useEffect(() => {
        if (userTranscript) setLastUserTranscript(userTranscript);
    }, [userTranscript]);

    useEffect(() => {
        if (aiTranscript) setLastAiTranscript(aiTranscript);
    }, [aiTranscript]);

    const isSessionActive = connectionState !== 'DISCONNECTED' && connectionState !== 'ERROR';

    const handleButtonClick = () => {
        if (isSessionActive) {
            disconnect();
        } else {
            connect();
        }
    };

    return (
        <div className="flex flex-col h-full text-center items-center justify-between p-4">
            <div>
                <h2 className="text-xl font-bold text-gray-100 font-display">Live Conversational AI</h2>
                <p className="text-gray-400 mt-1 text-sm">Speak with KC for real-time help.</p>
                <div className="mt-4">
                    <StatusIndicator status={error ? 'ERROR' : connectionState} />
                    {error && <p className="text-red-500 text-xs mt-1 max-w-sm mx-auto">{error}</p>}
                </div>
            </div>

            <div className="w-full max-w-2xl flex-grow flex flex-col justify-center gap-4 my-4">
                <div className="min-h-[4rem] p-3 bg-base-900/50 rounded-lg border border-base-700">
                    <h3 className="font-semibold text-[var(--theme-accent-primary)] mb-1 text-left text-xs">KC's Response:</h3>
                    <div className="prose prose-sm prose-invert max-w-none text-left">
                        <ReactMarkdown>{lastAiTranscript}</ReactMarkdown>
                    </div>
                </div>
                <div className="min-h-[4rem] p-3 bg-base-800/50 rounded-lg border border-base-700">
                     <h3 className="font-semibold text-gray-400 mb-1 text-left text-xs">Your Input:</h3>
                     <p className="text-md text-gray-300 italic text-left">{lastUserTranscript || "..."}</p>
                </div>
            </div>
            
            <div className="flex flex-col items-center">
                <button
                    onClick={handleButtonClick}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mx-auto btn-neumorphic ${isSessionActive ? 'btn-neumorphic-active !text-red-500' : ''}`}
                >
                    {isSessionActive ? <SoundWaveIcon className="w-10 h-10" /> : <MicrophoneIcon className="w-10 h-10" />}
                </button>
                <p className="text-xs text-gray-400 mt-3">
                    {connectionState === 'CONNECTING' ? 'Connecting...' : (isSessionActive ? 'Session Active | Tap to Disconnect' : 'Tap to Start Session')}
                </p>
            </div>
        </div>
    );
}

const DTCScanner: React.FC = () => {
    const {
        connectionStatus,
        isScanning,
        dtcResults,
        error,
        scanForDTCs,
    } = useVehicleStore(state => ({
        connectionStatus: state.connectionStatus,
        isScanning: state.isScanningDTCs,
        dtcResults: state.dtcResults,
        error: state.dtcError,
        scanForDTCs: state.scanForDTCs,
    }));
    
    const severityStyles = {
        Critical: { border: 'border-red-500', text: 'text-red-400' },
        Warning: { border: 'border-yellow-500', text: 'text-yellow-400' },
        Info: { border: 'border-blue-500', text: 'text-blue-400' },
    };

    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-100 font-display text-center">Fault Code Scanner</h2>
                <p className="text-gray-400 mt-1 text-sm text-center">Scan your vehicle's ECU for Diagnostic Trouble Codes (DTCs).</p>
                 <button
                    onClick={scanForDTCs}
                    disabled={isScanning || connectionStatus !== ConnectionStatus.CONNECTED}
                    className="btn btn-primary w-full mt-4"
                >
                    {isScanning ? 'Scanning...' : 'Scan for Fault Codes'}
                </button>
                {connectionStatus !== ConnectionStatus.CONNECTED && <p className="text-xs text-yellow-400 text-center mt-2">Vehicle connection required to scan for codes.</p>}
            </div>

            <div className="flex-grow mt-4 overflow-y-auto pr-2">
                {error && <div className="text-red-400 bg-red-900/20 p-3 rounded-md">{error}</div>}
                <div className="space-y-3">
                    {dtcResults.map(dtc => (
                        <div key={dtc.code} className={`p-3 rounded-md border-l-4 bg-base-800/50 ${severityStyles[dtc.severity].border}`}>
                            <h3 className={`font-mono font-bold text-lg ${severityStyles[dtc.severity].text}`}>{dtc.code}</h3>
                            <p className="text-gray-200 mt-1">{dtc.description}</p>
                            {dtc.possibleCauses.length > 0 && (
                                <div className="mt-2">
                                    <h4 className="text-xs font-semibold text-gray-400">Potential Causes:</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1 mt-1">
                                        {dtc.possibleCauses.map((cause, i) => <li key={i}>{cause}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                     {isScanning && (
                        <div className="flex justify-center items-center py-10">
                            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin border-t-[var(--theme-accent-primary)]"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DiagnosticsDeck: React.FC = () => {
    const latestData = useVehicleStore(state => state.latestData);
    const mapKpa = (latestData.turboBoost * 100) + 101.3;
    const injectorDuty = Math.min(100, (latestData.rpm / 8000) * latestData.engineLoad * 0.9);
    const ignitionAngle = 45 - (latestData.rpm / 8000 * 0.8 + latestData.engineLoad / 100 * 0.2) * 40;

    return (
        <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-100 font-display text-center mb-4">Live Diagnostics Deck</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DataCard title="MAP" value={mapKpa.toFixed(0)} unit="kPa" />
                <DataCard title="Injector Duty" value={injectorDuty.toFixed(1)} unit="%" />
                <DataCard title="Ignition Angle" value={ignitionAngle.toFixed(1)} unit="deg" />
                <DataCard title="Throttle" value={latestData.engineLoad.toFixed(1)} unit="%" />
                <DataCard title="Voltage" value={latestData.batteryVoltage.toFixed(1)} unit="V" />
                <DataCard title="LTFT" value={latestData.longTermFuelTrim.toFixed(1)} unit="%" />
            </div>
        </div>
    )
}

const VisualInspector: React.FC = () => {
    const [image, setImage] = useState<{ file: File; previewUrl: string } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [analysis, setAnalysis] = useState<GroundedResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (files: FileList | null) => {
        if (files && files[0]) {
            if (!files[0].type.startsWith('image/')) {
                setError('Only image files are accepted.');
                return;
            }
            const file = files[0];
            const previewUrl = URL.createObjectURL(file);
            setImage({ file, previewUrl });
            setAnalysis(null);
            setError('');
        }
    };

    const handleAnalyze = async () => {
        if (!image || !prompt.trim()) return;
        setIsLoading(true);
        setAnalysis(null);
        setError('');
        try {
            const result = await analyzeImage(image.file, prompt);
            setAnalysis(result);
        } catch (e: any) {
            setError(e.message || 'An error occurred during analysis.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClear = () => {
        setImage(null);
        setPrompt('');
        setAnalysis(null);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const dropHandler = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
        setIsDragging(false);
        if (ev.dataTransfer.items && ev.dataTransfer.items.length > 0) {
            handleFileChange(ev.dataTransfer.files);
        }
    };
    
    const dragOverHandler = (ev: React.DragEvent<HTMLDivElement>) => ev.preventDefault();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-4">
            {/* Left Panel: Image Upload & Preview */}
            <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-100 font-display text-center">Visual Inspector</h2>
                {!image ? (
                    <div 
                        onDrop={dropHandler}
                        onDragOver={dragOverHandler}
                        onDragEnter={() => setIsDragging(true)}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-grow flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-[var(--theme-accent-primary)] bg-[var(--theme-accent-primary)]/10' : 'border-base-700 hover:border-gray-500'}`}
                    >
                        <CameraIcon className="w-12 h-12 text-gray-500 mb-2" />
                        <p className="text-gray-400">Drag & drop an image here</p>
                        <p className="text-sm text-gray-500">or click to select a file</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e.target.files)}
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="flex-grow relative rounded-lg overflow-hidden border-2 border-base-700">
                        <img src={image.previewUrl} alt="Component Preview" className="w-full h-full object-contain" />
                    </div>
                )}
            </div>

            {/* Right Panel: Prompt & Analysis */}
            <div className="flex flex-col gap-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={image ? "Ask a question about the image...\ne.g., 'What part is this?' or 'Is this belt worn out?'" : "Upload an image to ask a question."}
                    disabled={!image || isLoading}
                    className="w-full flex-grow bg-base-800 border border-base-700 rounded-md p-3 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)]"
                />
                <div className="flex gap-2">
                    <button onClick={handleAnalyze} disabled={!image || !prompt.trim() || isLoading} className="btn btn-primary flex-grow flex items-center justify-center gap-2">
                        <SparklesIcon className="w-5 h-5" />
                        {isLoading ? 'Analyzing...' : 'Analyze Image'}
                    </button>
                    <button onClick={handleClear} disabled={isLoading} className="btn btn-secondary">Clear</button>
                </div>
                <div className="flex-grow bg-base-900/50 rounded-lg border border-base-700 p-3 overflow-y-auto">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10 animate-spin border-t-[var(--theme-accent-primary)]"></div>
                        </div>
                    )}
                    {error && <p className="text-red-400">{error}</p>}
                    {analysis && (
                        <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown>{analysis.text}</ReactMarkdown>
                            {analysis.chunks && analysis.chunks.length > 0 && <GroundingSources chunks={analysis.chunks} />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const Diagnostics: React.FC = () => {
    const [activeTab, setActiveTab] = useState('scanner');
    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex-shrink-0 px-4">
                <h1 className="text-2xl font-bold text-gray-100 font-display">Diagnostics</h1>
                <p className="text-gray-400 mt-1">Advanced fault finding and live data analysis.</p>
            </div>
            <div className="flex-shrink-0 border-b border-[var(--glass-border)] mt-4 overflow-x-auto">
                <div className="flex">
                    <TabButton label="Fault Code Scanner" isActive={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} />
                    <TabButton label="Live Diagnostics Deck" isActive={activeTab === 'deck'} onClick={() => setActiveTab('deck')} />
                    <TabButton label="Conversational AI" isActive={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
                    <TabButton label="Visual Inspector" icon={<CameraIcon className="w-5 h-5"/>} isActive={activeTab === 'inspector'} onClick={() => setActiveTab('inspector')} />
                </div>
            </div>
            <div className="flex-grow mt-4">
                <GlassCard className="h-full">
                    {activeTab === 'scanner' && <DTCScanner />}
                    {activeTab === 'deck' && <DiagnosticsDeck />}
                    {activeTab === 'ai' && <ConversationalDiagnostics />}
                    {activeTab === 'inspector' && <VisualInspector />}
                </GlassCard>
            </div>
        </div>
    );
};

export default Diagnostics;