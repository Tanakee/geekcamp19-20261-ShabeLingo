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
