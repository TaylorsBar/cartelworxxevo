
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { decode, decodeAudioData } from '../utils/audioUtils';

let genAI: GoogleGenerativeAI | null = null;
const getAi = () => {
    if (!genAI) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("VITE_GEMINI_API_KEY not found for speech service");
            return null;
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export const generateSpeech = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
    const gemini = getAi();
    if (!gemini || !text.trim()) {
        return null;
    }

    try {
        const model = gemini.getGenerativeModel({ model: "text-to-speech" });

        const result = await model.generateContent({
            contents: [{ parts: [{ text }], role: "user" }],
        });

        // As of the latest SDK, the audio is not directly in the response.
        // This is a placeholder for how you might handle it if the API changes
        // or if you are using a different library/method to get the audio.
        // You would typically get a URL or raw audio data.

        // The following is a mock implementation
        const base64Audio = ""; // You would get this from the actual response
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
