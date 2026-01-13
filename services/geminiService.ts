
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VocabEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    phonetics: { type: Type.STRING, description: "IPA phonetics." },
    partOfSpeech: { type: Type.STRING, description: "Grammatical category." },
    vietnameseMeaning: { type: Type.STRING, description: "Vietnamese meanings, each on a new line." },
    example: { type: Type.STRING, description: "High-quality English example sentence." },
    didYouMean: { type: Type.STRING, description: "If the input is misspelled, provide the correct spelling. Otherwise, leave empty." }
  },
  required: ["phonetics", "partOfSpeech", "vietnameseMeaning", "example", "didYouMean"]
};

export async function fetchVocabDetails(input: string): Promise<Partial<VocabEntry & { didYouMean?: string }>> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Analyze this English input: "${input}". 
      1. Check if it's misspelled. If so, provide the correct word in 'didYouMean'.
      2. Provide IPA, part of speech, Vietnamese meaning, and a clear example sentence.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export async function speakVocab(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioContext, 24000);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
}
