import { SupportedLanguage } from '../types';

const TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';
const TRANSLATOR_KEY = process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_KEY || '';
const TRANSLATOR_REGION = process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_REGION || 'japaneast';

/**
 * Azure Translator APIを使用してテキストを翻訳
 * @param text 翻訳するテキスト
 * @param targetLanguage 翻訳先の言語コード
 * @param sourceLanguage 翻訳元の言語コード（デフォルト: ja）
 * @returns 翻訳されたテキスト
 */
export async function translateText(
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage: string = 'ja'
): Promise<string | null> {
  if (!TRANSLATOR_KEY) {
    console.error('Azure Translator API key is not set');
    return null;
  }

  if (!text.trim()) {
    return null;
  }

  try {
    // Azure Translator APIは言語コードの形式が異なる場合がある
    // 例: ko-KR -> ko, zh-CN -> zh-Hans
    const targetLang = convertToTranslatorLanguageCode(targetLanguage);
    
    const url = `${TRANSLATOR_ENDPOINT}/translate?api-version=3.0&from=${sourceLanguage}&to=${targetLang}`;
    
    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
      'Content-Type': 'application/json',
    };

    if (TRANSLATOR_REGION && TRANSLATOR_REGION !== 'global') {
        headers['Ocp-Apim-Subscription-Region'] = TRANSLATOR_REGION;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ text }]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        console.error('Translation API authentication failed. Please check your Azure Translator API key and region in .env file.');
        console.error('Current key:', TRANSLATOR_KEY ? `${TRANSLATOR_KEY.substring(0, 10)}...` : 'NOT SET');
        console.error('Current region:', TRANSLATOR_REGION);
      }
      console.error('Translation API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0 && data[0].translations && data[0].translations.length > 0) {
      return data[0].translations[0].text;
    }

    return null;
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
}

/**
 * SupportedLanguageをAzure Translator APIの言語コードに変換
 */
function convertToTranslatorLanguageCode(language: SupportedLanguage): string {
  const mapping: Record<string, string> = {
    'en-US': 'en',
    'en-GB': 'en',
    'en-AU': 'en',
    'zh-CN': 'zh-Hans',
    'zh-TW': 'zh-Hant',
    'es-ES': 'es',
    'es-MX': 'es',
    'fr-FR': 'fr',
    'fr-CA': 'fr',
    'de-DE': 'de',
    'it-IT': 'it',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'pt-BR': 'pt',
    'pt-PT': 'pt',
    'ru-RU': 'ru',
    'ar-SA': 'ar',
    'hi-IN': 'hi',
    'th-TH': 'th',
    'vi-VN': 'vi',
    'id-ID': 'id',
    'tr-TR': 'tr',
    'pl-PL': 'pl',
    'nl-NL': 'nl',
    'sv-SE': 'sv',
    'fil-PH': 'fil',
  };

  return mapping[language] || language.split('-')[0];
}

/**
 * テキストをローマ字に音訳する
 */
export async function getRomanization(text: string, language: SupportedLanguage): Promise<string | null> {
  if (!text.trim()) return null;

  const langCode = convertToTranslatorLanguageCode(language);
  const script = getScriptCode(langCode);
  
  // スクリプトコードがない（ラテン文字など）場合は音訳不要
  if (!script) return null;

  try {
    const url = `${TRANSLATOR_ENDPOINT}/transliterate?api-version=3.0&language=${langCode}&fromScript=${script}&toScript=Latn`;
    
    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
      'Content-Type': 'application/json',
    };

    if (TRANSLATOR_REGION && TRANSLATOR_REGION !== 'global') {
        headers['Ocp-Apim-Subscription-Region'] = TRANSLATOR_REGION;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ text }]),
    });

    if (!response.ok) {
      console.error('Transliteration API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0 && data[0].text) {
      return data[0].text;
    }
    return null;
  } catch (error) {
    console.error('Transliteration error:', error);
    return null;
  }
}

function getScriptCode(langCode: string): string | null {
  const map: Record<string, string> = {
    'ja': 'Jpan',
    'ko': 'Kore',
    'zh-Hans': 'Hans',
    'zh-Hant': 'Hant',
    'th': 'Thai',
    'ar': 'Arab',
    'hi': 'Deva', // Devanagari
    'ru': 'Cyrl', // Cyrillic
    // Add others if needed
  };
  return map[langCode] || null;
}
