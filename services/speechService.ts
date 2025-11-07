
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audioUtils';

let ai: GoogleGenAI | null = null;
const getAi = () => {
    if (!ai) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("VITE_GEMINI_API_KEY not found for speech service");
            return null;
        }
        ai = new GoogleGenAI(apiKey);
    }
    return ai;
}

export const generateSpeech = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
    const gemini = getAi();
    if (!gemini || !text.trim()) {
        return null;
    }

    try {
        const response = await gemini.models.generateContent({
            model: "gemini-1.5-flash-latest",
            contents: [{ parts: [{ text }] }],
            // The following fields are not part of the public API and may change.
            // @ts-ignore
            generationConfig: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.response.candidates[0].content.parts[0].inlineData.data;
        if (base64Audio) {
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
            return audioBuffer;
        }
        return null;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};
