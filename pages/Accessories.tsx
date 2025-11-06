import React, { useState, useContext, useEffect } from 'react';
import { AppearanceContext, CopilotAudioOutput } from '../contexts/AppearanceContext';
import { useVehicleStore } from '../store/useVehicleStore';
import { ConnectionStatus, AuditEvent, Did } from '../types';
import { obdService, MOCK_OEM_PROFILES } from '../services/obdService';
import FeatureLock from '../components/DataBar';

const VehicleConnection: React.FC = () => {
    const { connectionStatus, deviceName, connectToVehicle, disconnectFromVehicle, errorMessage } = useVehicleStore(state => ({
        connectionStatus: state.connectionStatus,
        deviceName: state.deviceName,
        connectToVehicle: state.connectToVehicle,
        disconnectFromVehicle: state.disconnectFromVehicle,
        errorMessage: state.errorMessage,
    }));
    
    const [isReinitializing, setIsReinitializing] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const isConnected = connectionStatus === ConnectionStatus.CONNECTED;
    const isConnecting = connectionStatus === ConnectionStatus.CONNECTING;

    const statusInfo = {
        [ConnectionStatus.CONNECTED]: { color: 'bg-green-500', text: 'Connected' },
        [ConnectionStatus.CONNECTING]: { color: 'bg-yellow-500', text: 'Connecting' },
        [ConnectionStatus.DISCONNECTED]: { color: 'bg-gray-500', text: 'Disconnected' },
        [ConnectionStatus.ERROR]: { color: 'bg-red-500', text: 'Error' },
    };
    
    const { color, text } = statusInfo[connectionStatus];

    const handleConnectClick = () => {
        setFeedbackMessage(null);
        if (isConnected) {
            disconnectFromVehicle();
        } else {
            connectToVehicle();
        }
    }

    const handleReinitialize = async () => {
        setIsReinitializing(true);
        setFeedbackMessage(null);
        try {
            await obdService.reinitialize();
            setFeedbackMessage({ type: 'success', text: 'ELM327 re-initialized successfully.' });
        } catch (e) {
            setFeedbackMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to re-initialize.' });
        } finally {
            setIsReinitializing(false);
        }
    };
    
    // Auto-clear feedback message after a few seconds
    useEffect(() => {
        if (feedbackMessage) {
            const timer = setTimeout(() => setFeedbackMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedbackMessage]);

    return (
         <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
            <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-4 font-display">OBD-II Connection Settings</h2>
            
            <div className="space-y-4">
                <div className="bg-base-800/50 p-4 rounded-md flex justify-between items-center">
                    <span className="font-semibold text-gray-300">Status</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color} ${isConnecting ? 'animate-pulse' : ''}`}></div>
                        <span className="text-sm font-medium">{text}</span>
                    </div>
                </div>

                {(isConnected || isConnecting) && deviceName && (
                    <div className="bg-base-800/50 p-4 rounded-md flex justify-between items-center">
                        <span className="font-semibold text-gray-300">Device</span>
                        <span className="text-sm text-gray-200 font-mono truncate">{deviceName}</span>
                    </div>
                )}

                {connectionStatus === ConnectionStatus.ERROR && errorMessage && (
                    <div className="p-3 rounded-md text-center text-sm bg-red-900/50 text-red-300 border border-red-700/50">
                        <p className="font-semibold">Connection Failed</p>
                        <p className="text-xs">{errorMessage}</p>
                    </div>
                )}
                
                <p className="text-xs text-gray-400 pt-2">
                    Use a compatible ELM327 Bluetooth dongle to stream live ECU data. If you experience data dropouts, try re-initializing the connection.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <button
                        onClick={handleConnectClick}
                        disabled={isConnecting}
                        className={`btn w-full ${isConnected ? 'btn-danger' : 'btn-action'}`}
                    >
                        {isConnecting ? 'Connecting...' : (isConnected ? 'Disconnect' : 'Connect to Vehicle')}
                    </button>
                    <button
                        onClick={handleReinitialize}
                        disabled={!isConnected || isReinitializing}
                        className="btn btn-secondary w-full"
                    >
                        {isReinitializing ? 'Re-initializing...' : 'Re-initialize ELM327'}
                    </button>
                </div>
                
                {feedbackMessage && (
                    <div className={`mt-4 p-2 rounded-md text-center text-sm transition-opacity duration-300 ${
                        feedbackMessage.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                    }`}>
                        {feedbackMessage.text}
                    </div>
                )}
            </div>
        </div>
    );
};

const OemDiagnostics: React.FC = () => {
    const { connectionStatus, addAuditEvent } = useVehicleStore(state => ({
        connectionStatus: state.connectionStatus,
        addAuditEvent: state.addAuditEvent,
    }));
    const [selectedOem, setSelectedOem] = useState('');
    const [didResults, setDidResults] = useState<Record<string, { value: string, isLoading: boolean }>>({});

    const isConnected = connectionStatus === ConnectionStatus.CONNECTED;
    const currentProfile = MOCK_OEM_PROFILES.find(p => p.oem === selectedOem);

    const handleOemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedOem(e.target.value);
        setDidResults({}); // Clear results when profile changes
    };

    const handleReadDid = async (symbol: string, did: Did) => {
        setDidResults(prev => ({ ...prev, [symbol]: { value: 'Reading...', isLoading: true } }));
        addAuditEvent(AuditEvent.DiagnosticQuery, `Reading DID: ${did.desc} (${symbol}) from ${selectedOem} profile.`);
        try {
            const result = await obdService.readDid(did);
            setDidResults(prev => ({ ...prev, [symbol]: { value: result, isLoading: false } }));
        } catch (e) {
            const error = e instanceof Error ? e.message : 'Unknown error';
            setDidResults(prev => ({ ...prev, [symbol]: { value: `Error: ${error}`, isLoading: false } }));
        }
    };

    return (
        <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg relative">
            <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-4 font-display">OEM Diagnostic Profiles</h2>
            <div className={`space-y-4 ${!isConnected ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label htmlFor="oem-select" className="block text-sm font-medium text-gray-300 mb-1">Select OEM Profile</label>
                    <select
                        id="oem-select"
                        value={selectedOem}
                        onChange={handleOemChange}
                        className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200 focus:ring-brand-cyan focus:border-brand-cyan"
                    >
                        <option value="">-- Standard OBD-II --</option>
                        {MOCK_OEM_PROFILES.map(profile => (
                            <option key={profile.oem} value={profile.oem}>{profile.oem}</option>
                        ))}
                    </select>
                </div>

                {currentProfile && (
                    <div>
                        <h3 className="text-md font-semibold text-gray-300 mt-4 mb-2">Available Data Identifiers (DIDs)</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto bg-base-900/50 p-2 rounded-md">
                            {Object.entries(currentProfile.dids).map(([symbol, did]) => (
                                <div key={symbol} className="flex items-center justify-between p-2 bg-base-800 rounded-md">
                                    <div>
                                        <p className="font-semibold text-gray-200">{did.desc}</p>
                                        <p className="text-xs text-gray-400 font-mono">Symbol: {symbol} | ID: {did.id}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-brand-cyan w-48 text-right truncate" title={didResults[symbol]?.value}>
                                            {didResults[symbol]?.isLoading ? '...' : (didResults[symbol]?.value || '')}
                                        </span>
                                        <button
                                            onClick={() => handleReadDid(symbol, did)}
                                            disabled={didResults[symbol]?.isLoading}
                                            className="btn btn-secondary px-3 py-1 text-xs"
                                        >
                                            Read
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {!isConnected && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                    <p className="text-yellow-400 font-semibold">Connect to vehicle to access OEM diagnostics.</p>
                </div>
            )}
        </div>
    );
};


const Accessories: React.FC = () => {
    const { copilotAudioOutput, setCopilotAudioOutput } = useContext(AppearanceContext);

    const [isStereoConnected, setIsStereoConnected] = useState(true);
    const [stereoName, setStereoName] = useState('Pioneer AVH-Z9200DAB');
    const [volume, setVolume] = useState(75);
    const [source, setSource] = useState<'Radio' | 'Bluetooth' | 'USB'>('Bluetooth');

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Accessory Control</h1>
                <p className="text-gray-400 mt-1">Manage connected devices and integrations.</p>
            </div>
            
            <VehicleConnection />

            <OemDiagnostics />

            {/* Car Stereo Section */}
            <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                <div className="flex justify-between items-center border-b border-brand-cyan/30 pb-2 mb-6">
                    <h2 className="text-lg font-semibold font-display">Car Stereo</h2>
                    <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${isStereoConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className="text-sm text-gray-400">
                            {isStereoConnected ? `Connected: ${stereoName}` : 'Disconnected'}
                        </span>
                    </div>
                </div>

                <div className={`space-y-6 ${!isStereoConnected ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                        <label htmlFor="volume" className="block text-md font-semibold text-gray-300 mb-2">Master Volume</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="range"
                                id="volume"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={e => setVolume(parseInt(e.target.value))}
                                className="w-full h-2 bg-base-800 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                                disabled={!isStereoConnected}
                            />
                            <span className="font-mono text-lg w-12 text-right">{volume}%</span>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-md font-semibold text-gray-300 mb-3">Audio Source</h3>
                        <div className="flex gap-4">
                            {(['Radio', 'Bluetooth', 'USB'] as const).map(src => (
                                <button
                                    key={src}
                                    onClick={() => setSource(src)}
                                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${source === src ? 'bg-brand-cyan text-black' : 'bg-base-800 text-gray-300 hover:bg-base-700'}`}
                                    disabled={!isStereoConnected}
                                >
                                    {src}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Co-Pilot Integration */}
            <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-6 font-display">Handsfree Co-Pilot Integration</h2>
                <div className="space-y-4">
                    <p className="text-gray-400 text-sm">Route audio feedback from KC through your desired output.</p>
                     <div>
                        <h3 className="text-md font-semibold text-gray-300 mb-3">Audio Output</h3>
                        <div className="flex gap-4">
                            {(['phone', 'stereo'] as const).map(output => (
                                <button
                                    key={output}
                                    onClick={() => setCopilotAudioOutput(output)}
                                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors capitalize ${copilotAudioOutput === output ? 'bg-brand-cyan text-black' : 'bg-base-800 text-gray-300 hover:bg-base-700'}`}
                                    disabled={output === 'stereo' && !isStereoConnected}
                                >
                                    {output} {output === 'stereo' && !isStereoConnected ? '(N/A)' : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Accessories;