import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Play, Square, Trash2, Edit } from 'lucide-react-native';
// import { Audio } from 'expo-av';
import { Colors, Layout } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { useMemoContext } from '../../context/MemoContext';
import { useAuth } from '../../context/AuthContext';
import { subscribeCategories } from '../../lib/firestore';
import { Category, Memo, LANGUAGES } from '../../types';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

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
    // Set audio mode to playback only (allows output to speaker)
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch((err) => console.log('Audio mode set failed', err));
  }, []);

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
      "メモを削除",
      "本当にこのメモを削除しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        { 
          text: "削除", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMemo(memo.id);
              router.back();
            } catch (error) {
              Alert.alert("エラー", "メモの削除に失敗しました");
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
          headerTitle: 'メモ詳細', 
          headerBackTitle: '戻る',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                onPress={() => router.push({
                  pathname: '/create',
                  params: { editMemoId: id }
                })}
                style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginTop: -4 }}
              >
                <Edit size={24} color={Colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDelete} 
                style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginTop: -4 }}
              >
                <Trash2 size={24} color={Colors.destructive} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Info */}
        <View style={styles.header}>
            <View style={{ gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={[styles.badge, { backgroundColor: '#f0f0f0' }]}>
                    <Text style={styles.badgeText}>
                         {getLanguageInfo(memo.language).flag} {getLanguageInfo(memo.language).label}
                    </Text>
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {getCategoryName(memo.categoryIds && memo.categoryIds.length > 0 ? memo.categoryIds[0] : '未分類')}
                    </Text>
                </View>
            </View>
            <Text style={styles.date}>
                {new Date(memo.createdAt).toLocaleDateString()} {new Date(memo.createdAt).toLocaleTimeString()}
            </Text>
        </View>

        {/* Main Text (Romanized/Learning Word) */}
        <View>
          <Text style={styles.label}>学習したい言葉</Text>
          <Text style={styles.originalText}>{memo.originalText}</Text>
        </View>

        {/* Evaluation Text (Native Script) */}
        {memo.evaluationText && (
          <View>
            <Text style={styles.label}>発音評価用ターゲット</Text>
            <Text style={styles.nativeText}>{memo.evaluationText}</Text>
          </View>
        )}

        {/* Meaning (Japanese) */}
        {memo.meaning && (
          <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>意味・メモ</Text>
              <Text style={styles.noteText}>{memo.meaning}</Text>
          </View>
        )}

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
            <View style={styles.audioPlayerCard}>
                <TouchableOpacity 
                    style={[styles.playButton, playerStatus.playing && styles.playingButton]} 
                    onPress={playSound}
                    activeOpacity={0.8}
                >
                    {playerStatus.playing ? (
                        <Square size={20} color="#fff" fill="#fff" />
                    ) : (
                        <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                    )}
                </TouchableOpacity>
                <View style={styles.audioInfo}>
                    <View style={styles.waveform}>
                        {[12, 20, 16, 24, 18, 14, 22, 16, 12, 18].map((h, i) => (
                            <View key={i} style={[
                                styles.waveformBar, 
                                { height: h, opacity: playerStatus.playing ? 1 : 0.4 }
                            ]} />
                        ))}
                    </View>
                    <Text style={styles.audioStatusText}>
                        {playerStatus.playing && "再生中..."}
                    </Text>
                </View>
            </View>
        )}

        {/* Notes / Transcription (Legacy) */}
        {memo.note && !memo.meaning && (
            <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>メモ・翻訳(旧)</Text>
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
    backgroundColor: 'rgba(88, 204, 2, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(88, 204, 2, 0.3)',
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
  audioPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playingButton: {
    backgroundColor: Colors.destructive,
    shadowColor: Colors.destructive,
  },
  audioInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
  },
  waveformBar: {
    width: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  audioStatusText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: '500',
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
    color: '#000',
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  nativeText: {
    fontSize: 20,
    color: Colors.foreground,
    lineHeight: 28,
    fontWeight: '500', 
  },
});
