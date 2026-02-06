import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Mic, Square, Camera, Check, X, Play, Trash2 } from 'lucide-react-native';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { CategorySelector } from '../components/ui/CategorySelector';
import { useMemoContext } from '../context/MemoContext';

export default function CreateScreen() {
  const router = useRouter();
  const { addMemo } = useMemoContext();
  const [text, setText] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        const { status } = await requestPermission();
        if (status !== 'granted') return;
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
      Alert.alert('Failed to start recording', String(err));
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri);
  }

  async function playSound() {
    if (!audioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    setSound(sound);
    await sound.playAsync();
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  const handleSave = () => {
    if (!text && !audioUri && !imageUri) {
      Alert.alert('Empty Memo', 'Please add some content.');
      return;
    }
    
    addMemo({
      text: text || 'Audio Note',
      category: selectedCategoryIds[0] || 'Uncategorized',
      audioUrl: audioUri || undefined,
      imageUrl: imageUri || undefined,
      transcription: text,
    });

    Alert.alert('Saved!', 'Your memo has been saved.');
    router.back();
  };

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: 'New Memo',
          headerLeft: () => (
            <Button variant="ghost" size="icon" icon={<X size={24} color="#fff" />} onPress={() => router.back()} />
          ),
          headerRight: () => (
            <Button variant="primary" size="sm" title="Save" onPress={handleSave} />
          ),
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Voice Recorder Section */}
        <Card style={styles.section}>
          <Text style={styles.label}>Voice Note</Text>
          <View style={styles.recorderContainer}>
            {!audioUri ? (
              <Button
                variant={recording ? 'destructive' : 'secondary'}
                size="lg"
                icon={recording ? <Square size={24} color="#fff" /> : <Mic size={24} color="#000" />}
                onPress={recording ? stopRecording : startRecording}
                style={styles.recordBtn}
              />
            ) : (
              <View style={styles.playerContainer}>
                <Button variant="secondary" size="icon" icon={<Play size={20} />} onPress={playSound} />
                <Text style={styles.audioLabel}>Audio Recorded</Text>
                <Button variant="ghost" size="icon" icon={<Trash2 size={20} color={Colors.destructive} />} onPress={() => setAudioUri(null)} />
              </View>
            )}
            {recording && <Text style={styles.recordingText}>Recording...</Text>}
          </View>
        </Card>

        {/* Text Input Section */}
        <Card style={styles.section}>
          <Input 
            label="Content" 
            placeholder="What's this about?" 
            multiline 
            value={text}
            onChangeText={setText}
          />
        </Card>

        {/* Category Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <CategorySelector 
             selectedCategoryIds={selectedCategoryIds}
             onSelect={(ids) => setSelectedCategoryIds(ids)}
             multiSelect={false}
          />
        </View>

        {/* Image Picker Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Image</Text>
          {imageUri ? (
             <View style={styles.imagePreview}>
               <Image source={{ uri: imageUri }} style={styles.image} />
               <Button 
                 variant="destructive" 
                 size="icon" 
                 icon={<X size={20} color="#fff" />} 
                 style={styles.removeImageBtn}
                 onPress={() => setImageUri(null)}
               />
             </View>
          ) : (
            <Button 
              variant="secondary" 
              icon={<Camera size={20} color="#000" />} 
              title="Add Image" 
              onPress={pickImage}
            />
          )}
        </View>

        {/* Save Button (Bottom) */}
        <View style={{ marginTop: 16, marginBottom: 32 }}>
          <Button 
            variant="primary" 
            size="lg" 
            title="Save Memo" 
            icon={<Check size={20} color="#fff" />}
            onPress={handleSave}
          />
        </View>
      </ScrollView>
    </View>
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
    color: Colors.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  recorderContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  recordBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  recordingText: {
    color: Colors.destructive,
    fontWeight: '600',
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioLabel: {
    color: Colors.foreground,
    flex: 1,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: Layout.radius,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#333',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
