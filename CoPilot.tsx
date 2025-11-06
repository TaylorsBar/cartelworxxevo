import React, { useState, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { getCoPilotResponse } from './services/geminiService';
import { DiagnosticAlert, AlertLevel } from './types';
import { useVehicleStore } from './store/useVehicleStore';
import { MOCK_ALERTS } from './components/Alerts';
import MicrophoneIcon from './components/icons/MicrophoneIcon';
import SoundWaveIcon from './components/icons/SoundWaveIcon';

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
  const [aiResponse, setAiResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [announcedAlertIds, setAnnouncedAlertIds] = useState<Set<string>>(new Set());

  const { speak, isSpeaking, cancel } = useTextToSpeech();

  const activeAlerts = MOCK_ALERTS.filter(alert => {
    return !alert.isFaultRelated || hasActiveFault;
  });

  // Proactively announce new critical alerts
  useEffect(() => {
    const newCriticalAlerts = activeAlerts.filter(
      alert => alert.level === AlertLevel.Critical && !announcedAlertIds.has(alert.id)
    );

    if (newCriticalAlerts.length > 0 && state === CoPilotState.Idle && !isSpeaking) {
      const alertToAnnounce = newCriticalAlerts[0];
      const announcement = `Critical Alert: ${alertToAnnounce.component}. ${alertToAnnounce.message}`;
      
      setAiResponse(announcement);
      setIsOpen(true); // Open the modal to show the user what's happening
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
        setAiResponse("Microphone access is required for Co-Pilot. Please enable it in your browser settings and try again.");
      } else {
        setAiResponse(`A speech recognition error occurred: ${speechError}.`);
      }
    }
  }, [speechError]);
  
  useEffect(() => {
    if (isListening) {
        setState(CoPilotState.Listening);
    } else if (state === CoPilotState.Listening) {
        // This handles cases where listening stops without a result (e.g., timeout or user cancels)
        // and it's not an error case (which is handled by the speechError useEffect).
        setState(CoPilotState.Idle);
    }
  }, [isListening, state]);
  
  useEffect(() => {
    if (!isSpeaking && state === CoPilotState.Speaking) {
      setState(CoPilotState.Idle);
    }
  }, [isSpeaking, state]);
  
  const handleFabClick = () => {
    if (!hasSupport) {
        setIsOpen(true);
        setState(CoPilotState.Idle);
        setAiResponse("Sorry, your browser doesn't support the voice commands needed for the Co-Pilot feature.");
        return;
    }
      
    if (state === CoPilotState.Idle) {
      setIsOpen(true);
      startListening();
    } else {
      // Allow interrupting any state
      stopListening();
      cancel(); // Stop speaking
      setState(CoPilotState.Idle);
      setIsOpen(false);
    }
  };

  const getStatusText = () => {
    switch (state) {
      case CoPilotState.Listening:
        return 'Listening...';
      case CoPilotState.Thinking:
        return `Processing: "${userTranscript}"`;
      case CoPilotState.Speaking:
        return 'KC is responding...';
      default:
        return 'AI Co-Pilot is standing by.';
    }
  };

  const fabColor = state === CoPilotState.Listening ? 'bg-red-500' : 'bg-[var(--theme-accent-primary)]';
  const ringColor = state === CoPilotState.Listening ? 'ring-red-500' : 'ring-[var(--theme-accent-primary)]';

  return (
    <>
      <button
        onClick={handleFabClick}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full text-black flex items-center justify-center transition-colors duration-300 z-50 ${fabColor} hover:opacity-90 shadow-glow-theme`}
        aria-label="Activate AI Co-Pilot"
      >
        {state === CoPilotState.Idle && <MicrophoneIcon className="w-8 h-8" />}
        {state === CoPilotState.Listening && <div className="w-5 h-5 rounded-full bg-black animate-pulse" />}
        {state === CoPilotState.Thinking && <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />}
        {state === CoPilotState.Speaking && <SoundWaveIcon className="w-8 h-8"/> }

      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center" onClick={() => {if (state !== CoPilotState.Speaking) setIsOpen(false)}}>
          <div className="w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`relative inline-block p-4 border-2 ${ringColor} rounded-full mb-6`}>
              <div className={`w-24 h-24 rounded-full ${fabColor} flex items-center justify-center`}>
                 <MicrophoneIcon className="w-12 h-12 text-black"/>
              </div>
              {state === CoPilotState.Listening && <div className={`absolute inset-0 rounded-full ring-4 ${ringColor} animate-ping`}></div>}
            </div>

            <p className="text-lg text-gray-400 mb-2">{getStatusText()}</p>
            <p className="text-xl text-white min-h-[56px] px-4">{aiResponse}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default CoPilot;
