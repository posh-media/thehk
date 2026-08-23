import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, SectionHeader, ServiceCard, TransactionCard, EmptyState, LoadingState, ErrorState, AnnouncementMarquee } from '@components';
import { useResponsive } from '@hooks/useResponsive';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { Wallet, Transaction, Service } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDesktop } = useResponsive();
  const [hideBalance, setHideBalance] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [w, t, s] = await Promise.all([
          repositories.wallet.getWallet(user?.id || ''),
          repositories.transaction.getTransactions(user?.id || '', { limit: 5 }),
          repositories.service.getServices(),
        ]);
        setWallet(w);
        setTransactions(t);
        setServices(s.slice(0, 6));
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();

    // Announcements are non-critical, best-effort content - a failure here
    // should never block the rest of the dashboard from loading.
    repositories.admin.getPlatformConfig()
      .then((config) => setAnnouncements(config.announcements))
      .catch(() => setAnnouncements([]));
  }, [user?.id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

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
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Wallet Balance</Text>
            <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
              <Ionicons name={hideBalance ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.balance, { color: colors.primaryText }]}>
            {hideBalance ? '****' : formatCurrency(wallet?.balance || 0)}
          </Text>
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
            <TouchableOpacity style={styles.action} onPress={() => router.push('/services/smm')}>
              <View style={[styles.actionIcon, { backgroundColor: colors.surface }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.primaryText }]}>SMM</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <AnnouncementMarquee announcements={announcements} />

        <SectionHeader title="Services" action="View All" onAction={() => router.push('/(tabs)/services')} />
        <View style={styles.servicesGrid}>
          {services.map((s) => (
            <ServiceCard key={s.id} item={s} onPress={() => router.push((s.route || '/(tabs)/services') as any)} size={isDesktop ? 'sm' : 'md'} />
          ))}
        </View>

        <SectionHeader title="Recent Transactions" action="See All" onAction={() => router.push('/wallet/transactions')} />
        {transactions.length === 0 ? (
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
    marginBottom: spacing.xl,
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
});
