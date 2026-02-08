import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, RefreshCw, Check, Mic, Square } from 'lucide-react-native';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { Flashcard } from '../components/review/Flashcard';
import { useMemoContext } from '../context/MemoContext';
import { LANGUAGES } from '../types';
import { assessPronunciation } from '../lib/azure';
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

// Custom recording options for Azure compatibility
const AZURE_RECORDING_OPTIONS = {
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

export default function ReviewScreen() {
  const router = useRouter();
  const { memos } = useMemoContext();
  
  // Filter memos to only include those with evaluationText
  const reviewMemos = useMemo(() => {
    return memos.filter(m => m.evaluationText && m.evaluationText.trim().length > 0);
  }, [memos]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionState, setSessionState] = useState<'reading' | 'result'>('reading');
  const [score, setScore] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Expo Audio Recorder
  const recorder = useAudioRecorder(AZURE_RECORDING_OPTIONS, (status) => {
    // console.log('Recording Status:', status);
  });
  const recorderState = useAudioRecorderState(recorder);
  
  const currentMemo = reviewMemos[currentIndex];

  useEffect(() => {
    // Determine audio mode for recording
    const setupAudio = async () => {
       await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
       });
    };
    setupAudio();
  }, []);

  const handleNext = () => {
    if (currentIndex < reviewMemos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsRevealed(false);
      setSessionState('reading');
      setScore(null);
    } else {
      Alert.alert('Session Complete!');
      router.back();
    }
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
         Alert.alert('Permission needed', 'Microphone permission is required.');
         return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) return;
    
    try {
      await recorder.stop();
      // wait a bit for file to be ready? usually stop() is enough.
      
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio URI');
      
      setAnalyzing(true);

      // Call Azure API
      const result = await assessPronunciation(
          uri, 
          // Use evaluationText if available (for corrected spelling), otherwise originalText
          currentMemo.evaluationText || currentMemo.originalText, 
          currentMemo.language
      );

      if (result) {
          setScore(Math.round(result.PronScore));
      } else {
          Alert.alert('Try Again', 'Could not assess pronunciation clearly.');
          setScore(0);
      }

      setSessionState('result');
      setIsRevealed(true); 

    } catch (e) {
      console.error('Assessment Error:', e);
      Alert.alert('Error', 'Failed to connect to pronunciation service.');
    } finally {
        setAnalyzing(false);
    }
  };

  if (!currentMemo) {
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Button variant="ghost" size="icon" icon={<ChevronLeft size={24} color="#fff" />} onPress={() => router.back()} />
            </View>
            <View style={[styles.main, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: Colors.mutedForeground, textAlign: 'center' }}>
                    No memos with pronunciation targets found. {'\n'}
                    Please add a memo with a target (evaluation text) to start reviewing.
                </Text>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Button variant="ghost" size="icon" icon={<ChevronLeft size={24} color="#fff" />} onPress={() => router.back()} />
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={styles.progress}>{currentIndex + 1} / {reviewMemos.length}</Text>
          {currentMemo.language && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 16 }}>
                {LANGUAGES.find(l => l.code === currentMemo.language)?.flag}
              </Text>
              <Text style={{ color: Colors.mutedForeground, fontSize: 12 }}>
                {LANGUAGES.find(l => l.code === currentMemo.language)?.label}
              </Text>
            </View>
          )}
        </View>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.main}>
        <Flashcard 
          memo={currentMemo} 
          isRevealed={isRevealed} 
          onFlip={() => setIsRevealed(prev => !prev)} 
        />

        <View style={styles.interaction}>
          {sessionState === 'reading' ? (
            <View style={styles.recordArea}>
              <Text style={styles.instruction}>
                  {analyzing ? "Analyzing..." : "Tap & Speak"}
              </Text>
              <Button 
                variant={recorderState.isRecording ? 'destructive' : 'primary'}
                size="lg"
                icon={recorderState.isRecording ? <Square size={32} color="#fff" /> : <Mic size={32} color="#fff" />}
                onPress={recorderState.isRecording ? stopRecording : startRecording}
                style={styles.recordBtn}
                disabled={analyzing}
              />
              {!recorderState.isRecording && !analyzing && <Button variant="ghost" title="Skip" onPress={handleNext} />}
            </View>
          ) : (
             <View style={styles.resultArea}>
                <View style={styles.scoreBadge}>
                   <Text style={styles.scoreVal}>{score}</Text>
                   <Text style={styles.scoreLbl}>SCORE</Text>
                </View>
                <Text style={styles.feedback}>
                    {score && score >= 80 ? 'Great job!' : score && score >= 60 ? 'Good!' : 'Keep practicing!'}
                </Text>
                
                <View style={styles.actions}>
                  <Button variant="secondary" title="Retry" icon={<RefreshCw size={20} color="#000" />} onPress={() => setSessionState('reading')} style={{ flex: 1 }} />
                  <Button variant="primary" title="Next" icon={<Check size={20} color="#fff" />} onPress={handleNext} style={{ flex: 1 }} />
                </View>
             </View>
          )}
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progress: {
    color: Colors.mutedForeground,
    fontWeight: '600',
  },
  main: {
    flex: 1,
    padding: Layout.padding,
    justifyContent: 'space-between',
  },
  interaction: {
    minHeight: 200,
    justifyContent: 'center',
  },
  recordArea: {
    alignItems: 'center',
    gap: 16,
  },
  instruction: {
    color: Colors.mutedForeground,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  resultArea: {
    alignItems: 'center',
    gap: 24,
  },
  scoreBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
  },
  scoreVal: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  scoreLbl: {
    color: Colors.mutedForeground,
    fontSize: 10,
    letterSpacing: 1,
  },
  feedback: {
    color: Colors.foreground,
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
});
