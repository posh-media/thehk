import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, Header, LoadingState, ErrorState, EmptyState } from '@components';
import { SocialProfile } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';

const platformIconMap: Record<string, string> = {
  WhatsApp: 'logo-whatsapp',
  Instagram: 'logo-instagram',
  Snapchat: 'logo-snapchat',
  TikTok: 'logo-tiktok',
  Facebook: 'logo-facebook',
  Twitter: 'logo-twitter',
  X: 'logo-twitter',
  YouTube: 'logo-youtube',
  Telegram: 'paper-plane',
  LinkedIn: 'logo-linkedin',
};

function getPlatformIcon(platform: string): string {
  return platformIconMap[platform] || 'globe-outline';
}

export default function SocialAccountsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await repositories.socialProfile.getProfiles(user?.id || '');
      setProfiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load social accounts');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && profiles.length === 0) return <LoadingState />;
  if (error && profiles.length === 0) return <ErrorState message={error} onRetry={load} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="My Social Accounts" />

        {profiles.length === 0 ? (
          <EmptyState
            icon="share-social-outline"
            title="No social accounts yet"
            description="Add your social accounts to speed up future orders"
            action="Add Account"
            onAction={() => router.push('/social/add')}
          />
        ) : (
          <View style={styles.list}>
            {profiles.map((profile) => (
              <GlassCard key={profile.id} style={styles.card} blur={false}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
                    <Ionicons name={getPlatformIcon(profile.platform) as any} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.content}>
                    <Text style={[styles.platform, { color: colors.secondaryText }]}>{profile.platform}</Text>
                    <Text style={[styles.displayName, { color: colors.primaryText }]}>{profile.displayName}</Text>
                    <Text style={[styles.username, { color: colors.secondaryText }]}>{profile.username}</Text>
                    {(profile.profileUrl || profile.notes) && (
                      <Text style={[styles.detail, { color: colors.mutedText }]} numberOfLines={1}>
                        {profile.profileUrl || profile.notes}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/social/add', params: { id: profile.id } })}
                    style={[styles.editButton, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}
                  >
                    <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <GlassButton
          title="Add New Social Account"
          leftIcon={<Ionicons name="add-circle-outline" size={20} color={colors.inverseText} />}
          onPress={() => router.push('/social/add')}
          style={styles.addButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  list: {
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  platform: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  displayName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  username: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  detail: {
    fontSize: typography.sizes.xs,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  editText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  addButton: {
    marginTop: spacing.lg,
  },
});
