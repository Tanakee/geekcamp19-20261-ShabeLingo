import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Pressable, View, Animated } from 'react-native';
import { Colors, Layout } from '../../constants/Colors';
import { Memo } from '../../types';

interface FlashcardProps {
  memo: Memo;
  isRevealed: boolean;
  onFlip: () => void;
}

export function Flashcard({ memo, isRevealed, onFlip }: FlashcardProps) {
  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(flipAnimation, {
      toValue: isRevealed ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isRevealed]);

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={onFlip} style={styles.cardContainer}>
        {/* Front Side (Question/Hint) */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
              opacity: frontOpacity,
            },
          ]}
        >
          <Text style={styles.text}>{memo.note || memo.translatedText || "(ヒントなし)"}</Text>
          <Text style={styles.subText}>タップして答えを表示</Text>
        </Animated.View>

        {/* Back Side (Answer/Word) */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            {
              transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
              opacity: backOpacity,
            },
          ]}
        >
          <Text style={[styles.text, styles.textBack]}>{memo.originalText}</Text>
          {memo.evaluationText && (
            <Text style={[styles.subText, styles.subTextBack]}>({memo.evaluationText})</Text>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: Colors.card,
    borderRadius: Layout.radius,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBack: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  text: {
    color: Colors.foreground,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textBack: {
    color: Colors.primaryForeground,
  },
  subText: {
    color: Colors.mutedForeground,
    marginTop: 12,
    fontSize: 14,
  },
  subTextBack: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

