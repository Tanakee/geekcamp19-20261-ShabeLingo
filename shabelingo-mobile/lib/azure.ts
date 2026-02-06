import { Buffer } from 'buffer';

const API_KEY = process.env.EXPO_PUBLIC_AZURE_SPEECH_KEY;
const REGION = process.env.EXPO_PUBLIC_AZURE_SPEECH_REGION;

export interface AssessmentResult {
  AccuracyScore: number;
  FluencyScore: number;
  CompletenessScore: number;
  PronScore: number;
  Words?: Array<{
    Word: string;
    AccuracyScore: number;
    ErrorType: string;
  }>;
}

export const assessPronunciation = async (audioUri: string, referenceText: string): Promise<AssessmentResult | null> => {
  if (!API_KEY || !REGION) {
    throw new Error('Azure API Key or Region not set');
  }

  const endpoint = `https://${REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

  const pronunciationParams = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Word',
    Dimension: 'Comprehensive'
  };

  // Base64 encode params
  // Buffer is standard in Node/some environments, but in RN usually needs a polyfill or package. 
  // If 'buffer' package is installed and imported, it should work.
  const paramJson = JSON.stringify(pronunciationParams);
  const paramBase64 = Buffer.from(paramJson).toString('base64');

  const headers = {
    'Ocp-Apim-Subscription-Key': API_KEY,
    'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
    'Accept': 'application/json',
    'Pronunciation-Assessment': paramBase64
  };

  try {
    console.log('Reading audio file...');
    const fileResp = await fetch(audioUri);
    const audioBlob = await fileResp.blob();

    console.log('Sending audio to Azure...', endpoint);
    
    // Use standard fetch instead of expo-file-system
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers as any, // HeadersInit type compatibility
        body: audioBlob,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure API Error Body:', errorText);
        throw new Error(`Azure API failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Azure Response:', JSON.stringify(data, null, 2));

    if (data.NBest && data.NBest.length > 0) {
        const assessment = data.NBest[0].PronunciationAssessment;
        const words = data.NBest[0].Words;
        return { ...assessment, Words: words };
    }
    
    return null;

  } catch (error) {
    console.error('Assessment failed:', error);
    throw error;
  }
};
