import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Play, Square, Trash2 } from 'lucide-react-native';
// import { Audio } from 'expo-av';
import { Colors, Layout } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { useMemoContext } from '../../context/MemoContext';
import { useAuth } from '../../context/AuthContext';
import { subscribeCategories } from '../../lib/firestore';
import { Category, Memo, LANGUAGES } from '../../types';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

export default function MemoDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { memos, deleteMemo } = useMemoContext();
  const [memo, setMemo] = useState<Memo | undefined>(undefined);
  const [categories, setCategories] = useState<Record<string, Category>>({});
  
  // Audio Player (expo-audio)
  const player = useAudioPlayer(memo?.audioUrl || null);
  const playerStatus = useAudioPlayerStatus(player);
  
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

  // Update player source when memo is loaded
  useEffect(() => {
      if (memo?.audioUrl) {
          player.replace(memo.audioUrl);
      }
  }, [memo?.audioUrl, player]);

  const getCategoryName = (idOrName: string) => {
    const cat = categories[idOrName];
    return cat ? cat.name : idOrName;
  };

  const getLanguageInfo = (langCode?: string) => {
    return LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
  };

  const playSound = async () => {
    if (!memo?.audioUrl) return;

    if (playerStatus.playing) {
        player.pause();
    } else {
        // If finished, seek to start
        if (playerStatus.currentTime >= playerStatus.duration && playerStatus.duration > 0) {
            player.seekTo(0);
        }
        player.play();
    }
  };


  
  const handleDelete = () => {
    if (!memo) return;
    
    Alert.alert(
      "Delete Memo",
      "Are you sure you want to delete this memo?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMemo(memo.id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete memo");
            }
          }
        }
      ]
    );
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
      <Stack.Screen 
        options={{ 
          headerTitle: 'Memo Detail', 
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete}>
              <Trash2 size={24} color={Colors.destructive} />
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Info */}
        <View style={styles.header}>
            <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {getCategoryName(memo.categoryIds && memo.categoryIds.length > 0 ? memo.categoryIds[0] : 'Uncategorized')}
                    </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#f0f0f0' }]}>
                    <Text style={styles.badgeText}>
                         {getLanguageInfo(memo.language).flag} {getLanguageInfo(memo.language).label}
                    </Text>
                </View>
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

        {/* Audio Player */}
        {memo.audioUrl && (
            <View style={styles.audioContainer}>
                <Button 
                    variant={playerStatus.playing ? "destructive" : "secondary"}
                    icon={playerStatus.playing ? <Square size={20} color="#fff" /> : <Play size={20} color="#000" />}
                    title={playerStatus.playing ? "Pause Audio" : "Play Audio"}
                    onPress={playSound}
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
    // flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align top if date wraps or multiple badges
    gap: 8,
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
