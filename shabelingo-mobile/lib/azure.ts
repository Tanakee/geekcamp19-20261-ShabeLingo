import { Buffer } from 'buffer';
import { SupportedLanguage } from '../types';

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

export const assessPronunciation = async (audioUri: string, referenceText: string, language: SupportedLanguage = 'en-US'): Promise<AssessmentResult | null> => {
  if (!API_KEY || !REGION) {
    throw new Error('Azure API Key or Region not set');
  }

  // language parameter is used in the query string
  console.log(`[Azure] Starting Assessment. RefText: "${referenceText}", Lang: ${language}`);
  
  const endpoint = `https://${REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}&format=detailed`;

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

    console.log(`Sending audio to Azure (${language})...`, endpoint);
    
    // Use standard fetch instead of expo-file-system
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers as any, // HeadersInit type compatibility
        body: audioBlob,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure API Error Body:', errorText);
        
        if (response.status === 400 && errorText.includes('Format')) {
             throw new Error(`Azure API rejected audio format. Status ${response.status}: ${errorText}`);
        }
        
        throw new Error(`Azure API failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Azure Response:', JSON.stringify(data, null, 2));

    if (data.NBest && data.NBest.length > 0) {
        const bestResult = data.NBest[0];
        // Sometimes scores are nested in PronunciationAssessment, sometimes directly in the result object depending on API version/params
        const assessment = bestResult.PronunciationAssessment || bestResult;
        const words = bestResult.Words;
        
        // Ensure PronScore exists and is a number
        if (assessment && typeof assessment.PronScore === 'number') {
             return { 
                 AccuracyScore: assessment.AccuracyScore,
                 FluencyScore: assessment.FluencyScore,
                 CompletenessScore: assessment.CompletenessScore,
                 PronScore: assessment.PronScore,
                 Words: words 
             };
        }
    }
    
    console.warn('Azure Response did not contain valid assessment data:', JSON.stringify(data));
    return null;

  } catch (error) {
    console.error('Assessment failed:', error);
    throw error;
  }
};
