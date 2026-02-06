export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

export type ReviewStatus = 'new' | 'learning' | 'review' | 'remembered';

export type SupportedLanguage = 'en-US' | 'zh-CN' | 'es-ES' | 'fr-FR' | 'ja-JP';

export const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳' },
  { code: 'es-ES', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', label: 'French', flag: '🇫🇷' },
  { code: 'ja-JP', label: 'Japanese', flag: '🇯🇵' },
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
