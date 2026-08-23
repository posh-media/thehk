import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabs = [
  { name: 'Home', path: '/(tabs)', icon: 'home' },
  { name: 'Services', path: '/(tabs)/services', icon: 'grid' },
  { name: 'Marketplace', path: '/(tabs)/marketplace', icon: 'cart' },
  { name: 'Rewards', path: '/(tabs)/rewards', icon: 'gift' },
  { name: 'Me', path: '/(tabs)/me', icon: 'person' },
];

export function BottomNav() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.glassSurface,
          borderColor: colors.glassBorder,
          paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.sm,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isIndex = tab.path === '/(tabs)';
        const isActive = pathname === tab.path || (isIndex && pathname === '/(tabs)/index');
        const iconName = isActive ? tab.icon : (`${tab.icon}-outline` as any);

        return (
          <TouchableOpacity
            key={tab.name}
            activeOpacity={0.7}
            onPress={() => router.replace(tab.path as any)}
            style={styles.tab}
          >
            {isActive ? (
              <View style={[styles.pill, { backgroundColor: colors.surface }]}>
                <Ionicons name={iconName} size={20} color={colors.primaryText} />
                <Text style={[styles.pillLabel, { color: colors.primaryText }]}>{tab.name}</Text>
              </View>
            ) : (
              <Ionicons name={iconName} size={24} color={colors.mutedText} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  pillLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
});
