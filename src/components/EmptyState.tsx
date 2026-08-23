import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassButton } from './GlassButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'cube-outline', title, description, action, onAction }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
        <Ionicons name={icon as any} size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.secondaryText }]}>{description}</Text>}
      {action && onAction && (
        <GlassButton title={action} variant="outline" onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  action: {
    minWidth: 160,
  },
});
