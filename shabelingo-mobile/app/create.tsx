import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Camera, Mic, Square, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { CategorySelector } from '../components/ui/CategorySelector';
import { useMemoContext } from '../context/MemoContext';
import { useAuth } from '../context/AuthContext';
import { subscribeCategories, addCategory } from '../lib/firestore';
import { Category, LANGUAGES, SupportedLanguage } from '../types';

export default function CreateMemoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addMemo, loading } = useMemoContext();
  
  const [text, setText] = useState('');
  const [transcription, setTranscription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState<SupportedLanguage>('en-US');
  
  // Audio State
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [audioUri, setAudioUri] = useState<string | undefined>(undefined);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3, // Reduce quality to ensure Base64 string fits in Firestore (1MB limit)
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const result = await requestPermission();
        if (!result.granted) {
            Alert.alert("Permission Required", "Please grant microphone permission to record audio.");
            return;
        }
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
         Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
        setRecording(undefined);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setAudioUri(uri || undefined);
    } catch (err) {
        console.error('Failed to stop recording', err);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      alert('Please enter text');
      return;
    }
    if (!selectedCategoryId) {
      alert('Please select a category');
      return;
    }

    try {
      await addMemo({
        text,
        category: selectedCategoryId,
        imageUrl: imageUri,
        audioUrl: audioUri,
        transcription: transcription,
        language: language,
      });
      router.back();
    } catch (e: any) {
      alert('Failed to save memo: ' + e.message);
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
        Alert.alert("Error", "Failed to add category");
        throw e;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerTitle: 'New Memo', headerBackTitle: 'Cancel' }} />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                    styles.langChip,
                    language === lang.code && styles.langChipSelected
                ]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text style={{ fontSize: 18, marginRight: 4 }}>{lang.flag}</Text>
                <Text style={[
                    styles.langText,
                    language === lang.code && styles.langTextSelected
                ]}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Text Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Word / Phrase</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Hello"
            value={text}
            onChangeText={setText}
            autoFocus
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
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
                <Text style={styles.label}>Image</Text>
                <TouchableOpacity onPress={handlePickImage} style={styles.imagePlaceholder}>
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
                        title="Remove" 
                        onPress={() => setImageUri(undefined)}
                        style={{ marginTop: 8 }}
                    />
                )}
            </View>

            {/* Audio Recorder */}
            <View style={styles.mediaCol}>
                <Text style={styles.label}>Voice Memo</Text>
                <View style={styles.audioControl}>
                    {recording ? (
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
                    {recording ? "Recording..." : audioUri ? "Recorded!" : "Tap to Record"}
                </Text>
                 {audioUri && !recording && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Delete" 
                        onPress={() => setAudioUri(undefined)}
                        style={{ marginTop: 8 }}
                    />
                )}
            </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes / Meaning</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Translation, notes, etc."
            value={transcription}
            onChangeText={setTranscription}
            multiline
            numberOfLines={4}
          />
        </View>

        <Button
          variant="primary"
          size="lg"
          title={loading ? "Saving..." : "Save Memo"}
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
});
