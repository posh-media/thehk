import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, LoadingState, ErrorState, EmptyState, StatusBadge } from '@components';
import { ReferralSummary } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatCurrency } from '@lib/formatters';

const shareOptions = [
  { label: 'Copy', icon: 'copy-outline' },
  { label: 'Share', icon: 'share-outline' },
];

export default function ReferralsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const referralLink = summary?.referralCode ? `https://the-hk.com/ref/${summary.referralCode}` : '';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await repositories.rewards.getReferralSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const referrals = summary?.referrals || [];

  const handleCopy = async () => {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    Alert.alert('Copied', 'Referral link copied to clipboard');
  };

  const handleShare = async (option: typeof shareOptions[0]) => {
    if (option.label === 'Copy') {
      await handleCopy();
      return;
    }
    try {
      await Share.share({ message: `Join me on THE-HK! ${referralLink}` });
    } catch {
      // user cancelled the share sheet - nothing to do
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Referrals" />

        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Referral Balance</Text>
          <Text style={[styles.balance, { color: colors.primaryText }]}>{formatCurrency(summary?.balance || 0)}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primaryText }]}>{summary?.totalReferrals || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Referrals</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primaryText }]}>{summary?.successfulReferrals || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Rewarded</Text>
            </View>
          </View>
          {(summary?.balance || 0) > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/rewards/points')}
              style={[styles.convertButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.convertButtonText, { color: colors.inverseText }]}>Convert to HK Points</Text>
            </TouchableOpacity>
          )}
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Referral Link</Text>
        <GlassCard style={styles.linkCard}>
          <Text style={[styles.link, { color: colors.primaryText }]} numberOfLines={1}>
            {referralLink}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCopy}
            style={[styles.copyButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.copyText, { color: colors.inverseText }]}>Copy</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Share Options</Text>
        <View style={styles.shareRow}>
          {shareOptions.map((option) => (
            <TouchableOpacity
              key={option.label}
              activeOpacity={0.8}
              onPress={() => handleShare(option)}
              style={[styles.shareButton, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}
            >
              <Ionicons name={option.icon as any} size={22} color={colors.primary} />
              <Text style={[styles.shareLabel, { color: colors.secondaryText }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Referred Users</Text>
        {referrals.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No referrals yet"
            description="Invite friends and earn rewards when they join"
            action="Invite Friends"
            onAction={() => Alert.alert('Share', 'Invite friends via your referral link')}
          />
        ) : (
          referrals.map((referral) => (
            <GlassCard key={referral.id} style={styles.referralCard} blur={false}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.name, { color: colors.primaryText }]}>Referred User</Text>
                  <Text style={[styles.date, { color: colors.mutedText }]}>
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.reward, { color: colors.primary }]}>
                    {referral.status === 'rewarded' ? formatCurrency(referral.rewardAmount) : 'Pending activation'}
                  </Text>
                  <StatusBadge status={referral.status} />
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  balanceCard: {
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  balance: {
    fontSize: 32,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
  },
  convertButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  convertButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  link: {
    fontSize: typography.sizes.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  copyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  copyText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  shareLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  referralCard: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.xs,
  },
  right: {
    alignItems: 'flex-end',
  },
  reward: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
});
