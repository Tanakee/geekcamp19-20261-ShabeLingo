import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons'; // Use vector icons
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signInAsGuest } = useAuth();
  const [loading, setLoading] = useState<'google' | 'apple' | 'guest' | null>(null);

  const handleGoogleLogin = async () => {
    // TODO: Implement Google Sign-In for Expo
    // Requires expo-auth-session and Google Cloud configuration
    Alert.alert("Coming Soon", "Google Sign-In will be implemented shortly.");
  };

  const handleAppleLogin = async () => {
    // TODO: Implement Apple Sign-In
    Alert.alert("Coming Soon", "Apple Sign-In will be implemented shortly.");
  };

  const handleGuestLogin = async () => {
    setLoading('guest');
    try {
      await signInAsGuest();
      // AuthContext will handle redirection to '/' automatically upon user state change
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to sign in as guest.");
      setLoading(null);
    }
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
          
          <View style={styles.divider}>
             <Text style={styles.dividerText}>OR</Text>
          </View>

          <Button
            onPress={handleGuestLogin}
            loading={loading === 'guest'}
            variant="secondary"
            icon={<MaterialIcons name="person-outline" size={22} color="#000" />}
            title="Continue as Guest"
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
  divider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerText: {
    color: Colors.mutedForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  termsText: {
    marginTop: 16,
    fontSize: 12,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
});
