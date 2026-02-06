import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { Category, User } from '../types';

// コレクション参照
const categoriesRef = collection(db, 'categories');

// --- Category Functions ---

/**
 * ユーザーのカテゴリー一覧をリアルタイム監視するフック的な関数
 * (Reactコンポーネント内で useEffect と組み合わせて使う想定)
 */
export const subscribeCategories = (userId: string, callback: (categories: Category[]) => void) => {
  const q = query(
    categoriesRef, 
    where('userId', '==', userId),
    orderBy('createdAt', 'asc') // 作成順
  );

  return onSnapshot(q, (snapshot) => {
    const categories: Category[] = [];
    snapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() } as Category);
    });
    callback(categories);
  });
};

/**
 * 新しいカテゴリーを追加する
 */
export const addCategory = async (userId: string, name: string, color?: string) => {
  try {
    // 同じ名前のカテゴリーがないかチェック（オプション）
    // 今回は簡易実装のため重複チェックは省略またはUI側で行う

    await addDoc(categoriesRef, {
      userId,
      name,
      color: color || '#9d4edd', // Default color
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

/**
 * カテゴリーを削除する
 */
export const deleteCategory = async (categoryId: string) => {
  try {
    const ref = doc(db, 'categories', categoryId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// --- Memo Functions ---

const memosRef = collection(db, 'memos');

export const subscribeMemos = (userId: string, callback: (memos: any[]) => void) => {
  const q = query(
    memosRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const memos: any[] = [];
    snapshot.forEach((doc) => {
      // id と data を結合。
      // FirestoreのTimestampはDateに変換するか、数値(Unix Time)にするか要検討
      // types/index.ts Definition uses number (Unix timestamp)
      // ここではとりあえず raw data を返し、利用側で整形するか、ヘルパーで変換する
      // 簡易のため、FirestoreのTimestamp型が含まれる場合は toMillis() などで変換して返す
      const data = doc.data();
      memos.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
        nextReviewDate: data.nextReviewDate?.toMillis ? data.nextReviewDate.toMillis() : data.nextReviewDate,
        lastReviewDate: data.lastReviewDate?.toMillis ? data.lastReviewDate.toMillis() : data.lastReviewDate,
      });
    });
    callback(memos);
  });
};

export const addMemo = async (userId: string, memoData: {
  originalText: string;
  categoryIds: string[];
  audioUrl?: string;
  imageUrl?: string;
  note?: string; 
}) => {
  try {
    await addDoc(memosRef, {
      userId,
      ...memoData,
      status: 'new',
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReviewDate: serverTimestamp(), // すぐ復習対象にするか、明日か？ とりあえず現在時刻
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding memo:', error);
    throw error;
  }
};

