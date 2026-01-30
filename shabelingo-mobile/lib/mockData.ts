export interface Memo {
  id: string;
  text: string;
  transcription?: string;
  audioUrl?: string; // URI
  imageUrl?: string; // URI
  category: string;
  createdAt: number;
  updatedAt: number;
}

export const MOCK_MEMOS: Memo[] = [
  {
    id: "1",
    text: "Delicious",
    transcription: "Delicious",
    category: "Adjective",
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
  {
    id: "2",
    text: "Where is the station?",
    transcription: "Where is the station?",
    category: "Phrase",
    createdAt: Date.now() - 200000,
    updatedAt: Date.now() - 200000,
  },
];

export const CATEGORIES = ["Noun", "Verb", "Adjective", "Phrase", "Other"];
