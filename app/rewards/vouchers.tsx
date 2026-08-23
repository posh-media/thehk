import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, Header, SkeletonList, ErrorState, EmptyState } from '@components';
import { VoucherCatalogItem, UserVoucher } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { formatCurrency, formatDate } from '@lib/formatters';

type Tab = 'available' | 'mine';

const statusColorKey: Record<UserVoucher['status'], 'success' | 'warning' | 'error' | 'info'> = {
  issued: 'success',
  redeemed: 'info',
  expired: 'error',
  locked: 'warning',
};

// Reward Vouchers (Phase 4 continuation). "Available" is the shared catalog
// (claimed by spending HK Points where the voucher has a cost); "My
// Vouchers" are the instances issued to this user. Redeeming a
// `wallet_credit` voucher immediately credits the wallet - see
// functions/src/services/rewardsService.ts for why other usage types
// aren't supported yet.
export default function VouchersScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('available');
  const [catalog, setCatalog] = useState<VoucherCatalogItem[]>([]);
  const [myVouchers, setMyVouchers] = useState<UserVoucher[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [c, mine, points] = await Promise.all([
        repositories.rewards.getVoucherCatalog(),
        repositories.rewards.getMyVouchers(),
        repositories.rewards.getPointsBalance(),
      ]);
      setCatalog(c);
      setMyVouchers(mine);
      setPointsBalance(points.balance);
    } catch (err: any) {
      setError(err.message || 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClaim(voucher: VoucherCatalogItem) {
    setBusyId(voucher.id);
    try {
      await repositories.rewards.claimVoucher(voucher.id);
      Alert.alert('Voucher Claimed', `"${voucher.title}" has been added to your vouchers.`);
      await load();
      setTab('mine');
    } catch (err: any) {
      Alert.alert('Could not claim voucher', err.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRedeem(voucher: UserVoucher) {
    setBusyId(voucher.id);
    try {
      await repositories.rewards.redeemVoucher(voucher.id);
      Alert.alert('Voucher Redeemed', `${formatCurrency(voucher.value)} has been credited to your wallet.`);
      await load();
    } catch (err: any) {
      Alert.alert('Could not redeem voucher', err.message || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Vouchers" />
        <SkeletonList count={5} />
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Vouchers" />

        <View style={styles.tabs}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setTab('available')} style={[styles.tab, { backgroundColor: tab === 'available' ? colors.primary : colors.surface }]}>
            <Text style={[styles.tabText, { color: tab === 'available' ? colors.inverseText : colors.primaryText }]}>Available</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setTab('mine')} style={[styles.tab, { backgroundColor: tab === 'mine' ? colors.primary : colors.surface }]}>
            <Text style={[styles.tabText, { color: tab === 'mine' ? colors.inverseText : colors.primaryText }]}>My Vouchers</Text>
          </TouchableOpacity>
        </View>

        {tab === 'available' && (
          <>
            <Text style={[styles.pointsHint, { color: colors.secondaryText }]}>HK Points balance: {pointsBalance.toLocaleString()} pts</Text>
            {catalog.length === 0 ? (
              <EmptyState icon="pricetag-outline" title="No vouchers available" description="Check back later for new vouchers" />
            ) : (
              catalog.map((v) => (
                <GlassCard key={v.id} style={styles.card} blur={false}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.icon, { backgroundColor: colors.glassSurface }]}>
                      <Ionicons name="pricetag" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={[styles.title, { color: colors.primaryText }]}>{v.title}</Text>
                      <Text style={[styles.description, { color: colors.secondaryText }]}>{v.description}</Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: colors.secondaryText }]}>Value</Text>
                    <Text style={[styles.metaValue, { color: colors.primary }]}>{formatCurrency(v.value)}</Text>
                  </View>
                  {v.usageRestrictions ? (
                    <Text style={[styles.restrictions, { color: colors.mutedText }]}>{v.usageRestrictions}</Text>
                  ) : null}
                  <GlassButton
                    title={v.pointsCost > 0 ? `Claim for ${v.pointsCost.toLocaleString()} pts` : 'Claim Free'}
                    onPress={() => handleClaim(v)}
                    loading={busyId === v.id}
                    disabled={v.pointsCost > pointsBalance}
                    style={styles.button}
                  />
                </GlassCard>
              ))
            )}
          </>
        )}

        {tab === 'mine' && (
          myVouchers.length === 0 ? (
            <EmptyState icon="gift-outline" title="No vouchers yet" description="Claim a voucher from the Available tab" />
          ) : (
            myVouchers.map((v) => (
              <GlassCard key={v.id} style={styles.card} blur={false}>
                <View style={styles.cardHeader}>
                  <View style={[styles.icon, { backgroundColor: colors.glassSurface }]}>
                    <Ionicons name="gift" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.title, { color: colors.primaryText }]}>{v.title}</Text>
                    <Text style={[styles.description, { color: colors.secondaryText }]}>{v.description}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${colors[statusColorKey[v.status]]}20` }]}>
                    <Text style={[styles.statusText, { color: colors[statusColorKey[v.status]] }]}>{v.status}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.secondaryText }]}>Value</Text>
                  <Text style={[styles.metaValue, { color: colors.primary }]}>{formatCurrency(v.value)}</Text>
                </View>
                <Text style={[styles.date, { color: colors.mutedText }]}>
                  Issued {formatDate(v.issuedAt)}{v.expiresAt ? ` • Expires ${formatDate(v.expiresAt)}` : ''}
                </Text>
                {v.status === 'issued' && (
                  <GlassButton
                    title="Redeem to Wallet"
                    onPress={() => handleRedeem(v)}
                    loading={busyId === v.id}
                    style={styles.button}
                  />
                )}
              </GlassCard>
            ))
          )
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  tabs: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.full },
  tabText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
  pointsHint: { fontSize: typography.sizes.sm, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', marginBottom: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  cardContent: { flex: 1 },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  description: { fontSize: typography.sizes.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  metaLabel: { fontSize: typography.sizes.sm },
  metaValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any },
  restrictions: { fontSize: typography.sizes.xs, marginBottom: spacing.md },
  date: { fontSize: typography.sizes.xs, marginBottom: spacing.md },
  button: { marginTop: spacing.xs },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  statusText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold as any, textTransform: 'capitalize' },
});
