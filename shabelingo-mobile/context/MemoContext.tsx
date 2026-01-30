import React, { createContext, useContext, useState, useEffect } from "react";
import { Memo, MOCK_MEMOS } from "../lib/mockData";

interface MemoContextType {
  memos: Memo[];
  addMemo: (memo: Omit<Memo, "id" | "createdAt" | "updatedAt">) => void;
}

const MemoContext = createContext<MemoContextType | undefined>(undefined);

export const MemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    // Load initial data
    setMemos(MOCK_MEMOS);
  }, []);

  const addMemo = (newMemoData: Omit<Memo, "id" | "createdAt" | "updatedAt">) => {
    const newMemo: Memo = {
      ...newMemoData,
      id: Math.random().toString(36).substring(7), // crypto.randomUUID not always avail in bare JS engines without polyfill
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setMemos((prev) => [newMemo, ...prev]);
  };

  return (
    <MemoContext.Provider value={{ memos, addMemo }}>
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
