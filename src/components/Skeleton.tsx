import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@theme/useTheme';
import { spacing, borderRadius } from '@theme/tokens';

function Shimmer({ style }: { style?: any }) {
  const { colors } = useTheme();
  const x = useSharedValue(-160);

  useEffect(() => {
    x.value = withRepeat(withTiming(360, { duration: 1400, easing: Easing.linear }), -1, true);
  }, [x]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={[styles.shimmer, { backgroundColor: colors.glassSurface }, style]}>
      <Animated.View style={[styles.shine, { backgroundColor: colors.glassBorder }, animated]} />
    </View>
  );
}

export function SkeletonText({ width = '80%', style }: { width?: string | number; style?: any }) {
  return <Shimmer style={[styles.text, { width }, style]} />;
}

export function SkeletonTitle({ width = '45%', style }: { width?: string | number; style?: any }) {
  return <Shimmer style={[styles.title, { width }, style]} />;
}

export function SkeletonCircle({ size = 44, style }: { size?: number; style?: any }) {
  return <Shimmer style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

export function SkeletonCard({ style }: { style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={styles.cardRow}>
        <SkeletonCircle size={40} />
        <View style={styles.cardBody}>
          <SkeletonTitle width="55%" />
          <SkeletonText width="35%" />
        </View>
      </View>
      <SkeletonText width="70%" style={styles.cardLine} />
      <SkeletonText width="40%" />
    </View>
  );
}

export function SkeletonItem({ style }: { style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={styles.itemRow}>
        <SkeletonCircle size={48} />
        <View style={styles.itemBody}>
          <SkeletonTitle width="50%" />
          <SkeletonText width="30%" />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5, style }: { count?: number; style?: any }) {
  return (
    <View style={[styles.list, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.listItem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  shine: {
    width: 120,
    height: '100%',
    opacity: 0.5,
  },
  text: {
    height: 14,
    borderRadius: 7,
    marginBottom: spacing.sm,
  },
  title: {
    height: 18,
    borderRadius: 9,
    marginBottom: spacing.sm,
  },
  circle: {
    overflow: 'hidden',
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardLine: {
    marginTop: spacing.sm,
  },
  item: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  list: {
    padding: spacing.lg,
  },
  listItem: {
    marginBottom: spacing.md,
  },
});
