import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, SectionHeader, LoadingState, ErrorState, EmptyState } from '@components';
import { ReferralSummary, Reward } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { formatCurrency } from '@lib/formatters';
import { useAuthStore } from '@stores/authStore';

export default function RewardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [s, rw] = await Promise.all([
          repositories.rewards.getReferralSummary(),
          repositories.rewards.getRewards(user?.id || ''),
        ]);
        setSummary(s);
        setRewards(rw);
      } catch (err: any) {
        setError(err.message || 'Failed to load rewards');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

  const referrals = summary?.referrals || [];
  const referralLink = summary?.referralCode ? `https://the-hk.com/ref/${summary.referralCode}` : '';

  async function handleCopy() {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    Alert.alert('Copied', 'Referral link copied to clipboard');
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.primaryText }]}>Rewards & Referrals</Text>

        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Referral Balance</Text>
          <Text style={[styles.balance, { color: colors.primaryText }]}>{formatCurrency(summary?.balance || 0)}</Text>
          <View style={styles.stats}>
            <View>
              <Text style={[styles.statValue, { color: colors.primaryText }]}>{summary?.totalReferrals || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Referrals</Text>
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.primaryText }]}>{rewards.length}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Available Rewards</Text>
            </View>
          </View>
        </GlassCard>

        <SectionHeader title="Your Referral Link" />
        <GlassCard style={styles.linkCard}>
          <Text style={[styles.link, { color: colors.primaryText }]} numberOfLines={1}>{referralLink || 'Loading…'}</Text>
          <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.primary }]} onPress={handleCopy}>
            <Text style={[styles.copyText, { color: colors.inverseText }]}>Copy Link</Text>
          </TouchableOpacity>
        </GlassCard>

        <SectionHeader title="Referred Users" action="View All" onAction={() => router.push('/rewards/referrals')} />
        {referrals.length === 0 ? (
          <EmptyState icon="people-outline" title="No referrals yet" description="Share your link to start earning" />
        ) : (
          referrals.slice(0, 3).map((r) => (
            <GlassCard key={r.id} style={styles.referralCard} blur={false}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.glassSurface }]}>
                  <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.name, { color: colors.primaryText }]}>Referred User</Text>
                  <Text style={[styles.status, { color: colors.secondaryText }]}>{r.status}</Text>
                </View>
                <Text style={[styles.amount, { color: colors.primary }]}>
                  {r.status === 'rewarded' ? formatCurrency(r.rewardAmount) : '—'}
                </Text>
              </View>
            </GlassCard>
          ))
        )}

        <View style={styles.quickLinks}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/rewards/vouchers')} style={[styles.quickLink, { backgroundColor: colors.surface }]}>
            <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
            <Text style={[styles.quickLinkText, { color: colors.primaryText }]}>Vouchers</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/rewards/points')} style={[styles.quickLink, { backgroundColor: colors.surface }]}>
            <Ionicons name="star-outline" size={20} color={colors.primary} />
            <Text style={[styles.quickLinkText, { color: colors.primaryText }]}>HK Points</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/rewards/cashback')} style={[styles.quickLink, { backgroundColor: colors.surface }]}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <Text style={[styles.quickLinkText, { color: colors.primaryText }]}>Cashback</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="Available Rewards" action="See Vouchers" onAction={() => router.push('/rewards/vouchers')} />
        {rewards.length === 0 ? (
          <EmptyState icon="gift-outline" title="No rewards available" description="Check back later for new rewards" />
        ) : (
          rewards.map((r) => (
            <GlassCard key={r.id} style={styles.rewardCard} blur={false}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.glassSurface }]}>
                  <Ionicons name="gift" size={18} color={colors.primary} />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.name, { color: colors.primaryText }]}>{r.title}</Text>
                  <Text style={[styles.status, { color: colors.secondaryText }]}>{r.description}</Text>
                </View>
                <Text style={[styles.points, { color: colors.primary }]}>{r.pointsCost} pts</Text>
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
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.lg,
  },
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
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  status: {
    fontSize: typography.sizes.sm,
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
  },
  points: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
  },
  referralCard: {
    marginBottom: spacing.md,
  },
  rewardCard: {
    marginBottom: spacing.md,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  quickLinkText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
});
