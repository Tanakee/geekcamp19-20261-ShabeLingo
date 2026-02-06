import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signInAsGuest: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // ルーティングの保護 (Redirect Logic)
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)'; // もし(auth)グループを使うなら
    // 今回は app/login.tsx と app/index.tsx 等のフラット構造を想定
    
    // 現在のルートが login かどうか判別
    // segments は配列。例: ["login"] や ["index"]
    const inLoginScreen = segments[0] === 'login';

    if (!user && !inLoginScreen) {
      // ログインしていないのにログイン画面以外にいる場合 -> ログインへ
      router.replace('/login');
    } else if (user && inLoginScreen) {
      // ログインしているのにログイン画面にいる場合 -> ホームへ
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
