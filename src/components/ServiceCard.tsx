import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';
import { Service, ServiceCategory } from '@/types/domain';
import { GlassCard } from './GlassCard';

interface ServiceCardProps {
  item: Service | ServiceCategory;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function ServiceCard({ item, onPress, size = 'md' }: ServiceCardProps) {
  const { colors } = useTheme();
  const isCategory = 'color' in item;
  const icon = isCategory ? item.icon : item.icon;
  const color = isCategory ? item.color : colors.primary;
  const name = item.name;

  const isSmall = size === 'sm';

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.container, isSmall && styles.smallContainer]}>
      <GlassCard style={[styles.card, isSmall && styles.smallCard]} blur={false}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${color}20`, borderColor: `${color}30` },
            isSmall && styles.smallIconContainer,
          ]}
        >
          <Ionicons name={icon as any} size={isSmall ? 22 : 28} color={color} />
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, { color: colors.primaryText }, isSmall && styles.smallName]}>
            {name}
          </Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '25%',
    padding: spacing.xs,
    alignSelf: 'stretch',
  },
  smallContainer: {
    width: '20%',
    alignSelf: 'stretch',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: spacing.md,
    minHeight: 88,
  },
  smallCard: {
    flex: 1,
    padding: spacing.sm,
    minHeight: 72,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  smallIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
    textAlign: 'center',
  },
  smallName: {
    fontSize: 10,
  },
});
