export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

export type ReviewStatus = 'new' | 'learning' | 'review' | 'remembered';

export type SupportedLanguage = 
  | 'en-US' | 'en-GB' | 'en-AU' 
  | 'zh-CN' | 'zh-TW' 
  | 'es-ES' | 'es-MX' 
  | 'fr-FR' | 'fr-CA'
  | 'de-DE' 
  | 'it-IT' 
  | 'ja-JP' 
  | 'ko-KR' 
  | 'pt-BR' | 'pt-PT'
  | 'ru-RU' 
  | 'ar-SA' 
  | 'hi-IN' 
  | 'th-TH' 
  | 'vi-VN' 
  | 'id-ID' 
  | 'tr-TR' 
  | 'pl-PL' 
  | 'nl-NL' 
  | 'sv-SE';

export const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-AU', label: 'English (AU)', flag: '🇦🇺' },
  { code: 'zh-CN', label: '中文 (简体)', flag: '🇨🇳' },
  { code: 'zh-TW', label: '中文 (繁體)', flag: '🇹🇼' },
  { code: 'es-ES', label: 'Español (ES)', flag: '🇪🇸' },
  { code: 'es-MX', label: 'Español (MX)', flag: '🇲🇽' },
  { code: 'fr-FR', label: 'Français (FR)', flag: '🇫🇷' },
  { code: 'fr-CA', label: 'Français (CA)', flag: '🇨🇦' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'Português (PT)', flag: '🇵🇹' },
  { code: 'ru-RU', label: 'Русский', flag: '🇷🇺' },
  { code: 'ar-SA', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi-IN', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'th-TH', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi-VN', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id-ID', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'tr-TR', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl-PL', label: 'Polski', flag: '🇵🇱' },
  { code: 'nl-NL', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv-SE', label: 'Svenska', flag: '🇸🇪' },
];

export interface Memo {
  id: string;
  userId: string;
  originalText: string;    // 学習したい外国語の単語・フレーズ
  translatedText?: string; // 翻訳・意味
  note?: string;           // 自由記述メモ
  
  // メディア
  audioUrl?: string;       // 録音データURL (Storageパス)
  imageUrl?: string;       // 画像URL (Storageパス)
  
  // 言語 (New)
  language?: SupportedLanguage;
  evaluationText?: string; // 発音評価用の正しいスペル (例: original="はろー", evaluation="Hello")

  // 分類
  categoryIds: string[];   // 複数のカテゴリーに属せるように配列
  tags?: string[];
  
  // 復習・SRS関連
  status: ReviewStatus;
  nextReviewDate: number;  // Unix timestamp
  lastReviewDate?: number; // Unix timestamp
  reviewCount: number;     // 復習回数
  easeFactor: number;      // 難易度係数 (初期値: 2.5)
  interval: number;        // 次回までの間隔(日)
  
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color?: string;          // 表示色
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
}

// 発音評価の結果型 (Azure APIレスポンス用)
export interface PronunciationResult {
  score: number;           // 0-100
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  prosodyScore: number;
  words: {
    word: string;
    accuracyScore: number;
    errorType?: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
  }[];
}
