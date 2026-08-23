import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing } from '@theme/tokens';
import { TransactionCard, SkeletonList, ErrorState, EmptyState, Header } from '@components';
import { Transaction } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!refreshing) setLoading(true);
      setError('');
      try {
        const data = await repositories.transaction.getTransactions(user?.id || '', { limit: 50 });
        if (!cancelled) setTransactions(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load transactions');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, retry]);

  const onRefresh = () => {
    setRefreshing(true);
    setRetry((r) => r + 1);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Transactions" />
        <SkeletonList count={5} />
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => setRetry((r) => r + 1)} />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <View style={styles.inner}>
        <Header title="Transactions" />
        {transactions.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No transactions yet" description="Your transaction history will appear here" />
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
});
