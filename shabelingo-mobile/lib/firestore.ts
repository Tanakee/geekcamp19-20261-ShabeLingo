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
import { Category, User, SupportedLanguage } from '../types';

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
    const docRef = await addDoc(categoriesRef, {
      userId,
      name,
      color: color || '#9d4edd', // Default color
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
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
    const memos = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Timestamp to number conversion for UI usage
        createdAt: data.createdAt?.toMillis() || Date.now(),
        updatedAt: data.updatedAt?.toMillis() || Date.now(),
        nextReviewDate: data.nextReviewDate?.toMillis ? data.nextReviewDate.toMillis() : (data.nextReviewDate || Date.now()),
      };
    });
    callback(memos);
  });
};

export const addMemo = async (userId: string, data: {
  originalText: string;
  categoryIds: string[];
  audioUrl?: string;
  imageUrl?: string;
  note?: string;
  language?: SupportedLanguage;
}) => {
  try {
    await addDoc(memosRef, {
      userId,
      ...data,
      // SRS Defaults
      status: 'new',
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReviewDate: serverTimestamp(), // Initially review immediately/now
      
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding memo:', error);
    throw error;
  }
};
