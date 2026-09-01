import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton } from '@components';
import { useAuthStore } from '@stores/authStore';
import { useTheme as useThemeContext } from '@theme/ThemeProvider';
import { showToast } from '@lib/toast';
import { repositories } from '@repositories/mockRepository';
import { AdminPlatformConfig } from '@/types/domain';

const menuItems = [
  { label: 'Personal Information', icon: 'person-outline', route: '/profile/personal-info' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/notifications' },
  { label: 'Settings', icon: 'settings-outline', route: '/settings' },
  { label: 'Support', icon: 'headset-outline', route: '/support' },
  { label: 'Terms of Service', icon: 'document-text-outline', route: '/terms' },
  { label: 'Privacy Policy', icon: 'shield-outline', route: '/privacy' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { toggle, resolvedMode } = useThemeContext();
  const [platform, setPlatform] = useState<AdminPlatformConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    repositories.admin.getPlatformConfig()
      .then((config) => { if (!cancelled) setPlatform(config); })
      .catch(() => { if (!cancelled) setPlatform(null); });
    return () => { cancelled = true; };
  }, []);

  const openLink = (url?: string, label?: string) => {
    if (!url || !url.trim().startsWith('http')) {
      showToast(`${label || 'Link'} is not configured yet`);
      return;
    }
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        showToast('Unable to open this link');
      }
    }).catch(() => showToast('Unable to open this link'));
  };

  const sellerLabel = user?.isSeller ? 'Seller Dashboard' : 'Become a Seller';
  const rank = user?.rank || 'Chief';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.profile}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.glassSurface, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: colors.primaryText }]}>{user?.displayName || 'User'}</Text>
              <Text style={[styles.rank, { color: colors.secondaryText }]}>{rank}</Text>
              <Text style={[styles.email, { color: colors.secondaryText }]}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={toggle} style={[styles.themeButton, { backgroundColor: colors.surface }]}>
            <Ionicons name={resolvedMode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.sellerCard} blur>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => showToast('Coming soon')}
            style={styles.sellerRow}
          >
            <Ionicons name={user?.isSeller ? 'storefront' : 'person-add'} size={22} color={colors.primary} />
            <Text style={[styles.sellerLabel, { color: colors.primaryText }]}>{sellerLabel}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
              style={[
                styles.menuItem,
                index !== menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
              ]}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} style={styles.menuIcon} />
              <Text style={[styles.menuLabel, { color: colors.primaryText }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </TouchableOpacity>
          ))}
        </GlassCard>

        <GlassCard style={styles.menuCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openLink(platform?.telegramURL, 'Telegram link')}
            style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
          >
            <Ionicons name="paper-plane-outline" size={20} color={colors.primary} style={styles.menuIcon} />
            <Text style={[styles.menuLabel, { color: colors.primaryText }]}>Join us on Telegram</Text>
            <Ionicons name="open-outline" size={18} color={colors.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openLink(platform?.appDownloadUrl, 'Download link')}
            style={styles.menuItem}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} style={styles.menuIcon} />
            <Text style={[styles.menuLabel, { color: colors.primaryText }]}>Download THE-HK App</Text>
            <Ionicons name="open-outline" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </GlassCard>

        <GlassButton
          title="Logout"
          variant="danger"
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
          style={styles.logout}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.md,
  },
  profileInfo: {},
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  rank: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: typography.sizes.sm,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sellerLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuIcon: {
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
  logout: {
    marginTop: spacing.xl,
  },
});
