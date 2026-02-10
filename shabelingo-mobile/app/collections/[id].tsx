import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ActivityIndicator, ScrollView, SafeAreaView, Share, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Collection, Memo } from '../../types';
import { getCollectionMemos, addMemosToCollection, removeMemosFromCollection, createSharedCollection } from '../../lib/collections';
import { subscribeMemos } from '../../lib/firestore'; 
import { Colors, Layout } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Plus, Share2, X, Check, Copy } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Memo Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [allMemos, setAllMemos] = useState<Memo[]>([]);
  const [selectedMemoIds, setSelectedMemoIds] = useState<Set<string>>(new Set());

  // Share Modal
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    
    // Subscribe to collection doc
    const unsub = onSnapshot(doc(db, 'collections', id), (snap) => {
      if (snap.exists()) {
        setCollection({ id: snap.id, ...snap.data() } as Collection);
      } else {
        router.back();
      }
    });

    // Load actual memo data
    loadMemos();

    return () => unsub();
  }, [user, id]);

  const loadMemos = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getCollectionMemos(id);
      setMemos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  // Reload memos when collection.memoIds changes
  useEffect(() => {
      if (collection) {
          loadMemos();
      }
  }, [collection?.memoIds]); 

  // Fetch all memos for selection
  useEffect(() => {
     if (!user || !addModalVisible) return;
     const unsub = subscribeMemos(user.uid, (data) => {
         setAllMemos(data);
     });
     return () => unsub();
  }, [user, addModalVisible]);

  const handleAddMemos = async () => {
    if (!id || selectedMemoIds.size === 0) return;
    try {
      await addMemosToCollection(id, Array.from(selectedMemoIds));
      setAddModalVisible(false);
      setSelectedMemoIds(new Set());
    } catch (e) {
      Alert.alert('Error', 'Failed to add memos');
    }
  };

  const handleRemoveMemo = async (memoId: string) => {
    if (!id) return;
    try {
      await removeMemosFromCollection(id, [memoId]);
      // Firestore listener will update list
    } catch (e) {
      Alert.alert('Error', 'Failed to remove memo');
    }
  };

  const toggleSelection = (memoId: string) => {
    const next = new Set(selectedMemoIds);
    if (next.has(memoId)) next.delete(memoId);
    else next.add(memoId);
    setSelectedMemoIds(next);
  };

  const handleCreateShare = async () => {
    if (!id || !user) return;
    try {
        setSharing(true);
        const curSharedId = await createSharedCollection(id, user.uid);
        setSharedId(curSharedId);
        setShareModalVisible(true);
    } catch (e) {
        Alert.alert('Error', 'Failed to create share link');
    } finally {
        setSharing(false);
    }
  };

  const shareLink = sharedId 
    ? Linking.createURL(`share/c/${sharedId}`) 
    : '';

  const handleSystemShare = async () => {
      if (!shareLink) return;
      try {
          await Share.share({
              message: `Check out my phrase collection on ShabeLingo! ${shareLink}`,
              url: shareLink,
          });
      } catch (e) {
          console.error(e);
      }
  };

  if (!collection) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background }]}>
         <Stack.Screen options={{ title: '', headerBackTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: Colors.background } }} />
         <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
            headerShown: true,
            headerTitle: () => (
                <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, { fontSize: 16 }]}>{collection.title}</Text>
                    <Text style={styles.headerSub}>{memos.length} items</Text>
                </View>
            ),
            headerRight: () => (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    icon={<Share2 size={24} color={Colors.primary} />} 
                    onPress={handleCreateShare} 
                    disabled={sharing}
                />
            ),
            headerBackTitle: '', // Hide "Collections" back text
            headerTintColor: Colors.foreground,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: Colors.background },
            contentStyle: { backgroundColor: Colors.background }
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        {collection.description ? (
            <Text style={styles.description}>{collection.description}</Text>
        ) : null}

        <Button 
            variant="secondary" 
            title="Add Memos" 
            icon={<Plus size={20} color={Colors.primary} />}
            onPress={() => setAddModalVisible(true)}
            style={{ marginBottom: 16 }}
        />

        {loading ? (
            <ActivityIndicator color={Colors.primary} />
        ) : memos.length === 0 ? (
            <Text style={styles.emptyText}>No memos in this collection.</Text>
        ) : (
            memos.map((memo) => (
                <View key={memo.id} style={styles.memoCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.memoOriginal}>{memo.originalText}</Text>
                        {(memo.meaning || memo.translatedText) && (
                            <Text style={styles.memoMeaning}>{memo.meaning || memo.translatedText}</Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveMemo(memo.id)}>
                        <X size={20} color={Colors.mutedForeground} />
                    </TouchableOpacity>
                </View>
            ))
        )}
      </ScrollView>

      {/* Add Memos Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAddModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }}>
            <View style={[styles.modalContainer, { paddingTop: 0 }]}>
                <View style={styles.modalHeader}>
                    <Button variant="ghost" title="Cancel" onPress={() => setAddModalVisible(false)} />
                    <Text style={styles.modalTitle}>Select Memos</Text>
                    <Button 
                        title={`Add (${selectedMemoIds.size})`} 
                        onPress={handleAddMemos} 
                        disabled={selectedMemoIds.size === 0}
                    />
                </View>
                <FlatList
                    data={allMemos.filter(m => !collection.memoIds.includes(m.id))} // Exclude already added
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.selectCard, selectedMemoIds.has(item.id) && styles.selectedCard]}
                            onPress={() => toggleSelection(item.id)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.memoOriginal}>{item.originalText}</Text>
                                <Text style={styles.memoMeaning}>{item.meaning || item.translatedText}</Text>
                            </View>
                            {selectedMemoIds.has(item.id) && <Check size={20} color={Colors.primary} />}
                        </TouchableOpacity>
                    )}
                />
            </View>
          </View>
      </Modal>

      {/* Share Modal */}
      <Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
          <View style={styles.overlay}>
              <View style={styles.dialog}>
                  <Text style={styles.dialogTitle}>Share Collection</Text>
                  
                  <View style={styles.qrContainer}>
                    {sharedId && (
                        <QRCode 
                            value={shareLink} 
                            size={200} 
                            color={Colors.foreground} 
                            backgroundColor={Colors.card}
                        />
                    )}
                  </View>
                  
                  <Text style={styles.linkText} selectable>{shareLink}</Text>
                  
                  <View style={styles.dialogActions}>
                      <Button variant="secondary" title="Copy Link" icon={<Copy size={16} color={Colors.foreground} />} onPress={() => {
                          Linking.openURL(shareLink); 
                      }} style={{ flex: 1 }} />
                      <Button variant="primary" title="Share via..." icon={<Share2 size={16} color="#fff" />} onPress={handleSystemShare} style={{ flex: 1 }} />
                  </View>
                  
                  <Button variant="ghost" title="Close" onPress={() => setShareModalVisible(false)} style={{ marginTop: 16 }} />
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  content: {
    padding: 16,
  },
  description: {
    color: Colors.mutedForeground,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  memoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: Layout.radius,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memoOriginal: {
    color: Colors.foreground,
    fontSize: 16,
    fontWeight: 'bold',
  },
  memoMeaning: {
    color: Colors.mutedForeground,
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.mutedForeground,
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedCard: {
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Layout.radius,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 12,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
