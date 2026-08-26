import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, LoadingState, ErrorState, StatusBadge } from '@components';
import { repositories } from '@repositories/mockRepository';
import { Transaction } from '@/types/domain';
import { formatCurrency, formatDate, formatTime } from '@lib/formatters';

// View Receipt (Phase 5): A read-only, transaction-backed receipt for
// successful THE-HK payments. This is distinct from the Bank Gen receipt
// generator used for custom/manual receipts.
export default function TransactionReceiptScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const receiptRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await repositories.transaction.getTransaction(id as string);
        if (!cancelled) {
          if (!data) setError('Transaction not found');
          else if (data.status !== 'successful') setError('Receipts are only available for successful transactions');
          else setTransaction(data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load receipt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleShare() {
    try {
      const uri = await receiptRef.current?.capture?.();
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'THE-HK Receipt' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device/browser.');
      }
    } catch (err: any) {
      Alert.alert('Could not share receipt', err.message || 'Please try again.');
    }
  }

  async function handleSave() {
    try {
      const uri = await receiptRef.current?.capture?.();
      if (!uri) return;
      const dest = `${FileSystem.documentDirectory}the-hk-receipt-${transaction?.reference || Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      Alert.alert('Receipt Saved', 'The receipt image has been saved to the app documents folder.');
    } catch (err: any) {
      Alert.alert('Could not save receipt', err.message || 'Please try again.');
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(''); }} />;
  if (!transaction) return <ErrorState title="Transaction not found" />;

  const isCredit = ['wallet_funding', 'referral_reward', 'marketplace_refund'].includes(transaction.type);

  const details = [
    { label: 'Reference', value: transaction.reference },
    { label: 'Transaction Type', value: transaction.type.replace(/_/g, ' ') },
    { label: 'Status', value: <StatusBadge status={transaction.status} /> },
    { label: 'Description', value: transaction.description },
    { label: 'Date', value: `${formatDate(transaction.createdAt)} at ${formatTime(transaction.createdAt)}` },
  ];
  if (transaction.providerReference) {
    details.push({ label: 'Provider Reference', value: transaction.providerReference });
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Receipt" onBack={() => router.back()} />

        <ViewShot ref={receiptRef} options={{ format: 'png', quality: 1 }}>
          <GlassCard style={[styles.receipt, { backgroundColor: colors.surface }]}>
            <View style={styles.receiptHeader}>
              <Text style={[styles.brand, { color: colors.primary }]}>THE-HK</Text>
              <Text style={[styles.receiptTitle, { color: colors.primaryText }]}>Transaction Receipt</Text>
            </View>

            <View style={[styles.iconContainer, { backgroundColor: isCredit ? colors.success + '20' : colors.primary + '20' }]}>
              <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} size={28} color={isCredit ? colors.success : colors.primary} />
            </View>

            <Text style={[styles.amount, { color: colors.primaryText }]}>
              {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>
            <Text style={[styles.status, { color: colors.secondaryText }]}>{transaction.status}</Text>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {details.map((d, i) => (
              <View
                key={d.label}
                style={[styles.row, i !== details.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
              >
                <Text style={[styles.label, { color: colors.secondaryText }]}>{d.label}</Text>
                {typeof d.value === 'string' ? (
                  <Text style={[styles.value, { color: colors.primaryText }]}>{d.value}</Text>
                ) : (
                  d.value
                )}
              </View>
            ))}

            <Text style={[styles.disclaimer, { color: colors.mutedText }]}>
              This is a THE-HK generated record and is not an official bank statement.
            </Text>
          </GlassCard>
        </ViewShot>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={handleSave}>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  receipt: { padding: spacing.xl },
  receiptHeader: { alignItems: 'center', marginBottom: spacing.md },
  brand: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any, letterSpacing: 1 },
  receiptTitle: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  amount: { fontSize: 40, fontWeight: typography.weights.bold as any, textAlign: 'center', marginBottom: spacing.sm },
  status: { fontSize: typography.sizes.base, textAlign: 'center', textTransform: 'capitalize', marginBottom: spacing.xl },
  divider: { height: 1, marginVertical: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  label: { fontSize: typography.sizes.sm },
  value: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium as any, flex: 1, textAlign: 'right', marginLeft: spacing.md },
  disclaimer: { fontSize: typography.sizes.xs, textAlign: 'center', marginTop: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
  },
  actionText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
});
