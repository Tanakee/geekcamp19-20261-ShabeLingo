import React, { createContext, useContext, useState, useEffect } from "react";
import { Memo } from "../types";
import { useAuth } from "./AuthContext";
import { subscribeMemos, addMemo as firestoreAddMemo } from "../lib/firestore";

interface MemoContextType {
  memos: Memo[];
  addMemo: (memoData: {
    text: string;
    category: string;
    audioUrl?: string;
    imageUrl?: string;
    transcription?: string;
  }) => Promise<void>;
  loading: boolean;
}

const MemoContext = createContext<MemoContextType | undefined>(undefined);

export const MemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMemos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeMemos(user.uid, (data) => {
      setMemos(data as Memo[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addMemo = async (memoData: {
    text: string;
    category: string;
    audioUrl?: string;
    imageUrl?: string;
    transcription?: string;
  }) => {
    if (!user) return;

    await firestoreAddMemo(user.uid, {
      originalText: memoData.text,
      categoryIds: [memoData.category], // 単一IDを配列化
      audioUrl: memoData.audioUrl,
      imageUrl: memoData.imageUrl,
      note: memoData.transcription,
    });
  };

  return (
    <MemoContext.Provider value={{ memos, addMemo, loading }}>
      {children}
    </MemoContext.Provider>
  );
};

export const useMemoContext = () => {
  const context = useContext(MemoContext);
  if (!context) {
    throw new Error("useMemoContext must be used within a MemoProvider");
  }
  return context;
};
