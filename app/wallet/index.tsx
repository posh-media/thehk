import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, SectionHeader, TransactionCard, SkeletonList, ErrorState, EmptyState } from '@components';
import { Wallet, Transaction } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatCurrency } from '@lib/formatters';

export default function WalletScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [w, t] = await Promise.all([
          repositories.wallet.getWallet(user?.id || ''),
          repositories.transaction.getTransactions(user?.id || '', { limit: 5 }),
        ]);
        setWallet(w);
        setTransactions(t);
      } catch (err: any) {
        setError(err.message || 'Failed to load wallet');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.inner}>
          <Text style={[styles.title, { color: colors.primaryText }]}>Wallet</Text>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primaryText }]}>Wallet</Text>

        <GlassCard style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Current Wallet Balance</Text>
            <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
              <Ionicons name={hideBalance ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.balance, { color: colors.primaryText }]}>
            {hideBalance ? '****' : formatCurrency(wallet?.balance || 0)}
          </Text>
        </GlassCard>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.action, { backgroundColor: colors.primary }]} onPress={() => router.push('/wallet/fund')}>
            <Ionicons name="add" size={20} color={colors.inverseText} />
            <Text style={[styles.actionText, { color: colors.inverseText }]}>Fund Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.action, { backgroundColor: colors.surface }]} onPress={() => router.push('/wallet/withdraw')}>
            <Ionicons name="arrow-down" size={20} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primaryText }]}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="Recent Transactions" action="See All" onAction={() => router.push('/wallet/transactions')} />
        {transactions.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No transactions yet" description="Your wallet activity will appear here" />
        ) : (
          transactions.map((t) => <TransactionCard key={t.id} transaction={t} onPress={() => router.push(`/wallet/transaction/${t.id}` as any)} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.lg,
  },
  balanceCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(114, 198, 69, 0.08)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  balanceLabel: {
    fontSize: typography.sizes.sm,
  },
  balance: {
    fontSize: 36,
    fontWeight: typography.weights.bold as any,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  actionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
});
