import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, ScrollView, SafeAreaView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Camera, Mic, Square, Trash2, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { CategorySelector } from '../components/ui/CategorySelector';
import { useMemoContext } from '../context/MemoContext';
import { useAuth } from '../context/AuthContext';
import { subscribeCategories, addCategory } from '../lib/firestore';
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

// Custom recording options to match ReviewScreen quality (WAV/PCM/High Quality)
const MEMO_RECORDING_OPTIONS = {
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

export default function CreateMemoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addMemo, loading } = useMemoContext();
  
  const [text, setText] = useState('');
  const [evaluationText, setEvaluationText] = useState('');
  const [transcription, setTranscription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('en-US');
  
  // Audio State (expo-audio)
  const [audioUri, setAudioUri] = useState<string | undefined>(undefined);
  
  const recorder = useAudioRecorder(MEMO_RECORDING_OPTIONS, (status) => {
    // console.log('Memo Recorder Status:', status);
  });
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    // Init audio mode
    setAudioModeAsync({
       allowsRecording: true,
       playsInSilentMode: true,
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeCategories(user.uid, (data) => {
      setCategories(data);
      // Auto-select first category if none selected
      if (!selectedCategoryId && data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageSourceSelect = () => {
    console.log('Opening image source modal...');
    
    // Use native action sheet instead of custom modal
    Alert.alert(
      '画像を追加',
      '画像の取得方法を選択してください',
      [
        {
          text: 'カメラで撮影',
          onPress: handleTakePhoto,
        },
        {
          text: 'ライブラリから選択',
          onPress: handlePickImage,
        },
        {
          text: 'キャンセル',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleTakePhoto = async () => {
    console.log('handleTakePhoto called');
    
    console.log('Requesting camera permissions...');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'カメラを使用するには権限が必要です。');
      return;
    }

    console.log('Launching camera...');
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,
    });

    if (!result.canceled) {
      console.log('Image captured:', result.assets[0].uri);
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    console.log('handlePickImage called');
    
    console.log('Launching image library...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3, 
    });

    if (!result.canceled) {
      console.log('Image selected:', result.assets[0].uri);
      setImageUri(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
          Alert.alert("権限が必要です", "録音するにはマイクの使用許可が必要です。");
          return;
      }
      
      // Reset previous uri if re-recording
      if (audioUri) {
          setAudioUri(undefined);
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("エラー", "録音の開始に失敗しました。");
    }
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) return;
    try {
        await recorder.stop();
        const uri = recorder.uri;
        setAudioUri(uri || undefined);
    } catch (err) {
        console.error('Failed to stop recording', err);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      alert('テキストを入力してください');
      return;
    }
    if (!selectedCategoryId) {
      alert('カテゴリーを選択してください');
      return;
    }

    try {
      await addMemo({
        text,
        evaluationText,
        category: selectedCategoryId,
        imageUrl: imageUri,
        audioUrl: audioUri,
        transcription: transcription,
        language: language,
      });
      router.back();
    } catch (e: any) {
      alert('メモの保存に失敗しました: ' + e.message);
    }
  };

  // Category Helper
  const handleAddCategory = async (name: string) => {
    if (!user) return;
    try {
        const newId = await addCategory(user.uid, name);
        // CategorySelector will handle selection visually, but we might need to update local state logic if needed
        return newId;
    } catch (e) {
        Alert.alert("エラー", "カテゴリーの追加に失敗しました");
        throw e;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerTitle: '新規メモ作成', headerBackTitle: 'キャンセル' }} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>言語</Text>
          <TouchableOpacity 
            style={styles.languageSelector}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.languageSelectorContent}>
              <Text style={styles.langFlag}>
                {LANGUAGES.find(l => l.code === language)?.flag}
              </Text>
              <Text style={styles.languageSelectorText}>
                {LANGUAGES.find(l => l.code === language)?.label}
              </Text>
            </View>
            <Text style={styles.languageSelectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>言語を選択</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="言語を検索..."
                value={languageSearch}
                onChangeText={setLanguageSearch}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.languageList}>
              {LANGUAGES
                .filter(lang => 
                  languageSearch === '' || 
                  lang.label.toLowerCase().includes(languageSearch.toLowerCase()) ||
                  lang.code.toLowerCase().includes(languageSearch.toLowerCase())
                )
                .map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageItem,
                      language === lang.code && styles.languageItemSelected
                    ]}
                    onPress={() => {
                      setLanguage(lang.code);
                      setShowLanguageModal(false);
                      setLanguageSearch('');
                    }}
                  >
                    <Text style={styles.languageItemFlag}>{lang.flag}</Text>
                    <Text style={[
                      styles.languageItemText,
                      language === lang.code && styles.languageItemTextSelected
                    ]}>
                      {lang.label}
                    </Text>
                    {language === lang.code && (
                      <Text style={styles.languageItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Text Input */}
        <View style={styles.section}>
          <Text style={styles.label}>学習したい言葉</Text>
          <TextInput
            style={styles.input}
            placeholder="例: はろー"
            value={text}
            onChangeText={setText}
            autoFocus
          />
        </View>

        {/* Evaluation Text Input */}
        <View style={styles.section}>
          <Text style={styles.label}>発音評価用ターゲット (任意)</Text>
          <Text style={styles.hint}>
            {language.startsWith('zh-') 
              ? 'ピンイン（拼音）で入力してください（例: ni hao）' 
              : language === 'ja-JP'
              ? 'ローマ字で入力してください（例: konnichiwa）'
              : language === 'ko-KR'
              ? 'ローマ字で入力してください（例: annyeonghaseyo）'
              : language === 'ar-SA'
              ? 'ローマ字転写で入力してください（例: marhaba）'
              : language === 'hi-IN'
              ? 'ローマ字転写で入力してください（例: namaste）'
              : language === 'th-TH'
              ? 'ローマ字転写で入力してください（例: sawasdee）'
              : language === 'ru-RU'
              ? 'ローマ字転写で入力してください（例: privet）'
              : '正しいスペルを入力してください（例: Hello）'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              language.startsWith('zh-') ? '例: ni hao' 
              : language === 'ja-JP' ? '例: konnichiwa'
              : language === 'ko-KR' ? '例: annyeonghaseyo'
              : '例: Hello'
            }
            value={evaluationText}
            onChangeText={setEvaluationText}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>カテゴリー</Text>
          <CategorySelector
            selectedCategoryIds={selectedCategoryId ? [selectedCategoryId] : []}
            onSelect={(ids) => setSelectedCategoryId(ids[0] || '')}
            multiSelect={false}
          />
        </View>

        {/* Media (Image & Audio) */}
        <View style={styles.rowSection}>
            {/* Image Picker */}
            <View style={styles.mediaCol}>
                <Text style={styles.label}>画像</Text>
                <TouchableOpacity onPress={handleImageSourceSelect} style={styles.imagePlaceholder}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <Camera size={32} color={Colors.mutedForeground} />
                    )}
                </TouchableOpacity>
                {imageUri && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        title="削除" 
                        onPress={() => setImageUri(undefined)}
                        style={{ marginTop: 8 }}
                    />
                )}
            </View>

            {/* Image Source Selection Modal */}
            <Modal
                visible={showImageSourceModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageSourceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1} 
                        onPress={() => setShowImageSourceModal(false)}
                    />
                    <View style={styles.actionSheet}>
                        <Text style={styles.actionSheetTitle}>画像を追加</Text>
                        <TouchableOpacity style={styles.actionSheetButton} onPress={handleTakePhoto}>
                            <Camera size={24} color={Colors.foreground} />
                            <Text style={styles.actionSheetButtonText}>カメラで撮影</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionSheetButton} onPress={handlePickImage}>
                            <ImageIcon size={24} color={Colors.foreground} />
                            <Text style={styles.actionSheetButtonText}>ライブラリから選択</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionSheetButton, styles.actionSheetCancel]} 
                            onPress={() => setShowImageSourceModal(false)}
                        >
                            <Text style={[styles.actionSheetButtonText, styles.actionSheetCancelText]}>キャンセル</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Audio Recorder */}
            <View style={styles.mediaCol}>
                <Text style={styles.label}>音声メモ</Text>
                <View style={styles.audioControl}>
                    {recorderState.isRecording ? (
                         <TouchableOpacity onPress={stopRecording} style={[styles.recordBtn, styles.recording]}>
                            <Square size={24} color="#fff" />
                         </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={startRecording} style={styles.recordBtn}>
                            <Mic size={24} color={audioUri ? Colors.primary : "#fff"} />
                         </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.audioLabel}>
                    {recorderState.isRecording ? "録音中..." : audioUri ? "録音完了!" : "タップして録音"}
                </Text>
                 {audioUri && !recorderState.isRecording && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        title="削除" 
                        onPress={() => setAudioUri(undefined)}
                        style={{ marginTop: 8 }}
                    />
                )}
            </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>意味・メモ</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="翻訳やメモなど"
            value={transcription}
            onChangeText={setTranscription}
            multiline
            numberOfLines={4}
          />
        </View>

        <Button
          variant="primary"
          size="lg"
          title={loading ? "保存中..." : "保存"}
          onPress={handleSave}
          disabled={loading}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Layout.padding,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mutedForeground,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000', // Explicitly black for white background
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowSection: {
    flexDirection: 'row',
    gap: 16,
  },
  mediaCol: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  audioControl: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginBottom: 8,
  },
  recordBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recording: {
    backgroundColor: Colors.destructive,
  },
  audioLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  saveBtn: {
    marginTop: 16,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  langChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  langText: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  langTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  langFlag: {
    fontSize: 18,
    marginRight: 4,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  languageSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageSelectorText: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
  },
  languageSelectorArrow: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
  },
  searchInput: {
    backgroundColor: Colors.muted,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.foreground,
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  languageItemSelected: {
    backgroundColor: 'rgba(88, 204, 2, 0.1)',
  },
  languageItemFlag: {
    fontSize: 24,
  },
  languageItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.foreground,
  },
  languageItemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  languageItemCheck: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  modalClose: {
    fontSize: 24,
    color: Colors.foreground,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionSheetButtonText: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
  },
  actionSheetCancel: {
    marginTop: 8,
    backgroundColor: Colors.muted,
  },
  actionSheetCancelText: {
    textAlign: 'center',
    flex: 1,
  },
});
