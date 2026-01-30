import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { ChevronLeft, RefreshCw, Check } from 'lucide-react-native';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { Flashcard } from '../components/review/Flashcard';
import { useMemoContext } from '../context/MemoContext';
import { Mic, Square } from 'lucide-react-native';

export default function ReviewScreen() {
  const router = useRouter();
  const { memos } = useMemoContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionState, setSessionState] = useState<'reading' | 'result'>('reading');
  const [score, setScore] = useState<number | null>(null);
  
  // Recorder State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  
  const currentMemo = memos[currentIndex];

  const handleNext = () => {
    if (currentIndex < memos.length - 1) {
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
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (e) {
      console.error(e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    // Simulate scoring
    setTimeout(() => {
      setScore(Math.floor(Math.random() * 20) + 80);
      setSessionState('result');
      setIsRevealed(true); // Reveal card on result
    }, 1000);
  };

  if (!currentMemo) return <View />;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <Button variant="ghost" size="icon" icon={<ChevronLeft size={24} color="#fff" />} onPress={() => router.back()} />
        <Text style={styles.progress}>{currentIndex + 1} / {memos.length}</Text>
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
              <Text style={styles.instruction}>Tap & Speak</Text>
              <Button 
                variant={recording ? 'destructive' : 'primary'}
                size="lg"
                icon={recording ? <Square size={32} color="#fff" /> : <Mic size={32} color="#fff" />}
                onPress={recording ? stopRecording : startRecording}
                style={styles.recordBtn}
              />
              <Button variant="ghost" title="Skip" onPress={handleNext} />
            </View>
          ) : (
             <View style={styles.resultArea}>
                <View style={styles.scoreBadge}>
                   <Text style={styles.scoreVal}>{score}</Text>
                   <Text style={styles.scoreLbl}>SCORE</Text>
                </View>
                <Text style={styles.feedback}>Great job!</Text>
                
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
