import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons'; // Use FontAwesome for standard brand logos
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  const handleGoogleLogin = async () => {
    setLoading('google');
    console.log('Google Login Pressed');
    
    // TODO: Implement actual login logic in Issue #15
    setTimeout(() => {
      setLoading(null);
      // 仮の遷移
      router.replace('/');
    }, 1500);
  };

  const handleAppleLogin = async () => {
    setLoading('apple');
    console.log('Apple Login Pressed');

    // TODO: Implement actual login logic in Issue #15
    setTimeout(() => {
      setLoading(null);
      // 仮の遷移
      router.replace('/');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.content}>
        {/* Header / Logo Section */}
        <View style={styles.header}>
          <Text style={styles.title}>ShabeLingo</Text>
          <Text style={styles.subtitle}>
            Speak, Record, Remember.
          </Text>
        </View>

        {/* Login Actions */}
        <View style={styles.actions}>
          <Button
            onPress={handleGoogleLogin}
            loading={loading === 'google'}
            style={styles.googleButton}
            textStyle={styles.googleButtonText}
            icon={<FontAwesome name="google" size={20} color="#0f172a" />}
            title="Continue with Google"
          />

          <Button
            onPress={handleAppleLogin}
            loading={loading === 'apple'}
            style={styles.appleButton}
            icon={<FontAwesome name="apple" size={22} color="#ffffff" />}
            title="Continue with Apple"
          />
          
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
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
  content: {
    flex: 1,
    padding: Layout.padding * 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: -1,
    textShadowColor: 'rgba(157, 78, 221, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  googleButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  termsText: {
    marginTop: 16,
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
});
