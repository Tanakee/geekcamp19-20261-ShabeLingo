import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, SafeAreaView, Platform, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Plus, Trash2, Folder, ChevronRight, Share2, Play, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Collection } from '../../types';
import { subscribeCollections, createCollection, deleteCollection } from '../../lib/collections';
import { Colors, Layout } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';

export default function CollectionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeCollections(user.uid, (data) => {
      setCollections(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    
    try {
      setCreating(true);
      await createCollection(user.uid, newTitle, newDesc);
      setModalVisible(false);
      setNewTitle('');
      setNewDesc('');
    } catch (e) {
      Alert.alert('Error', 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'コレクション削除',
      `"${title}" を削除しますか？中のメモは削除されません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCollection(id);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete collection');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Collection }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/collections/${item.id}`)}
    >
      <View style={styles.cardIcon}>
        <Folder size={24} color={Colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <Text style={styles.cardCount}>{item.memoIds?.length || 0} memos</Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteBtn}
        onPress={(e) => {
            e.stopPropagation();
            handleDelete(item.id, item.title);
        }}
      >
        <Trash2 size={20} color={Colors.mutedForeground} />
      </TouchableOpacity>
      <ChevronRight size={20} color={Colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Collections',
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.background },
          headerBackTitle: '', // Hide back button text
          headerRight: () => (
             <Button 
               variant="ghost" 
               size="icon" 
               icon={<Plus size={24} color={Colors.primary} />} 
               onPress={() => setModalVisible(true)} 
             />
          ),
        }} 
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.center}>
          <Folder size={48} color={Colors.muted} />
          <Text style={styles.emptyText}>No collections yet</Text>
          <Button title="Create Collection" onPress={() => setModalVisible(true)} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <FlatList
          data={collections}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Collection</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Title (e.g. Travel Phrases)"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                />
                
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (Optional)"
                  value={newDesc}
                  onChangeText={setNewDesc}
                  multiline
                />
                
                <View style={styles.modalActions}>
                  <Button 
                    variant="ghost" 
                    title="Cancel" 
                    onPress={() => setModalVisible(false)} 
                    style={{ flex: 1 }}
                  />
                  <Button 
                    title={creating ? "Creating..." : "Create"} 
                    onPress={handleCreate} 
                    disabled={!newTitle.trim() || creating}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  list: {
    padding: Layout.padding,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Layout.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(157, 78, 221, 0.1)', // Primary tint
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  cardCount: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: Colors.mutedForeground,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center', // Centers KeyboardAvoidingView
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: Layout.radius,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.input,
    borderRadius: Layout.radius,
    padding: 12,
    fontSize: 16,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
