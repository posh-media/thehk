import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';
import { Listing } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';
import { StatusBadge } from './StatusBadge';
import { GlassCard } from './GlassCard';

interface ProductCardProps {
  listing: Listing;
  onPress?: () => void;
  horizontal?: boolean;
}

export function ProductCard({ listing, onPress, horizontal }: ProductCardProps) {
  const { colors } = useTheme();
  const { product, price, stock, status } = listing;

  if (horizontal) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <GlassCard style={styles.horizontalCard} blur={false}>
          <Image source={{ uri: product.images[0] }} style={styles.horizontalImage} />
          <View style={styles.horizontalContent}>
            <Text style={[styles.name, { color: colors.primaryText }]} numberOfLines={1}>{product.name}</Text>
            <Text style={[styles.meta, { color: colors.secondaryText }]}>{product.category} • {product.type}</Text>
            <View style={styles.horizontalFooter}>
              <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(price)}</Text>
              <StatusBadge status={status === 'sold_out' ? 'sold_out' : 'active'} />
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.verticalContainer}>
      <GlassCard style={styles.verticalCard} blur={false}>
        <Image source={{ uri: product.images[0] }} style={styles.verticalImage} />
        <View style={styles.verticalContent}>
          <Text style={[styles.name, { color: colors.primaryText }]} numberOfLines={1}>{product.name}</Text>
          <Text style={[styles.meta, { color: colors.secondaryText }]}>{product.category}</Text>
          <View style={styles.verticalFooter}>
            <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(price)}</Text>
            <Text style={[styles.stock, { color: colors.mutedText }]}>{stock} left</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  verticalContainer: {
    width: '50%',
    padding: spacing.xs,
  },
  verticalCard: {
    padding: 0,
    overflow: 'hidden',
  },
  verticalImage: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  verticalContent: {
    padding: spacing.md,
  },
  horizontalCard: {
    flexDirection: 'row',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  horizontalImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  horizontalContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: typography.sizes.xs,
    marginBottom: spacing.sm,
  },
  horizontalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verticalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
  },
  stock: {
    fontSize: typography.sizes.xs,
  },
});
