

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVehicleStore } from '../store/useVehicleStore';
import { getTuningSuggestion, analyzeTuneSafety, getTuningChatResponse } from '../services/geminiService';
import { TuningSuggestion, ChatMessage, AuditEvent, HederaEventType } from '../types';
import TuningSlider from '../components/tuning/TuningSlider';
import InteractiveTuningMap from '../components/tachometers/ClassicTachometer';
import SparklesIcon from '../components/icons/SparklesIcon';
import ReactMarkdown from 'react-markdown';
import RealtimeMetrics from './TuningSandbox';
import { useTrainingStore } from '../hooks/useVehicleData';
import FeatureLock from '../components/DataBar';

const RPM_AXIS = ['800', '1500', '2500', '3500', '4500', '5500', '6500', '7500'];
const LOAD_AXIS = ['20', '30', '40', '50', '60', '70', '80', '100'];

const generateDefaultMap = (baseValue: number): number[][] => 
    Array(LOAD_AXIS.length).fill(0).map(() => Array(RPM_AXIS.length).fill(baseValue));

const DEFAULT_TUNE = {
    fuelMap: 0,
    ignitionTiming: generateDefaultMap(25),
    boostPressure: generateDefaultMap(0.5),
};

const TuningPage: React.FC = () => {
    const { latestData, addAuditEvent, addHederaRecord } = useVehicleStore(state => ({
        latestData: state.latestData,
        addAuditEvent: state.addAuditEvent,
        addHederaRecord: state.addHederaRecord,
    }));
    const isUnlocked = useTrainingStore(state => state.isUnlocked('advanced-performance'));

    const [currentTune, setCurrentTune] = useState(DEFAULT_TUNE);
    const [boostPressureOffset, setBoostPressureOffset] = useState(0);
    const [activeTab, setActiveTab] = useState<'fuel' | 'ignition' | 'boost'>('ignition');
    const [aiIsLoading, setAiIsLoading] = useState(false);
    const [aiChat, setAiChat] = useState<ChatMessage[]>([]);
    const [aiChatInput, setAiChatInput] = useState('');
    const [safetyReport, setSafetyReport] = useState<{ score: number; warnings: string[] } | null>(null);
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiChat]);
    
    const displayBoostMap = useMemo(() => {
        return currentTune.boostPressure.map(row => 
            row.map(cell => parseFloat((cell + boostPressureOffset).toFixed(2)))
        );
    }, [currentTune.boostPressure, boostPressureOffset]);

    const handleMapChange = (map: 'ignitionTiming' | 'boostPressure', row: number, col: number, value: number) => {
        let newMap;
        if (map === 'boostPressure') {
            const baseValue = value - boostPressureOffset;
            newMap = currentTune.boostPressure.map(r => [...r]);
            newMap[row][col] = parseFloat(baseValue.toFixed(2));
            setCurrentTune(prev => ({ ...prev, boostPressure: newMap }));
        } else {
            newMap = currentTune.ignitionTiming.map(r => [...r]);
            newMap[row][col] = value;
            setCurrentTune(prev => ({ ...prev, ignitionTiming: newMap }));
        }
        setSafetyReport(null);
    };

    const handleFuelChange = (value: number) => {
        setCurrentTune(prev => ({...prev, fuelMap: value}));
        setSafetyReport(null);
    };
    
    const handleBoostOffsetChange = (value: number) => {
        setBoostPressureOffset(value);
        setSafetyReport(null);
    };
    
    const applySuggestion = (suggestion: TuningSuggestion, goal: string) => {
        const { boostPressureOffset: suggestedOffset, ...suggestedMaps } = suggestion.suggestedParams;
        if (suggestedOffset !== undefined && suggestedOffset !== null) {
            setBoostPressureOffset(suggestedOffset);
        }
        setCurrentTune(prev => ({ ...prev, ...suggestedMaps }));

        const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'ai',
            text: `**Tune Applied: "${goal}"**\n- **Gains:** ${suggestion.analysis.predictedGains}\n- **Risks:** ${suggestion.analysis.potentialRisks}`
        };

        if (suggestedOffset !== undefined) {
          aiMessage.text += `\n- **Boost Offset:** ${suggestedOffset.toFixed(2)} bar`;
        }

        if (suggestion.analysis.educationalTip) {
            aiMessage.text += `\n- **Pro Tip:** ${suggestion.analysis.educationalTip}`;
        }
        setAiChat(prev => [...prev, aiMessage]);
        addAuditEvent(AuditEvent.TuningChange, `AI tuning suggestion '${goal}' applied.`);
        addHederaRecord(HederaEventType.Tuning, `AI tune '${goal}' applied.`);
        setSafetyReport(null);
    };

    const handleGetSuggestion = async (goal: string) => {
        setAiIsLoading(true);
        const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: `Generate a tune for: ${goal}` };
        setAiChat(prev => [...prev, userMessage]);
        addAuditEvent(AuditEvent.AiAnalysis, `Requested AI tuning suggestion for "${goal}".`);
        try {
            const suggestion = await getTuningSuggestion(goal, latestData, currentTune, boostPressureOffset);
            applySuggestion(suggestion, goal);
        } catch (e) {
            const error = e instanceof Error ? e.message : "An unknown error occurred.";
            const aiMessage: ChatMessage = { id: Date.now().toString(), sender: 'ai', text: `Sorry, I couldn't generate a tune. Error: ${error}` };
            setAiChat(prev => [...prev, aiMessage]);
        } finally {
            setAiIsLoading(false);
        }
    };

    const handleSafetyCheck = async () => {
        setAiIsLoading(true);
        setSafetyReport(null);
        const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: 'Analyze the safety of my current tune.' };
        setAiChat(prev => [...prev, userMessage]);
        addAuditEvent(AuditEvent.AiAnalysis, `Requested tune safety analysis.`);
        try {
            const { ignitionTiming, boostPressure } = currentTune;
            const report = await analyzeTuneSafety({ ignitionTiming, boostPressure }, boostPressureOffset, latestData);
            setSafetyReport({ score: report.safetyScore, warnings: report.warnings });
            let safetyMessage = `**Safety Analysis Complete**\n- **Safety Score:** ${report.safetyScore}/100\n`;
            if (report.warnings.length > 0) {
                safetyMessage += `- **Warnings:**\n${report.warnings.map(w => `  - ${w}`).join('\n')}`;
            } else {
                safetyMessage += "- No immediate safety concerns detected under current conditions.";
            }
            const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: safetyMessage };
            setAiChat(prev => [...prev, aiMessage]);
        } catch (e) {
            const error = e instanceof Error ? e.message : "An unknown error occurred.";
            const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: `Sorry, I couldn't analyze the tune. Error: ${error}` };
            setAiChat(prev => [...prev, aiMessage]);
        } finally {
            setAiIsLoading(false);
        }
    };
    
    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiChatInput.trim() || aiIsLoading) return;
        
        const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: aiChatInput };
        setAiChat(prev => [...prev, userMessage]);
        addAuditEvent(AuditEvent.DiagnosticQuery, `Tuning query: "${aiChatInput}"`);
        setAiChatInput('');
        setAiIsLoading(true);
        
        try {
            const { ignitionTiming, boostPressure } = currentTune;
            const response = await getTuningChatResponse(aiChatInput, {ignitionTiming, boostPressure}, boostPressureOffset, latestData);
            const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: response };
            setAiChat(prev => [...prev, aiMessage]);
        } catch (e) {
            const error = e instanceof Error ? e.message : "An unknown error occurred.";
            const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: `Sorry, I couldn't get a response. Error: ${error}` };
            setAiChat(prev => [...prev, aiMessage]);
        } finally {
            setAiIsLoading(false);
        }
    };
    
    if (!isUnlocked) {
        return (
            <div className="p-4 h-full">
                <FeatureLock featureName="ECU Tuning Interface" moduleName="Performance & Pro Diagnostics" level={5} />
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-4">
            {/* Left Panel: AI Assistant */}
            <div className="lg:col-span-1 bg-black p-4 rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg flex flex-col">
                <h2 className="text-lg font-semibold border-b border-[var(--theme-accent-primary)]/30 pb-2 mb-4 font-display">AI Tuning Assistant</h2>
                <div className="flex-grow my-2 space-y-3 overflow-y-auto pr-2">
                    {aiChat.map(msg => (
                         <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                             <div className={`w-fit max-w-xs p-2 rounded-lg ${msg.sender === 'user' ? 'bg-brand-blue/80' : 'bg-base-800'}`}>
                                 <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                             </div>
                         </div>
                    ))}
                     {aiIsLoading && <div className="text-center text-gray-400 p-2">KC is thinking...</div>}
                    <div ref={chatEndRef} />
                </div>
                <div className="flex-shrink-0 space-y-2 pt-2 border-t border-[var(--theme-accent-primary)]/30">
                     <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <input type="text" value={aiChatInput} onChange={e => setAiChatInput(e.target.value)} placeholder="Ask about tuning..." className="flex-1 bg-base-800 border border-base-700 rounded-md px-3 py-2 text-sm text-gray-200" disabled={aiIsLoading} />
                        <button type="submit" disabled={aiIsLoading} className="btn btn-primary">Send</button>
                    </form>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <button onClick={() => handleGetSuggestion('Max Performance')} disabled={aiIsLoading} className="btn btn-secondary flex items-center justify-center gap-1"><SparklesIcon className="w-4 h-4 text-brand-pink" /> Track Day</button>
                        <button onClick={() => handleGetSuggestion('Fuel Economy')} disabled={aiIsLoading} className="btn btn-secondary flex items-center justify-center gap-1"><SparklesIcon className="w-4 h-4 text-brand-green" /> Eco Tune</button>
                        <button onClick={() => handleGetSuggestion('Daily Driving')} disabled={aiIsLoading} className="btn btn-secondary flex items-center justify-center gap-1"><SparklesIcon className="w-4 h-4 text-[var(--theme-accent-primary)]" /> Daily</button>
                        <button onClick={handleSafetyCheck} disabled={aiIsLoading} className="btn btn-warning font-semibold">Safety Check</button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Tables & Controls */}
            <div className="lg:col-span-2 bg-black p-4 rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg flex flex-col">
                <div className="flex justify-between items-center border-b border-[var(--theme-accent-primary)]/30 pb-2 mb-2">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab('ignition')} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${activeTab === 'ignition' ? 'border-[var(--theme-accent-primary)] text-white shadow-glow-theme bg-[var(--theme-accent-primary)]/20' : 'border-base-700 bg-transparent text-gray-400 hover:border-[var(--theme-accent-primary)]/50'}`}>Ignition</button>
                        <button onClick={() => setActiveTab('boost')} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${activeTab === 'boost' ? 'border-[var(--theme-accent-primary)] text-white shadow-glow-theme bg-[var(--theme-accent-primary)]/20' : 'border-base-700 bg-transparent text-gray-400 hover:border-[var(--theme-accent-primary)]/50'}`}>Boost</button>
                        <button onClick={() => setActiveTab('fuel')} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${activeTab === 'fuel' ? 'border-[var(--theme-accent-primary)] text-white shadow-glow-theme bg-[var(--theme-accent-primary)]/20' : 'border-base-700 bg-transparent text-gray-400 hover:border-[var(--theme-accent-primary)]/50'}`}>Fuel</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setCurrentTune(DEFAULT_TUNE); setBoostPressureOffset(0); }} className="btn btn-secondary">Reset</button>
                         <button disabled className="btn btn-danger">Write to ECU</button>
                    </div>
                </div>
                
                <div className="flex-grow mt-2 overflow-y-auto">
                    <div>
                        {activeTab === 'ignition' && <InteractiveTuningMap title="Ignition Timing (deg BTDC)" data={currentTune.ignitionTiming} xAxisLabels={RPM_AXIS} yAxisLabels={LOAD_AXIS} onChange={(r, c, v) => handleMapChange('ignitionTiming', r, c, v)} />}
                        {activeTab === 'boost' && (
                            <div>
                                <InteractiveTuningMap 
                                    title="Effective Boost Pressure Target (bar)" 
                                    data={displayBoostMap} 
                                    xAxisLabels={RPM_AXIS} 
                                    yAxisLabels={LOAD_AXIS} 
                                    onChange={(r, c, v) => handleMapChange('boostPressure', r, c, v)} 
                                />
                                <div className="p-4 border-t border-[var(--theme-accent-primary)]/30 mt-4">
                                    <TuningSlider 
                                        label="Global Boost Offset" 
                                        unit="bar" 
                                        value={boostPressureOffset} 
                                        min={-0.5} 
                                        max={0.5} 
                                        step={0.05} 
                                        onChange={handleBoostOffsetChange} 
                                    />
                                </div>
                            </div>
                        )}
                        {activeTab === 'fuel' && (
                            <div className="p-8">
                                <h2 className="text-lg font-semibold text-center mb-4 font-display">Global Fuel Map Enrichment</h2>
                                <TuningSlider label="Fuel Trim" unit="%" value={currentTune.fuelMap} min={-10} max={10} step={0.5} onChange={handleFuelChange} />
                            </div>
                        )}
                    </div>
                    <RealtimeMetrics />
                </div>
            </div>
        </div>
    );
};

export default TuningPage;