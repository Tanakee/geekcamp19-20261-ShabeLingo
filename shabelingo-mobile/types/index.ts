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
  | 'sv-SE'
  | 'fil-PH';

export const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en-US', label: '英語 (アメリカ)', flag: '🇺🇸' },
  { code: 'en-GB', label: '英語 (イギリス)', flag: '🇬🇧' },
  { code: 'en-AU', label: '英語 (オーストラリア)', flag: '🇦🇺' },
  { code: 'zh-CN', label: '中国語 (簡体字)', flag: '🇨🇳' },
  { code: 'zh-TW', label: '中国語 (繁体字)', flag: '🇹🇼' },
  { code: 'es-ES', label: 'スペイン語 (スペイン)', flag: '🇪🇸' },
  { code: 'es-MX', label: 'スペイン語 (メキシコ)', flag: '🇲🇽' },
  { code: 'fr-FR', label: 'フランス語 (フランス)', flag: '🇫🇷' },
  { code: 'fr-CA', label: 'フランス語 (カナダ)', flag: '🇨🇦' },
  { code: 'de-DE', label: 'ドイツ語', flag: '🇩🇪' },
  { code: 'it-IT', label: 'イタリア語', flag: '🇮🇹' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', label: '韓国語', flag: '🇰🇷' },
  { code: 'pt-BR', label: 'ポルトガル語 (ブラジル)', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'ポルトガル語 (ポルトガル)', flag: '🇵🇹' },
  { code: 'ru-RU', label: 'ロシア語', flag: '🇷🇺' },
  { code: 'ar-SA', label: 'アラビア語', flag: '🇸🇦' },
  { code: 'hi-IN', label: 'ヒンディー語', flag: '🇮🇳' },
  { code: 'th-TH', label: 'タイ語', flag: '🇹🇭' },
  { code: 'vi-VN', label: 'ベトナム語', flag: '🇻🇳' },
  { code: 'id-ID', label: 'インドネシア語', flag: '🇮🇩' },
  { code: 'tr-TR', label: 'トルコ語', flag: '🇹🇷' },
  { code: 'pl-PL', label: 'ポーランド語', flag: '🇵🇱' },
  { code: 'nl-NL', label: 'オランダ語', flag: '🇳🇱' },
  { code: 'sv-SE', label: 'スウェーデン語', flag: '🇸🇪' },
  { code: 'fil-PH', label: 'タガログ語', flag: '🇵🇭' },
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
  evaluationText?: string; // 発音評価用の正しいスペル (例: original="annyeonghaseyo", evaluation="안녕하세요")
  meaning?: string;        // 日本語の意味 (例: "こんにちは")

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
