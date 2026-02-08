import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Image, TouchableOpacity, Modal, ScrollView, Animated, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Play, Filter, X, Mic, Square, List } from 'lucide-react-native';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useMemoContext } from '../context/MemoContext';
import { useAuth } from '../context/AuthContext';
import { subscribeCategories } from '../lib/firestore';
import { Category, LANGUAGES, SupportedLanguage } from '../types';
import { 
  useAudioRecorder, 
  useAudioRecorderState, 
  RecordingPresets, 
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  AndroidOutputFormat,
  AndroidAudioEncoder,
  IOSOutputFormat,
  AudioQuality
} from 'expo-audio';

// Recording options
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  android: {
    extension: '.wav',
    outputFormat: 'default' as AndroidOutputFormat,
    audioEncoder: 'default' as AndroidAudioEncoder,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { memos, addMemo } = useMemoContext();
  const [categories, setCategories] = useState<Record<string, Category>>({});
  
  // View mode: 'record' or 'list'
  const [viewMode, setViewMode] = useState<'record' | 'list'>('record');
  
  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterLang, setFilterLang] = useState<SupportedLanguage | 'all'>('all');
  const [filterCat, setFilterCat] = useState<string | 'all'>('all');

  // Audio Recording
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
  }, []);

  // Pulse animation when recording
  useEffect(() => {
    if (recorderState.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recorderState.isRecording]);

  // Filtering Logic
  const filteredMemos = memos.filter(m => {
    const langMatch = filterLang === 'all' ? true : m.language === filterLang;
    const catMatch = filterCat === 'all' || (m.categoryIds && m.categoryIds.includes(filterCat));
    return langMatch && catMatch;
  });

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

  const handleStartRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('権限が必要です', '録音するにはマイクの使用許可が必要です。');
        return;
      }

      // Set audio mode to allow recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('エラー', '録音の開始に失敗しました。');
    }
  };

  const handleStopRecording = async () => {
    if (!recorderState.isRecording) return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      
      if (!uri || !user) {
        Alert.alert('エラー', '録音の保存に失敗しました。');
        return;
      }

      // Create memo with audio only (no category or language pre-selected)
      await addMemo({
        text: '音声メモ',
        category: '', // No category selected
        audioUrl: uri,
        // language is undefined, user will select later
      });

      // Switch to list view
      setViewMode('list');
      
      Alert.alert('成功', 'メモを作成しました。タップして詳細を追加できます。');
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('エラー', '録音の停止に失敗しました。');
    }
  };

  const activeFiltersCount = (filterLang !== 'all' ? 1 : 0) + (filterCat !== 'all' ? 1 : 0);

  if (viewMode === 'record') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ShabeLingo</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setViewMode('list')} style={styles.headerBtn}>
              <List size={24} color={Colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/review')} style={styles.headerBtn}>
              <Play size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.recordContainer}>
          <View style={styles.recordContent}>
            <Text style={styles.recordTitle}>
              {recorderState.isRecording ? '録音中...' : '新しいメモを作成'}
            </Text>
            <Text style={styles.recordSubtitle}>
              {recorderState.isRecording 
                ? 'もう一度タップして停止' 
                : 'マイクをタップして音声を録音'}
            </Text>

            <TouchableOpacity
              style={styles.micButton}
              onPress={recorderState.isRecording ? handleStopRecording : handleStartRecording}
              activeOpacity={0.8}
            >
              <Animated.View style={[
                styles.micButtonInner,
                recorderState.isRecording && styles.micButtonRecording,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                {recorderState.isRecording ? (
                  <Square size={64} color="#fff" fill="#fff" />
                ) : (
                  <Mic size={64} color="#fff" />
                )}
              </Animated.View>
            </TouchableOpacity>

            {recorderState.isRecording && recorderState.durationMillis != null && recorderState.durationMillis > 0 && (
              <Text style={styles.recordTime}>
                {Math.floor(recorderState.durationMillis / 1000)}秒
              </Text>
            )}

            <Text style={styles.recordHint}>
              または
            </Text>

            <Button
              title="テキストから作成"
              variant="ghost"
              onPress={() => router.push('/create')}
              style={styles.textButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // List view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ShabeLingo</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.headerBtn}>
            <Filter size={24} color={activeFiltersCount > 0 ? Colors.primary : Colors.foreground} />
            {activeFiltersCount > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/review')} style={styles.headerBtn}>
            <Play size={24} color={Colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Memos</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={24} color={Colors.foreground} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Language Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Language</Text>
              <View style={styles.chipContainer}>
                <TouchableOpacity 
                  style={[styles.chip, filterLang === 'all' && styles.chipActive]}
                  onPress={() => setFilterLang('all')}
                >
                  <Text style={[styles.chipText, filterLang === 'all' && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {LANGUAGES.map(l => (
                  <TouchableOpacity 
                    key={l.code} 
                    style={[styles.chip, filterLang === l.code && styles.chipActive]}
                    onPress={() => setFilterLang(l.code)}
                  >
                    <Text style={{marginRight: 4}}>{l.flag}</Text>
                    <Text style={[styles.chipText, filterLang === l.code && styles.chipTextActive]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.chipContainer}>
                <TouchableOpacity 
                  style={[styles.chip, filterCat === 'all' && styles.chipActive]}
                  onPress={() => setFilterCat('all')}
                >
                  <Text style={[styles.chipText, filterCat === 'all' && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {Object.values(categories).map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.chip, filterCat === c.id && styles.chipActive]}
                    onPress={() => setFilterCat(c.id)}
                  >
                    <Text style={[styles.chipText, filterCat === c.id && styles.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <Button 
              title={`Show ${filteredMemos.length} Memos`}
              onPress={() => setShowFilterModal(false)}
              style={{ marginTop: 32 }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <FlatList
        data={filteredMemos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/memo/${item.id}`)} activeOpacity={0.9}>
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.cardMain}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      {item.language && (
                        <Text style={styles.langEmoji}>
                          {LANGUAGES.find(l => l.code === item.language)?.flag}
                        </Text>
                      )}
                      {item.categoryIds && item.categoryIds.length > 0 && item.categoryIds[0] !== '' && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {getCategoryName(item.categoryIds[0])}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.date}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.cardText} numberOfLines={3}>{item.originalText}</Text>
                </View>
                
                {item.imageUrl && (
                  <Image 
                    source={{ uri: item.imageUrl }} 
                    style={styles.cardThumbnail} 
                    resizeMode="cover"
                  />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No memos found.</Text>
            {(filterCat !== 'all' || filterLang !== 'all') && (
              <Button 
                variant="ghost" 
                title="Clear Filters" 
                onPress={() => {
                  setFilterCat('all');
                  setFilterLang('all');
                }}
              />
            )}
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <Button 
          variant="primary" 
          size="lg" 
          title="New Memo"
          icon={<Plus size={24} color="#fff" />}
          onPress={() => setViewMode('record')}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recordContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.padding,
  },
  recordContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  recordTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: 12,
  },
  recordSubtitle: {
    fontSize: 16,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 48,
  },
  micButton: {
    marginBottom: 24,
  },
  micButtonInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  micButtonRecording: {
    backgroundColor: Colors.destructive,
    shadowColor: Colors.destructive,
  },
  recordTime: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 32,
  },
  recordHint: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: 16,
  },
  textButton: {
    width: '100%',
  },
  listContent: {
    padding: Layout.padding,
    paddingBottom: 100,
    gap: 16,
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.card,
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
  modalContent: {
    padding: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.foreground,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  cardMain: {
    flex: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langEmoji: {
    fontSize: 16,
  },
  badge: {
    backgroundColor: 'rgba(88, 204, 2, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(88, 204, 2, 0.3)',
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
  cardThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.muted,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }
});
