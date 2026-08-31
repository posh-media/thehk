import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@theme/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '@stores/authStore';

// Importing the repository barrel initializes the Firebase auth listener
// and restores the user's persisted session on app startup.
import '@repositories/mockRepository';

const HOME_PATHS = new Set(['/(tabs)', '/(tabs)/index']);
const TAB_ROOT_PREFIX = '/(tabs)';
const DOUBLE_TAP_MS = 2000;

function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const lastBackPress = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      // Let Expo Router handle normal back navigation whenever a screen
      // history exists (child/detail pages -> previous page).
      if (router.canGoBack()) {
        return false;
      }

      const isHome = HOME_PATHS.has(pathname);
      const isTabRoot = pathname.startsWith(TAB_ROOT_PREFIX);

      // On a non-home tab root, navigate home instead of exiting.
      if (!isHome && isTabRoot) {
        router.replace('/(tabs)' as any);
        return true;
      }

      // On Home, implement the standard Android double-back-to-exit.
      if (isHome) {
        const now = Date.now();
        if (now - lastBackPress.current < DOUBLE_TAP_MS) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPress.current = now;
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        return true;
      }

      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [pathname, router]);

  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
      return unsub;
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const firstSegment = segments[0];
    const isAuthGroup = firstSegment === '(auth)';
    const isPaymentSuccess = (segments as string[]).includes('payment-success');
    const isPublicRoute = isAuthGroup || isPaymentSuccess;

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && isAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [hydrated, isAuthenticated, segments, router, user]);

  if (!hydrated) return null;
  return <>{children}</>;
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
      <AuthGuard>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AuthGuard>
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
