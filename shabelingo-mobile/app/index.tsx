import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Play } from 'lucide-react-native';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useMemoContext } from '../context/MemoContext';
import { useAuth } from '../context/AuthContext';
import { subscribeCategories } from '../lib/firestore';
import { Category } from '../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { memos } = useMemoContext();
  const [categories, setCategories] = useState<Record<string, Category>>({});

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeCategories(user.uid, (list) => {
      const map = list.reduce((acc, cat) => ({ ...acc, [cat.id]: cat }), {});
      setCategories(map);
    });
    return () => unsubscribe();
  }, [user]);

  const getCategoryName = (idOrName: string) => {
    // IDとして解決できれば名前を、できなければそのまま（モックデータ互換あるいは古いデータ用）
    const cat = categories[idOrName];
    return cat ? cat.name : idOrName;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: 'ShabeLingo',
          headerRight: () => (
            <Button 
              variant="secondary" 
              size="sm" 
              icon={<Play size={20} color="#000" />} 
              onPress={() => router.push('/review')}
              style={{ width: 40, height: 40, paddingHorizontal: 0 }}
            />
          ),
        }} 
      />
      
      <FlatList
        data={memos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{getCategoryName(item.category)}</Text>
              </View>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.cardText}>{item.text}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No memos yet. Start recording.</Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <Button 
          variant="primary" 
          size="lg" 
          title="New Memo"
          icon={<Plus size={24} color="#fff" />}
          onPress={() => router.push('/create')}
          style={styles.fab}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Layout.padding,
    paddingBottom: 100, // Space for FAB
    gap: 16,
  },
  card: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(157, 78, 221, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.3)',
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    color: Colors.mutedForeground,
    fontSize: 12,
  },
  cardText: {
    color: Colors.foreground,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.mutedForeground,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }
});
