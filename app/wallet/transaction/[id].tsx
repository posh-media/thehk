import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, LoadingState, ErrorState, StatusBadge, Header } from '@components';
import { Transaction } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { formatCurrency, formatDate, formatTime } from '@lib/formatters';

export default function TransactionDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.transaction.getTransaction(id as string);
        setTransaction(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load transaction');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;
  if (!transaction) return <ErrorState title="Transaction not found" />;

  const isCredit = ['wallet_funding', 'referral_reward', 'marketplace_refund'].includes(transaction.type);

  const details = [
    { label: 'Transaction Type', value: transaction.type.replace(/_/g, ' ') },
    { label: 'Status', value: <StatusBadge status={transaction.status} /> },
    { label: 'Reference', value: transaction.reference },
    { label: 'Date', value: `${formatDate(transaction.createdAt)} at ${formatTime(transaction.createdAt)}` },
    { label: 'Description', value: transaction.description },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Transaction Details" />

        <View style={[styles.iconContainer, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
          <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} size={32} color={isCredit ? colors.success : colors.primary} />
        </View>

        <Text style={[styles.amount, { color: isCredit ? colors.success : colors.primaryText }]}>
          {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={[styles.status, { color: colors.secondaryText }]}>{transaction.status}</Text>

        <GlassCard style={styles.detailsCard}>
          {details.map((d, i) => (
            <View key={d.label} style={[styles.detailRow, i !== details.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
              <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>{d.label}</Text>
              {typeof d.value === 'string' ? (
                <Text style={[styles.detailValue, { color: colors.primaryText }]}>{d.value}</Text>
              ) : (
                d.value
              )}
            </View>
          ))}
        </GlassCard>

        {transaction.status === 'successful' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/receipts/generate?transactionId=${transaction.id}&amount=${transaction.amount}` as any)}
            style={[styles.receipt, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={[styles.receiptText, { color: colors.primaryText }]}>Generate Receipt</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: 'center' },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  amount: {
    fontSize: 40,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  status: {
    fontSize: typography.sizes.base,
    marginBottom: spacing.xl,
    textTransform: 'capitalize',
  },
  detailsCard: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
  },
  detailValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  receiptText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
    marginLeft: spacing.md,
  },
});
