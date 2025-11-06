import React, { useState, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { getCoPilotResponse } from '../services/geminiService';
import { DiagnosticAlert, AlertLevel } from '../types';
import { useVehicleStore } from '../store/useVehicleStore';
import { MOCK_ALERTS } from './Alerts';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SoundWaveIcon from './icons/SoundWaveIcon';

enum CoPilotState {
  Idle,
  Listening,
  Thinking,
  Speaking,
}

const CoPilot: React.FC = () => {
  const { latestData, hasActiveFault } = useVehicleStore(state => ({
    latestData: state.latestData,
    hasActiveFault: state.hasActiveFault,
  }));

  const [state, setState] = useState<CoPilotState>(CoPilotState.Idle);
  const [userTranscript, setUserTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [announcedAlertIds, setAnnouncedAlertIds] = useState<Set<string>>(new Set());

  const { speak, isSpeaking, cancel } = useTextToSpeech();

  const activeAlerts = MOCK_ALERTS.filter(alert => {
    return !alert.isFaultRelated || hasActiveFault;
  });

  useEffect(() => {
    const newCriticalAlerts = activeAlerts.filter(
      alert => alert.level === AlertLevel.Critical && !announcedAlertIds.has(alert.id)
    );

    if (newCriticalAlerts.length > 0 && state === CoPilotState.Idle && !isSpeaking) {
      const alertToAnnounce = newCriticalAlerts[0];
      const announcement = `Critical Alert: ${alertToAnnounce.component}. ${alertToAnnounce.message}`;
      
      setAiResponse(announcement);
      setIsOpen(true);
      setState(CoPilotState.Speaking);
      speak(announcement);

      setAnnouncedAlertIds(prev => new Set(prev).add(alertToAnnounce.id));
    }
  }, [activeAlerts, announcedAlertIds, isSpeaking, speak, state]);

  const handleAiResponse = useCallback((response: string) => {
    setAiResponse(response);
    setState(CoPilotState.Speaking);
    speak(response);
  }, [speak]);

  const processCommand = useCallback(async (command: string) => {
    setUserTranscript(command);
    setLastCommand(command);
    setState(CoPilotState.Thinking);
    setAiResponse('');
    const response = await getCoPilotResponse(command, latestData, activeAlerts);
    handleAiResponse(response);
  }, [latestData, activeAlerts, handleAiResponse]);

  const { isListening, startListening, stopListening, hasSupport, error: speechError } = useSpeechRecognition(processCommand);

  useEffect(() => {
    if (speechError) {
      setState(CoPilotState.Idle);
      setIsOpen(true);
      if (speechError === 'not-allowed') {
        setAiResponse("Microphone access is required. Please enable it in browser settings.");
      } else {
        setAiResponse(`An error occurred: ${speechError}.`);
      }
    }
  }, [speechError]);
  
  useEffect(() => {
    if (isListening) setState(CoPilotState.Listening);
    else if (state === CoPilotState.Listening) setState(CoPilotState.Idle);
  }, [isListening, state]);
  
  useEffect(() => {
    if (!isSpeaking && state === CoPilotState.Speaking) setState(CoPilotState.Idle);
  }, [isSpeaking, state]);
  
  const handleFabClick = () => {
    if (!hasSupport) {
        setIsOpen(true);
        setState(CoPilotState.Idle);
        setAiResponse("Sorry, your browser doesn't support voice commands.");
        return;
    }
      
    if (state === CoPilotState.Idle) {
      setIsOpen(true);
      startListening();
    } else {
      stopListening();
      cancel();
      setState(CoPilotState.Idle);
      setIsOpen(false);
    }
  };

  const fabStyle: React.CSSProperties = {
    backgroundColor: state === CoPilotState.Listening ? 'var(--theme-accent-red)' : 'var(--theme-accent-primary)',
    boxShadow: `0 0 12px ${state === CoPilotState.Listening ? 'var(--theme-accent-red)' : 'var(--theme-accent-primary)'}`
  };

  const StatusIndicator = () => {
    let icon;
    let text = "AI Co-Pilot is standing by.";

    switch (state) {
        case CoPilotState.Listening:
            icon = <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />;
            text = "Listening...";
            break;
        case CoPilotState.Thinking:
            icon = <div className="w-10 h-10 border-4 border-[var(--theme-text-primary)] border-t-transparent rounded-full animate-spin" />;
            text = "Thinking...";
            break;
        case CoPilotState.Speaking:
            icon = <SoundWaveIcon className="w-10 h-10 text-[var(--theme-text-primary)]"/>;
            text = "Responding...";
            break;
        default:
            icon = <MicrophoneIcon className="w-10 h-10 text-[var(--theme-text-primary)]"/>;
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-24 h-24 rounded-full bg-black/20 flex items-center justify-center">{icon}</div>
            <p className="text-lg text-[var(--theme-text-secondary)]">{text}</p>
        </div>
    );
  };

  return (
    <>
      <button
        onClick={handleFabClick}
        style={fabStyle}
        className='fixed bottom-6 right-6 w-16 h-16 rounded-full text-black flex items-center justify-center transition-all duration-300 z-50 shadow-lg'
        aria-label="Activate AI Co-Pilot"
      >
        {state === CoPilotState.Idle && <MicrophoneIcon className="w-8 h-8" />}
        {state === CoPilotState.Listening && <div className="w-5 h-5 rounded-full bg-black animate-pulse" />}
        {state === CoPilotState.Thinking && <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />}
        {state === CoPilotState.Speaking && <SoundWaveIcon className="w-8 h-8"/> }
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4" onClick={() => {if (state !== CoPilotState.Speaking) setIsOpen(false)}}>
          <div className="glass-panel w-full max-w-xl p-6 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <StatusIndicator />
            
            <div className="min-h-[56px] text-center">
                {aiResponse && (
                    <p className={`text-xl font-semibold ${aiResponse.startsWith('Critical Alert:') ? 'text-[var(--theme-accent-red)]' : 'text-[var(--theme-text-primary)]'}`}>
                        {aiResponse}
                    </p>
                )}
            </div>

            {lastCommand && (
                <p className="text-base text-[var(--theme-text-secondary)] opacity-80 line-through mt-2">
                    {`User: "${lastCommand}"`}
                </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CoPilot;
