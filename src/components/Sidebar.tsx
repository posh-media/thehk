import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';
import { useAuthStore } from '@stores/authStore';
import { GlassCard } from './GlassCard';

const navItems = [
  { name: 'Home', path: '/(tabs)', icon: 'home', route: '/(tabs)' },
  { name: 'Services', path: '/(tabs)/services', icon: 'grid', route: '/(tabs)/services' },
  { name: 'Marketplace', path: '/(tabs)/marketplace', icon: 'cart', route: '/(tabs)/marketplace' },
  { name: 'Rewards', path: '/(tabs)/rewards', icon: 'trophy', route: '/(tabs)/rewards' },
  { name: 'Wallet', path: '/wallet', icon: 'wallet', route: '/wallet' },
  { name: 'Transactions', path: '/wallet/transactions', icon: 'swap-horizontal', route: '/wallet/transactions' },
  { name: 'Profile', path: '/(tabs)/me', icon: 'person', route: '/(tabs)/me' },
  { name: 'Settings', path: '/settings', icon: 'settings', route: '/settings' },
  { name: 'Support', path: '/support', icon: 'headset', route: '/support' },
];

export function Sidebar() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.logo}>
        <Text style={[styles.logoText, { color: colors.primary }]}>THE</Text>
        <Text style={[styles.logoText, { color: colors.primaryText }]}>HK</Text>
      </View>
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <TouchableOpacity
              key={item.name}
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
              style={[
                styles.item,
                isActive && { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder },
              ]}
            >
              <Ionicons name={item.icon as any} size={20} color={isActive ? colors.primary : colors.secondaryText} />
              <Text style={[styles.itemText, { color: isActive ? colors.primaryText : colors.secondaryText }]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity activeOpacity={0.8} onPress={signOut} style={styles.logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    padding: spacing.lg,
  },
  logo: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
  },
  nav: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    marginLeft: spacing.md,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  logoutText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    marginLeft: spacing.md,
  },
});
