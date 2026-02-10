import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Animated } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, RefreshCw, Check, Mic, Square, Play } from 'lucide-react-native';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { Flashcard } from '../components/review/Flashcard';
import { useAuth } from '../context/AuthContext';
import { LANGUAGES, Memo } from '../types';
import { assessPronunciation } from '../lib/azure';
import { getDueMemos, getNewMemos, getRandomReviewMemos, updateMemoSRS } from '../lib/firestore';
import { calculateSRS, Grade } from '../lib/srs';
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
  const { user } = useAuth();
  
  const [reviewMemos, setReviewMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionState, setSessionState] = useState<'reading' | 'result'>('reading');
  const [score, setScore] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mode, setMode] = useState<'daily' | 'random' | 'none'>('none');
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Load Session Logic
  const loadSession = async (modeType: 'daily' | 'random' = 'daily') => {
    if (!user) return;
    try {
      setLoading(true);
      setMode(modeType);
      let session: any[] = [];

      if (modeType === 'daily') {
          // Due + New
          const [due, newMemos] = await Promise.all([
              getDueMemos(user.uid, 10),
              getNewMemos(user.uid, 5)
          ]);
          session = [...due, ...newMemos];
          // Simple dedup by ID just in case
          session = session.filter((m, i, self) => self.findIndex(t => t.id === m.id) === i);
      } else {
          // Random Review
          session = await getRandomReviewMemos(user.uid, 10);
      }

      // Filter out memos without evaluationText (cannot practice pronunciation)
      const playable = session.filter(m => m.evaluationText && m.evaluationText.trim().length > 0);
      
      setReviewMemos(playable);
      setCurrentIndex(0);
      setSessionState('reading');
      setIsRevealed(false);
      setScore(null);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load review session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession('daily');
  }, [user]);

  // Expo Audio Recorder
  const recorder = useAudioRecorder(AZURE_RECORDING_OPTIONS, (status) => {
    // console.log('Recording Status:', status);
  });
  const recorderState = useAudioRecorderState(recorder);
  
  const currentMemo = reviewMemos[currentIndex];

  useEffect(() => {
    const setupAudio = async () => {
       await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
       });
    };
    setupAudio();
  }, []);

  const handleNext = async () => {
    // Update SRS if we have a score
    if (currentMemo && score !== null) {
        // Convert score to grade
        let grade: Grade = 1;
        if (score >= 90) grade = 5;
        else if (score >= 80) grade = 4;
        else if (score >= 70) grade = 3;
        else if (score >= 60) grade = 2;

        try {
            const srsResult = calculateSRS(
                grade,
                currentMemo.interval || 0,
                currentMemo.easeFactor || 2.5,
                currentMemo.reviewCount || 0
            );
            await updateMemoSRS(currentMemo.id, srsResult);
            console.log(`SRS Updated for ${currentMemo.id}: Grade ${grade}, Next Due: ${new Date(srsResult.nextReviewDate).toISOString()}`);
        } catch (e) {
            console.error('Failed to update SRS:', e);
            // Continue even if update fails
        }
    }

    if (currentIndex < reviewMemos.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(prev => prev + 1);
        setIsRevealed(false);
        setSessionState('reading');
        setScore(null);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      if (mode === 'daily') {
        Alert.alert('お疲れ様でした！', '本日の復習セッションは完了です。', [
            { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('お疲れ様でした！', 'ランダム復習が完了しました。', [
            { text: 'もう一度', onPress: () => loadSession('random') },
            { text: '終了', onPress: () => router.back() }
        ]);
      }
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
      
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio URI');
      
      if (!currentMemo?.evaluationText) {
          Alert.alert('Error', 'No evaluation text available for this memo.');
          return;
      }

      setAnalyzing(true);

      // Call Azure API
      const result = await assessPronunciation(
          uri, 
          currentMemo.evaluationText,
          currentMemo.language
      );

      if (result) {
          setScore(Math.round(result.PronScore));
      } else {
          Alert.alert('診断できませんでした', '音声がはっきり認識できませんでした。もう一度試してください。');
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

  if (loading) {
      return (
          <SafeAreaView style={[styles.container, styles.center]}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ marginTop: 16, color: Colors.mutedForeground }}>セッションを準備中...</Text>
          </SafeAreaView>
      );
  }

  if (!currentMemo) {
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <Button variant="ghost" size="icon" icon={<ChevronLeft size={24} color={Colors.foreground} />} onPress={() => router.back()} />
            </View>
            <View style={[styles.main, { justifyContent: 'center', alignItems: 'center', gap: 24 }]}>
                <View style={{ alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.foreground }}>
                        今日の課題はありません
                    </Text>
                    <Text style={{ color: Colors.mutedForeground, textAlign: 'center' }}>
                        復習期日のメモや未学習のメモはありません。
                    </Text>
                </View>
                
                <Button 
                    variant="secondary" 
                    title="ランダム復習を開始" 
                    icon={<Play size={20} color={Colors.primary} />}
                    onPress={() => loadSession('random')}
                />
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Button variant="ghost" size="icon" icon={<ChevronLeft size={24} color={Colors.foreground} />} onPress={() => router.back()} />
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
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <Flashcard 
            key={currentMemo.id}
            memo={currentMemo} 
            isRevealed={isRevealed} 
            onFlip={() => setIsRevealed(prev => !prev)} 
            />

            <View style={styles.interaction}>
            {sessionState === 'reading' ? (
                <View style={styles.recordArea}>
                <Text style={styles.instruction}>
                    {analyzing ? "診断中..." : "タップして発音"}
                </Text>
                <Button 
                    variant={recorderState.isRecording ? 'destructive' : 'primary'}
                    size="lg"
                    icon={recorderState.isRecording ? <Square size={32} color="#fff" /> : <Mic size={32} color="#fff" />}
                    onPress={recorderState.isRecording ? stopRecording : startRecording}
                    style={styles.recordBtn}
                    disabled={analyzing}
                />
                {!recorderState.isRecording && !analyzing && <Button variant="ghost" title="スキップ" onPress={handleNext} />}
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
                    <Button variant="secondary" title="リトライ" icon={<RefreshCw size={20} color="#000" />} onPress={() => setSessionState('reading')} style={{ flex: 1 }} />
                    <Button variant="primary" title="次へ" icon={<Check size={20} color="#fff" />} onPress={handleNext} style={{ flex: 1 }} />
                    </View>
                </View>
            )}
            </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
      justifyContent: 'center',
      alignItems: 'center',
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
