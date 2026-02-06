import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { Colors, Layout } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { useMemoContext } from '../../context/MemoContext';
import { useAuth } from '../../context/AuthContext';
import { subscribeCategories } from '../../lib/firestore';
import { Category, Memo } from '../../types';

export default function MemoDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { memos } = useMemoContext();
  const [memo, setMemo] = useState<Memo | undefined>(undefined);
  const [categories, setCategories] = useState<Record<string, Category>>({});

  useEffect(() => {
    if (memos.length > 0 && id) {
      const found = memos.find(m => m.id === id);
      setMemo(found);
    }
  }, [memos, id]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeCategories(user.uid, (list) => {
      const map = list.reduce((acc, cat) => ({ ...acc, [cat.id]: cat }), {});
      setCategories(map);
    });
    return () => unsubscribe();
  }, [user]);

  const getCategoryName = (idOrName: string) => {
    const cat = categories[idOrName];
    return cat ? cat.name : idOrName;
  };

  if (!memo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerTitle: 'Memo Detail', headerBackTitle: 'Back' }} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Info */}
        <View style={styles.header}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>
                    {getCategoryName(memo.categoryIds && memo.categoryIds.length > 0 ? memo.categoryIds[0] : 'Uncategorized')}
                </Text>
            </View>
            <Text style={styles.date}>
                {new Date(memo.createdAt).toLocaleDateString()} {new Date(memo.createdAt).toLocaleTimeString()}
            </Text>
        </View>

        {/* Main Text */}
        <Text style={styles.originalText}>{memo.originalText}</Text>

        {/* Image */}
        {memo.imageUrl && (
            <Image 
                source={{ uri: memo.imageUrl }} 
                style={styles.image} 
                resizeMode="contain"
            />
        )}

        {/* Audio Player Placeholder */}
        {memo.audioUrl && (
            <View style={styles.audioContainer}>
                <Button 
                    variant="secondary"
                    icon={<Play size={20} color="#000" />}
                    title="Play Audio"
                    onPress={() => console.log('Play audio TODO')}
                    style={styles.audioButton}
                />
            </View>
        )}

        {/* Notes / Transcription */}
        {memo.note && (
            <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>Note / Transcription</Text>
                <Text style={styles.noteText}>{memo.note}</Text>
            </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Layout.padding,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(157, 78, 221, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    color: Colors.mutedForeground,
    fontSize: 14,
  },
  originalText: {
    color: Colors.foreground,
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  audioContainer: {
    flexDirection: 'row',
  },
  audioButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  noteContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  noteLabel: {
    color: Colors.mutedForeground,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  noteText: {
    color: Colors.foreground,
    fontSize: 16,
    lineHeight: 24,
  },
});
