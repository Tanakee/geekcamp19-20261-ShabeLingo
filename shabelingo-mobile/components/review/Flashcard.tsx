import React, { useState } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Colors, Layout } from '../../constants/Colors';
import { Memo } from '../../types';

interface FlashcardProps {
  memo: Memo;
  isRevealed: boolean;
  onFlip: () => void;
}

export function Flashcard({ memo, isRevealed, onFlip }: FlashcardProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onFlip} style={styles.cardContainer}>
        {/* Front Side (Question/Hint) */}
        <View style={[styles.card, !isRevealed ? styles.visible : styles.hidden]}>
          <Text style={styles.text}>{memo.note || memo.translatedText || "(No Hint)"}</Text>
          <Text style={styles.subText}>Tap to reveal answer</Text>
        </View>

        {/* Back Side (Answer/Word) */}
        <View style={[styles.card, styles.cardBack, isRevealed ? styles.visible : styles.hidden]}>
          <Text style={styles.text}>{memo.originalText}</Text>
          {memo.evaluationText && (
              <Text style={styles.subText}>({memo.evaluationText})</Text>
          )}
        </View>
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
    borderWidth: 1,
    borderColor: Colors.border,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    backgroundColor: Colors.card,
  },
  visible: {
    opacity: 1,
    zIndex: 1,
  },
  hidden: {
    opacity: 0,
    zIndex: 0,
  },
  text: {
    color: Colors.foreground,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subText: {
    color: Colors.mutedForeground,
    marginTop: 10,
  },
  category: {
    marginTop: 20,
    color: Colors.primary,
    fontWeight: '600',
  },
});
