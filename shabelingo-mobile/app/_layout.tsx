import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MemoProvider } from '../context/MemoContext';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MemoProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: '#0a0a0f', // Global bg color
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              contentStyle: {
                backgroundColor: '#0a0a0f',
              },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="review" options={{ headerShown: false }} />
            <Stack.Screen name="create" options={{ headerShown: false, presentation: 'modal' }} />
          </Stack>
        </MemoProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
