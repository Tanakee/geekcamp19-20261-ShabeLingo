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
import { recognizeSpeech } from '../lib/azure';
import { translateText, getRomanization } from '../lib/translator';
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

  // Recording language selection
  const [recordingLanguage, setRecordingLanguage] = useState<SupportedLanguage>('ja-JP');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

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

  useEffect(() => {
    console.log('Language modal state:', showLanguageModal);
  }, [showLanguageModal]);

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

      // Perform speech recognition
      let romanizedText = '音声メモ'; // Romanized text (for learning word)
      let nativeText = undefined; // Native script (for evaluation)
      let meaningText = undefined; // Japanese meaning
      
      try {
        const recognized = await recognizeSpeech(uri, recordingLanguage);
        if (recognized) {
          // For most languages, the recognized text is already in native script
          // We'll use it as the native text and translate to get romanization and meaning
          
            if (recordingLanguage !== 'ja-JP') {
              nativeText = recognized;
              
              // Determine if language uses Latin script (approximate check)
              const latinLangs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'vi', 'id', 'tr', 'pl', 'nl', 'sv', 'fil'];
              const isLatin = latinLangs.some(code => recordingLanguage.startsWith(code));

              if (isLatin) {
                romanizedText = recognized;
              } else {
                // For non-Latin scripts (KO, ZH, JA, RU, AR, TH, HI)
                // Try to Transliterate
                try {
                  const transliterated = await getRomanization(recognized, recordingLanguage);
                  if (transliterated) {
                    romanizedText = transliterated;
                  } else {
                    romanizedText = '(発音を入力してください)';
                  }
                } catch (e) {
                  console.error('Transliteration call failed:', e);
                  romanizedText = '(発音を入力してください)';
                }
              }
              
              // Translate to Japanese for meaning
              try {
                const japaneseTranslation = await translateText(recognized, 'ja-JP', recordingLanguage.split('-')[0]);
                if (japaneseTranslation) {
                  meaningText = japaneseTranslation;
                } else {
                  meaningText = `(翻訳できませんでした: ${recognized})`;
                }
              } catch (translationError) {
                console.error('Translation failed:', translationError);
                meaningText = `(翻訳エラー: ${recognized})`;
              }
            } else {
              // If recording language is Japanese
              romanizedText = recognized; // Japanese input is usually native script
              nativeText = recognized;
              meaningText = recognized;
            }
        }
      } catch (error) {
        console.error('Speech recognition or translation failed:', error);
        // Continue with default text if recognition fails
      }

      // Create memo
      await addMemo({
        text: romanizedText, // 学習したい言葉 (Romanized)
        category: '', // No category selected
        audioUrl: uri,
        language: recordingLanguage,
        evaluationText: nativeText, // 発音評価用ターゲット (Native script)
        meaning: meaningText, // 意味・メモ (Japanese meaning)
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

            {/* Language Selection */}
            {!recorderState.isRecording && (
              <TouchableOpacity 
                style={styles.languageButton}
                onPress={() => {
                  console.log('Language button pressed!');
                  setShowLanguageModal(true);
                }}
              >
                <Text style={styles.languageButtonText}>
                  {LANGUAGES.find(l => l.code === recordingLanguage)?.flag} {LANGUAGES.find(l => l.code === recordingLanguage)?.label}
                </Text>
                <Text style={styles.languageButtonArrow}>▼</Text>
              </TouchableOpacity>
            )}

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

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>録音言語を選択</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <X size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    recordingLanguage === lang.code && styles.languageOptionActive
                  ]}
                  onPress={() => {
                    setRecordingLanguage(lang.code);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageOptionText,
                    recordingLanguage === lang.code && styles.languageOptionTextActive
                  ]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  modalContent: {
    padding: Layout.padding,
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
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
    marginBottom: 8,
    width: '80%',
    alignSelf: 'center',
    zIndex: 10,
  },
  languageButtonText: {
    color: Colors.foreground,
    fontSize: 16,
  },
  languageButtonArrow: {
    color: Colors.mutedForeground,
    fontSize: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  languageOptionActive: {
    backgroundColor: Colors.muted,
  },
  languageOptionFlag: {
    fontSize: 24,
  },
  languageOptionText: {
    color: Colors.foreground,
    fontSize: 16,
  },
  languageOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
