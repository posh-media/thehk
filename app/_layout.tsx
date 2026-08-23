import React, { useEffect, useState } from 'react';
import { BackHandler, ToastAndroid } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@theme/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Importing the repository barrel initializes the Firebase auth listener
// and restores the user's persisted session on app startup.
import '@repositories/mockRepository';

function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const [lastBack, setLastBack] = useState(0);

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        return false;
      }
      // On a non-home tab root, go home instead of exiting.
      if (pathname !== '/(tabs)' && pathname !== '/(tabs)/index' && pathname.startsWith('/(tabs)')) {
        router.replace('/(tabs)' as any);
        return true;
      }
      if (pathname === '/(tabs)' || pathname === '/(tabs)/index') {
        const now = Date.now();
        if (now - lastBack < 2000) {
          BackHandler.exitApp();
          return true;
        }
        setLastBack(now);
        ToastAndroid?.show('Press back again to exit', ToastAndroid.SHORT);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [pathname, lastBack]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function RootLayoutContent() {
  const { colors, resolvedMode } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <BackButtonHandler />
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RootLayoutContent />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
