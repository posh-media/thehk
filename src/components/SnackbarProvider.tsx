import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setToastListener } from '@lib/toast';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';

const VISIBLE_DURATION_MS = 2500;
const FADE_DURATION_MS = 300;

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    setToastListener((msg) => {
      setMessage(msg);
      setVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      Animated.timing(opacity, { toValue: 1, duration: FADE_DURATION_MS, useNativeDriver: Platform.OS !== 'web' }).start();
      hideTimer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: FADE_DURATION_MS, useNativeDriver: Platform.OS !== 'web' }).start(() => setVisible(false));
      }, VISIBLE_DURATION_MS);
    });

    return () => {
      setToastListener(null);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [opacity]);

  return (
    <>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            { backgroundColor: colors.primaryText, bottom: insets.bottom + spacing.lg, left: spacing.lg, right: spacing.lg },
            { opacity },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.text, { color: colors.background }]}>{message}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    textAlign: 'center',
  },
});
