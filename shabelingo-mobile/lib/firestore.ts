import { 
  collection, 
  addDoc,
  updateDoc,
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  limit,
  Timestamp
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
  evaluationText?: string;
  meaning?: string;
}) => {
  try {
    // Remove undefined fields
    const cleanData: any = {
      userId,
      originalText: data.originalText,
      categoryIds: data.categoryIds,
      // SRS Defaults
      status: 'new',
      reviewCount: 0,
      easeFactor: 2.5,
      interval: 0,
      nextReviewDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add optional fields if they are defined
    if (data.audioUrl !== undefined) cleanData.audioUrl = data.audioUrl;
    if (data.imageUrl !== undefined) cleanData.imageUrl = data.imageUrl;
    if (data.note !== undefined) cleanData.note = data.note;
    if (data.language !== undefined) cleanData.language = data.language;
    if (data.evaluationText !== undefined) cleanData.evaluationText = data.evaluationText;
    if (data.meaning !== undefined) cleanData.meaning = data.meaning;

    await addDoc(memosRef, cleanData);
  } catch (error) {
    console.error('Error adding memo:', error);
    throw error;
  }
};

export const updateMemo = async (memoId: string, data: {
  originalText?: string;
  categoryIds?: string[];
  audioUrl?: string;
  imageUrl?: string;
  note?: string;
  language?: SupportedLanguage;
  evaluationText?: string;
}) => {
  try {
    const cleanData: any = {
      updatedAt: serverTimestamp(),
    };

    // Only add fields that are defined
    if (data.originalText !== undefined) cleanData.originalText = data.originalText;
    if (data.categoryIds !== undefined) cleanData.categoryIds = data.categoryIds;
    if (data.audioUrl !== undefined) cleanData.audioUrl = data.audioUrl;
    if (data.imageUrl !== undefined) cleanData.imageUrl = data.imageUrl;
    if (data.note !== undefined) cleanData.note = data.note;
    if (data.language !== undefined) cleanData.language = data.language;
    if (data.evaluationText !== undefined) cleanData.evaluationText = data.evaluationText;

    const memoRef = doc(db, 'memos', memoId);
    await updateDoc(memoRef, cleanData);
  } catch (error) {
    console.error('Error updating memo:', error);
    throw error;
  }
};


export const deleteMemo = async (memoId: string) => {
  try {
    const ref = doc(db, 'memos', memoId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting memo:', error);
    throw error;
  }
};

// --- SRS / Review Functions ---

import { SRSResult } from './srs';

export const updateMemoSRS = async (memoId: string, result: SRSResult) => {
  try {
    const memoRef = doc(db, 'memos', memoId);
    
    // Convert timestamp number to Firestore Timestamp
    const nextReviewTimestamp = Timestamp.fromMillis(result.nextReviewDate);
    
    await updateDoc(memoRef, {
      status: 'review', // Always 'review' or 'remembered' if implemented
      interval: result.interval,
      easeFactor: result.easeFactor,
      reviewCount: result.reviewCount,
      nextReviewDate: nextReviewTimestamp,
      lastReviewDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating SRS:', error);
    throw error;
  }
};

/**
 * Get memos due for review (nextReviewDate <= now)
 */
export const getDueMemos = async (userId: string, limitCount = 20) => {
  try {
    const q = query(
      memosRef,
      where('userId', '==', userId),
      where('nextReviewDate', '<=', Timestamp.now()),
      orderBy('nextReviewDate', 'asc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Timestamps
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
      nextReviewDate: doc.data().nextReviewDate?.toMillis ? doc.data().nextReviewDate.toMillis() : doc.data().nextReviewDate,
    }));
  } catch (error) {
    console.error('Error getting due memos:', error);
    throw error;
  }
};

/**
 * Get new memos (status == 'new')
 */
export const getNewMemos = async (userId: string, limitCount = 10) => {
  try {
    const q = query(
      memosRef,
      where('userId', '==', userId),
      where('status', '==', 'new'),
      orderBy('createdAt', 'asc'), // Learn oldest first
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
      nextReviewDate: doc.data().nextReviewDate?.toMillis ? doc.data().nextReviewDate.toMillis() : doc.data().nextReviewDate,
    }));
  } catch (error) {
    console.error('Error getting new memos:', error);
    throw error;
  }
};

/**
 * Get memos for random review
 * To avoid complex index requirements, we fetch a batch of memos ordered by updatedAt
 * and shuffle them client-side. We randomly switch between ASC and DESC to get variety.
 */
export const getRandomReviewMemos = async (userId: string, limitCount = 10) => {
  try {
    // To avoid creating a composite index, we remove orderBy.
    // This will fetch documents in default order (ID order).
    // We fetch a batch and shuffle client-side.
    const q = query(
      memosRef,
      where('userId', '==', userId),
      limit(50) 
    );
    
    const snapshot = await getDocs(q);
    let memos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
      nextReviewDate: doc.data().nextReviewDate?.toMillis ? doc.data().nextReviewDate.toMillis() : doc.data().nextReviewDate,
    }));

    // Filter client-side to avoid index issues with '!=' query
    // Exclude 'new' items (status !== 'new')
    memos = memos.filter((m: any) => m.status !== 'new');

    // Shuffle client side
    return memos.sort(() => Math.random() - 0.5).slice(0, limitCount);
  } catch (error) {
    console.error('Error getting random review memos:', error);
    return [];
  }
};
