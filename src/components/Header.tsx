import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { useResponsive } from '@hooks/useResponsive';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export function Header({ title, subtitle, showBack = true, rightAction, onBack }: HeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { isDesktop } = useResponsive();

  return (
    <View style={styles.container}>
      {showBack && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack || (() => router.back())}
          style={[styles.backButton, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
      )}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.primaryText }, isDesktop && styles.titleDesktop]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{subtitle}</Text>}
      </View>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
  },
  titleDesktop: {
    fontSize: typography.sizes.xl,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  rightAction: {
    marginLeft: spacing.md,
  },
});
