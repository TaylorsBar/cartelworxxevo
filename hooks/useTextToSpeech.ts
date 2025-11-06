
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpeech } from '../services/speechService';

export const useTextToSpeech = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        return audioContextRef.current;
    }, []);

    const cancel = useCallback(() => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore errors if the source has already stopped
            }
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        setIsSpeaking(false);
    }, []);

    const speak = useCallback(async (text: string) => {
        if (isSpeaking || !text.trim()) {
            return;
        }
        cancel();
        setIsSpeaking(true);

        try {
            const audioContext = getAudioContext();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const audioBuffer = await generateSpeech(text, audioContext);

            if (audioBuffer) {
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => {
                    setIsSpeaking(false);
                    sourceNodeRef.current = null;
                };
                source.start();
                sourceNodeRef.current = source;
            } else {
                setIsSpeaking(false); // Failed to generate speech
            }
        } catch (error) {
            console.error("Error in speak function:", error);
            setIsSpeaking(false);
        }
    }, [isSpeaking, cancel, getAudioContext]);

    useEffect(() => {
        return () => {
            cancel();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [cancel]);

    return { isSpeaking, speak, cancel };
};
