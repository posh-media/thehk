import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, Header } from '@components';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatCurrency, formatDate, formatHkc } from '@lib/formatters';
import { Transaction, Wallet } from '@/types/domain';

export default function PaymentSuccessScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams();
  const reference = (params.reference as string) || (params.trxref as string) || '';

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  async function verifyPayment() {
    if (!reference) return;
    setVerifying(true);
    try {
      const result = await repositories.wallet.verifyPaystackPayment(reference);
      if (result.processed) {
        setSuccess(true);
        setMessage(result.message);
        if (result.transactionId) {
          const [tx, w] = await Promise.all([
            repositories.transaction.getTransaction(result.transactionId),
            repositories.wallet.getWallet(user?.id || ''),
          ]);
          setTransaction(tx);
          setWallet(w);
        }
      } else {
        setSuccess(false);
        setMessage(result.message || 'We could not verify this payment yet.');
      }
    } catch (err: any) {
      setSuccess(false);
      setMessage(err.message || 'We could not verify this payment yet. Your payment may still be processing. Please check your transaction history shortly.');
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    if (!reference) {
      setVerifying(false);
      setSuccess(false);
      setMessage('No payment reference was provided.');
      return;
    }

    verifyPayment();
  }, [reference, user?.id]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Payment Status" />

        <GlassCard style={styles.card}>
          {verifying ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.title, { color: colors.primaryText }]}>Verifying payment…</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Please wait while we confirm your transaction.</Text>
            </View>
          ) : success ? (
            <View style={styles.centered}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="checkmark" size={40} color={colors.success} />
              </View>
              <Text style={[styles.title, { color: colors.primaryText }]}>Payment Successful</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Your wallet has been funded successfully.</Text>

              {transaction && (
                <View style={[styles.details, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
                  <DetailRow label="Amount" value={formatCurrency(transaction.amount)} />
                  <DetailRow label="Reference" value={transaction.reference} />
                  <DetailRow label="Date & Time" value={formatDate(transaction.createdAt)} />
                  <DetailRow label="Status" value={transaction.status} />
                  {wallet && <DetailRow label="HKC Balance" value={formatHkc(wallet.hkcBalance)} />}
                </View>
              )}

              <GlassButton
                title="View Transaction"
                onPress={() => transaction ? router.push(`/wallet/transaction/${transaction.id}` as any) : router.push('/wallet/transactions')}
                style={styles.button}
              />
              <GlassButton title="Back to Home" variant="secondary" onPress={() => router.replace('/(tabs)')} style={styles.button} />
            </View>
          ) : (
            <View style={styles.centered}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.error}20` }]}>
                <Ionicons name="close" size={40} color={colors.error} />
              </View>
              <Text style={[styles.title, { color: colors.primaryText }]}>Payment Verification Failed</Text>
              <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{message}</Text>
              <GlassButton title="Try Again" onPress={() => { if (reference) verifyPayment(); }} style={styles.button} />
              <GlassButton title="Back to Home" variant="secondary" onPress={() => router.replace('/(tabs)')} style={styles.button} />
            </View>
          )}
        </GlassCard>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { marginTop: spacing.lg, padding: spacing.xl },
  centered: { alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  details: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailLabel: { fontSize: typography.sizes.sm },
  detailValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  button: { width: '100%', marginTop: spacing.md },
});
