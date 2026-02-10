import { Colors } from '../constants/Colors';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { MemoProvider } from '../context/MemoContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <MemoProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: Colors.background,
                },
                headerTintColor: Colors.foreground,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                contentStyle: {
                  backgroundColor: Colors.background,
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
    </View>
  );
}
