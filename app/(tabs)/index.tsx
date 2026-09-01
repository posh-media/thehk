import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassCard, SectionHeader, ServiceCard, TransactionCard, EmptyState, ErrorState, AnnouncementMarquee, SkeletonCard, SkeletonList, SkeletonText, SkeletonTitle, SkeletonCircle } from '@components';
import { useResponsive } from '@hooks/useResponsive';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { db } from '@infrastructure/firebase';
import { Wallet, Transaction, Service } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';
import { openService } from '@lib/serviceNavigation';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDesktop } = useResponsive();
  const [hideBalance, setHideBalance] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const refreshWallet = useCallback(async () => {
    if (!user?.id) return;
    setWalletLoading(true);
    setWalletError('');
    try {
      const w = await repositories.wallet.getWallet(user.id);
      setWallet(w);
    } catch (err: any) {
      setWalletError(err.message || 'Failed to load wallet');
    } finally {
      setWalletLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        const t = await repositories.transaction.getTransactions(user?.id || '', { limit: 5 });
        if (!cancelled) setTransactions(t);
      } catch {
        // non-critical: the section can remain empty
      } finally {
        if (!cancelled) setTransactionsLoading(false);
      }
    }

    async function loadServices() {
      try {
        const s = await repositories.service.getServices();
        if (!cancelled) setServices(s);
      } catch {
        // non-critical: the section can remain empty
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    }

    refreshWallet();
    loadTransactions();
    loadServices();

    repositories.admin.getPlatformConfig()
      .then((config) => { if (!cancelled) setAnnouncements(config.announcements); })
      .catch(() => { if (!cancelled) setAnnouncements([]); });

    return () => { cancelled = true; };
  }, [user?.id, refreshWallet]);

  // Real-time wallet listener so the dashboard balance reflects new
  // deposits/purchases without manual pull-to-refresh.
  useEffect(() => {
    if (!user?.id) return undefined;
    return onSnapshot(doc(db, 'wallets', user.id), (snap) => {
      if (snap.exists()) {
        setWallet(snap.data() as Wallet);
        setWalletLoading(false);
        setWalletError('');
      }
    }, (err) => {
      setWalletError(err.message || 'Failed to load wallet');
      setWalletLoading(false);
    });
  }, [user?.id]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <View style={styles.topBar}>
          <View style={styles.greeting}>
            <Text style={[styles.hello, { color: colors.secondaryText }]}>Hello, {user?.firstName || 'User'}</Text>
            <Text style={[styles.welcome, { color: colors.primaryText }]}>Welcome back</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/notifications')} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.primaryText} />
            <View style={[styles.badge, { backgroundColor: colors.error }]} />
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.balanceCard} blur>
          {walletLoading ? (
            <View>
              <SkeletonText width="35%" />
              <SkeletonTitle width="55%" style={{ marginTop: spacing.sm }} />
              <View style={styles.actions}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.action}>
                    <SkeletonCircle size={48} />
                    <SkeletonText width={50} style={{ marginTop: spacing.sm }} />
                  </View>
                ))}
              </View>
            </View>
          ) : walletError ? (
            <ErrorState message={walletError} onRetry={() => { setWalletError(''); setWalletLoading(true); }} />
          ) : (
            <>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>HK Coins Balance</Text>
                <View style={styles.balanceActions}>
                  <TouchableOpacity onPress={refreshWallet} style={styles.refreshButton}>
                    <Ionicons name="refresh-outline" size={20} color={colors.secondaryText} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
                    <Ionicons name={hideBalance ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.balanceRow}>
                <Text style={[styles.balance, { color: colors.primaryText }]}>
                  {hideBalance ? '****' : Math.round(wallet?.hkcBalance || 0).toLocaleString('en-NG')}
                </Text>
                {!hideBalance && (
                  <Text style={[styles.hkcUnit, { color: colors.secondaryText }]}>HKC</Text>
                )}
              </View>
              <View style={[styles.ngnRow, { borderTopColor: colors.divider }]}>
                <Text style={[styles.ngnLabel, { color: colors.secondaryText }]}>NGN Wallet</Text>
                <Text style={[styles.ngnValue, { color: colors.primaryText }]}>
                  {hideBalance ? '****' : formatCurrency(wallet?.balance || 0)}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.action} onPress={() => router.push('/wallet/fund')}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={20} color={colors.inverseText} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.primaryText }]}>Fund</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => router.push('/wallet/withdraw')}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.surface }]}>
                    <Ionicons name="arrow-down" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.primaryText }]}>Withdraw</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => router.push('/wallet/transactions')}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.surface }]}>
                    <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.primaryText }]}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => router.push('/rewards/referrals')}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.surface }]}>
                    <Ionicons name="people" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.primaryText }]}>Refer</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </GlassCard>

        <AnnouncementMarquee announcements={announcements} />

        <SectionHeader title="Services" action="View All" onAction={() => router.push('/(tabs)/services')} />
        <View style={styles.servicesGrid}>
          {servicesLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={styles.serviceSkeletonWrapper}>
                  <SkeletonCard style={styles.serviceSkeleton} />
                </View>
              ))
            : [
                ...services
                  .filter((s) => s.isPopular && s.visible !== false)
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .slice(0, 7),
                { id: 'svc-more', name: 'More', icon: 'grid', route: '/(tabs)/services', isPopular: true, visible: true, implemented: true, categoryId: 'cat-upcoming', sortOrder: 99, description: 'View all services' } as Service,
              ].map((s) => (
                <ServiceCard key={s.id} item={s} onPress={() => openService(router, s)} size="md" />
              ))}
        </View>

        <SectionHeader title="Recent Transactions" action="See All" onAction={() => router.push('/wallet/transactions')} />
        {transactionsLoading ? (
          <SkeletonList count={3} />
        ) : transactions.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No transactions yet" description="Your recent activity will appear here" />
        ) : (
          transactions.map((t) => <TransactionCard key={t.id} transaction={t} onPress={() => router.push(`/wallet/transaction/${t.id}`)} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  greeting: {},
  hello: {
    fontSize: typography.sizes.sm,
  },
  welcome: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: 'rgba(114, 198, 69, 0.08)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceLabel: {
    fontSize: typography.sizes.sm,
  },
  balance: {
    fontSize: 36,
    fontWeight: typography.weights.bold as any,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  hkcUnit: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
  balanceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  ngnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginBottom: spacing.xl,
  },
  ngnLabel: {
    fontSize: typography.sizes.sm,
  },
  ngnValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  action: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.xl,
  },
  serviceSkeletonWrapper: {
    width: '50%',
    padding: spacing.xs,
  },
  serviceSkeleton: {
    height: 120,
  },
});
