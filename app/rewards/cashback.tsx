import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, LoadingState, ErrorState, EmptyState } from '@components';
import { CashbackTransaction } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { formatCurrency, formatDate } from '@lib/formatters';

const typeIcon: Record<CashbackTransaction['type'], string> = {
  earned: 'trending-up-outline',
  spent: 'cart-outline',
  adjustment: 'sync-outline',
};

// Cashback (Phase 4 continuation). The balance/history shown here is real
// and server-authoritative (functions/src/services/cashbackService.ts),
// but no order flow awards cashback automatically yet - the exact
// calculation/eligibility rules haven't been defined. See
// PHASE_4_CONTINUATION_REPORT.md. Spending cashback is demonstrated on the
// Gift Card purchase flow via the reusable payment bottom sheet.
export default function CashbackScreen() {
  const { colors } = useTheme();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<CashbackTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [b, h] = await Promise.all([
        repositories.cashback.getBalance(),
        repositories.cashback.getHistory(),
      ]);
      setBalance(b.balance);
      setHistory(h);
    } catch (err: any) {
      setError(err.message || 'Failed to load cashback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Cashback" />

        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Available Cashback</Text>
          <Text style={[styles.balance, { color: colors.primaryText }]}>{formatCurrency(balance)}</Text>
          <Text style={[styles.hint, { color: colors.secondaryText }]}>
            Use cashback first at checkout on eligible services - it's applied automatically when enabled.
          </Text>
        </GlassCard>

        <Text style={[styles.historyTitle, { color: colors.primaryText }]}>Cashback History</Text>
        {history.length === 0 ? (
          <EmptyState icon="cash-outline" title="No cashback activity yet" description="Cashback you earn or spend will appear here" />
        ) : (
          history.map((tx) => (
            <GlassCard key={tx.id} style={styles.card} blur={false}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.glassSurface }]}>
                  <Ionicons name={typeIcon[tx.type] as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.description, { color: colors.primaryText }]}>{tx.description}</Text>
                  <Text style={[styles.date, { color: colors.mutedText }]}>{formatDate(tx.createdAt)}</Text>
                </View>
                <Text style={[styles.amount, { color: tx.type === 'earned' ? colors.success : colors.primaryText }]}>
                  {tx.type === 'earned' ? '+' : '-'}{formatCurrency(tx.amount)}
                </Text>
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
  balanceCard: { alignItems: 'center', marginBottom: spacing.lg, padding: spacing.xl },
  balanceLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  balance: { fontSize: 32, fontWeight: typography.weights.bold as any, marginBottom: spacing.md },
  hint: { fontSize: typography.sizes.xs, textAlign: 'center' },
  historyTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold as any, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  content: { flex: 1 },
  description: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  date: { fontSize: typography.sizes.xs },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any },
});
