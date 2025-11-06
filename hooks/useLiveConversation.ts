import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
};

export const useLiveConversation = () => {
    const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
    const [userTranscript, setUserTranscript] = useState('');
    const [aiTranscript, setAiTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioInfrastructureRef = useRef<{
        inputAudioContext: AudioContext;
        outputAudioContext: AudioContext;
        mediaStream: MediaStream | null;
        scriptProcessor: ScriptProcessorNode | null;
        sourceNode: MediaStreamAudioSourceNode | null;
        nextStartTime: number;
        sources: Set<AudioBufferSourceNode>;
    } | null>(null);
    
    const cleanup = useCallback(() => {
        if (audioInfrastructureRef.current) {
            const { inputAudioContext, outputAudioContext, scriptProcessor, sourceNode, mediaStream } = audioInfrastructureRef.current;
            
            mediaStream?.getTracks().forEach(track => track.stop());

            if (scriptProcessor) {
                scriptProcessor.disconnect();
                scriptProcessor.onaudioprocess = null;
            }
            if (sourceNode) sourceNode.disconnect();
            if (inputAudioContext.state !== 'closed') inputAudioContext.close();
            if (outputAudioContext.state !== 'closed') outputAudioContext.close();
        }
        audioInfrastructureRef.current = null;
        setConnectionState('DISCONNECTED');
    }, []);

    const disconnect = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            } finally {
                sessionPromiseRef.current = null;
                cleanup();
            }
        }
    }, [cleanup]);

    const connect = useCallback(async () => {
        if (sessionPromiseRef.current) return;

        setConnectionState('CONNECTING');
        setError(null);
        let currentInput = '';
        let currentOutput = '';
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioInfrastructureRef.current = {
                inputAudioContext,
                outputAudioContext,
                mediaStream,
                scriptProcessor: null,
                sourceNode: null,
                nextStartTime: 0,
                sources: new Set(),
            };

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!audioInfrastructureRef.current) return;
                        setConnectionState('CONNECTED');
                        const source = inputAudioContext.createMediaStreamSource(mediaStream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                        
                        audioInfrastructureRef.current.sourceNode = source;
                        audioInfrastructureRef.current.scriptProcessor = scriptProcessor;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInput += message.serverContent.inputTranscription.text;
                            setUserTranscript(currentInput);
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutput += message.serverContent.outputTranscription.text;
                            setAiTranscript(currentOutput);
                        }
                        if (message.serverContent?.turnComplete) {
                            currentInput = '';
                            currentOutput = '';
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && audioInfrastructureRef.current) {
                            const { outputAudioContext, sources } = audioInfrastructureRef.current;
                            let { nextStartTime } = audioInfrastructureRef.current;
                            
                            nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            source.addEventListener('ended', () => sources.delete(source));
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                            sources.add(source);
                            audioInfrastructureRef.current.nextStartTime = nextStartTime;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        const lowerCaseMessage = e.message.toLowerCase();
                        let errorMessage = 'A connection error occurred during the session.';
                        if (lowerCaseMessage.includes('network error') || lowerCaseMessage.includes('failed to fetch')) {
                            errorMessage = 'Network connection lost during the live session. Please check your internet connection.';
                        } else if (e.message) {
                            errorMessage = `An error occurred during the session: ${e.message}`;
                        }
                        setError(errorMessage);
                        setConnectionState('ERROR');
                        disconnect();
                    },
                    onclose: () => {
                        disconnect();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: `You are KC (Karapiro Cartel), a master diagnostic technician and race engineer for the 'CartelWorx' app. The user is an enthusiast who needs expert, in-depth guidance. Provide detailed, step-by-step diagnostic procedures, explain complex mechanical concepts clearly, and offer workshop-level advice. Your tone is that of a seasoned, authoritative, and helpful expert. You are capable of walking a user through anything from a simple fault code diagnosis to a complex engine teardown.`,
                },
            });
            sessionPromiseRef.current = sessionPromise;
        } catch (e) {
            console.error('Failed to connect:', e);
            let friendlyError = 'Failed to initialize session.';
            if (e instanceof DOMException && e.name === 'NotAllowedError') {
                friendlyError = "Microphone permission denied. Please enable it in your browser settings to use this feature.";
            } else if (e instanceof Error) {
                const lowerCaseMessage = e.message.toLowerCase();
                if (lowerCaseMessage.includes('network error') || lowerCaseMessage.includes('failed to fetch')) {
                    friendlyError = 'Failed to connect to live AI services. Please check your internet connection.';
                } else {
                    friendlyError = e.message;
                }
            }
            setError(friendlyError);
            setConnectionState('ERROR');
            cleanup();
        }
    }, [disconnect, cleanup]);
    
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return { connectionState, userTranscript, aiTranscript, error, connect, disconnect };
};