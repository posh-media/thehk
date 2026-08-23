import React from 'react';
import { View, StyleSheet, ViewProps, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing } from '@theme/tokens';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  blur?: boolean;
  intensity?: number;
  elevated?: boolean;
}

export function GlassCard({ children, style, blur = true, intensity = 20, elevated = false, ...props }: GlassCardProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.glassSurface,
          borderColor: colors.glassBorder,
          ...(elevated ? { backgroundColor: colors.surfaceElevated } : {}),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );

  if (!blur) return content;

  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.blur, style]} {...props}>
      <View style={[styles.inner, { borderColor: colors.glassBorder }]}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  blur: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  inner: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
