import React, { createContext, useContext, useState, useEffect } from "react";
import { Memo } from "../types";
import { subscribeMemos, addMemo as firestoreAddMemo } from "../lib/firestore";
import { useAuth } from "./AuthContext";

interface MemoContextType {
  memos: Memo[];
  addMemo: (memoData: {
    originalText: string;
    categoryIds: string[];
    audioUrl?: string;
    imageUrl?: string;
    transcription?: string; // noteとして保存するか、transcriptionフィールドを作るか。今回は note にマッピング
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
      // firestore.ts からは any[] で返ってくるが、中身は Memo に近い
      // 必要があれば型アーションや変換を行う
      setMemos(data as Memo[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addMemo = async (memoData: {
    originalText: string;
    categoryIds: string[];
    audioUrl?: string;
    imageUrl?: string;
    transcription?: string;
  }) => {
    if (!user) return; // あるいはエラーを投げる

    // create.tsx から渡される transcription を note として扱う、等のマッピング
    await firestoreAddMemo(user.uid, {
      originalText: memoData.originalText,
      categoryIds: memoData.categoryIds,
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
