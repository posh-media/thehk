import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, GlassInput, Header, LoadingState, PaymentBottomSheet } from '@components';
import { Bank, ReceiptRecord } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatCurrency, formatDate, formatTime } from '@lib/formatters';

const BANK_GEN_PRICE_NAIRA = 100;
const BANK_GEN_PRICE_KOBO = BANK_GEN_PRICE_NAIRA * 100;

function randomNumeric(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function maskAccount(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 6) return accountNumber || 'N/A';
  const start = accountNumber.slice(0, 3);
  const end = accountNumber.slice(-3);
  return `${start}****${end}`;
}

export default function OPayReceiptScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams();
  const bankId = (params.bankId as string) || 'bank-opay';

  const [bank, setBank] = useState<Bank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState('');
  const [senderName, setSenderName] = useState(user?.displayName || '');
  const [senderAccount, setSenderAccount] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverAccount, setReceiverAccount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString());

  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hkcBalance, setHkcBalance] = useState(0);
  const [ngnBalance, setNgnBalance] = useState(0);
  const [cashbackBalance] = useState(0);
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [sessionId, setSessionId] = useState('');

  const receiptRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  useEffect(() => {
    async function load() {
      try {
        const banks = await repositories.bank.getBanks();
        const selected = banks.find((b) => b.id === bankId && b.implemented && b.receiptTemplate === 'opay') as Bank | null;
        if (!selected) {
          setError('OPay receipt generation is not available for this bank');
          return;
        }
        setBank(selected);
        const [wallet, hkc] = await Promise.all([
          repositories.wallet.getWallet(user?.id || ''),
          repositories.rewards.getHkcBalance(),
        ]);
        setNgnBalance(wallet.balance || 0);
        setHkcBalance(hkc.balance || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load bank details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bankId, user?.id]);

  const canGenerate = useMemo(() => {
    return (
      amount &&
      Number(amount) > 0 &&
      senderName &&
      receiverName &&
      receiverAccount.length === 10
    );
  }, [amount, senderName, receiverName, receiverAccount]);

  function handleGenerate() {
    if (!canGenerate) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setShowPaymentSheet(true);
  }

  async function handleConfirmPayment({ useCashback }: { useCashback: boolean }) {
    if (!bank) return;
    setShowPaymentSheet(false);
    setSubmitting(true);
    try {
      const result = await repositories.receipt.purchaseBankGenReceipt({
        amount: Number(amount),
        senderName,
        senderAccountNumber: senderAccount || undefined,
        receiverBankName: bank.name,
        receiverAccountNumber: receiverAccount,
        receiverAccountName: receiverName,
        useCashback,
      });
      setReceipt(result);
      setTransactionNumber(randomNumeric(30));
      setSessionId(randomNumeric(35));
      setTransactionDate(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please check your balance and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    try {
      const uri = await receiptRef.current?.capture?.();
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'THE-HK OPay Receipt' });
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
      const dest = `${FileSystem.documentDirectory}the-hk-opay-receipt-${receipt?.reference || Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      Alert.alert('Receipt Saved', 'The receipt image has been saved to the app documents folder.');
    } catch (err: any) {
      Alert.alert('Could not save receipt', err.message || 'Please try again.');
    }
  }

  if (loading) return <LoadingState />;
  if (error && !bank) return <ErrorAlert message={error} onRetry={() => router.replace('/receipts/banks')} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Generate Receipt" />

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        {!receipt ? (
          <GlassCard style={styles.form}>
            <GlassInput
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              leftIcon="cash-outline"
              placeholder="0.00"
              containerStyle={styles.field}
            />
            <GlassInput
              label="Sender Name"
              value={senderName}
              onChangeText={setSenderName}
              leftIcon="person-outline"
              placeholder="Full name"
              containerStyle={styles.field}
            />
            <GlassInput
              label="Sender OPay Account (optional)"
              value={senderAccount}
              onChangeText={setSenderAccount}
              keyboardType="numeric"
              leftIcon="card-outline"
              placeholder="OPay account number"
              containerStyle={styles.field}
            />
            <GlassInput
              label="Receiver Name"
              value={receiverName}
              onChangeText={setReceiverName}
              leftIcon="person-outline"
              placeholder="Recipient full name"
              containerStyle={styles.field}
            />
            <GlassInput
              label="Receiver OPay Account"
              value={receiverAccount}
              onChangeText={setReceiverAccount}
              keyboardType="numeric"
              leftIcon="wallet-outline"
              placeholder="10 digit OPay account number"
              containerStyle={styles.field}
            />
            <GlassButton
              title="Generate Receipt"
              onPress={handleGenerate}
              disabled={!canGenerate}
              loading={false}
              style={styles.button}
            />
          </GlassCard>
        ) : (
          <>
            <ViewShot ref={receiptRef} options={{ format: 'png', quality: 1 }}>
              <GlassCard style={[styles.receipt, { backgroundColor: colors.surface }]}>
                <View style={styles.receiptHeader}>
                  <View style={styles.logoBox}>
                    <Image source={bank?.logoAsset || require('../../../assets/images/bank-logos/opay.jpg')} style={styles.opayLogo} resizeMode="contain" />
                  </View>
                  <Text style={[styles.receiptType, { color: colors.secondaryText }]}>Transaction Receipt</Text>
                </View>

                <Text style={[styles.amount, { color: '#1CCB96' }]}>{formatCurrency(receipt.amount)}</Text>
                <Text style={[styles.status, { color: '#1CCB96' }]}>Successful</Text>
                <Text style={[styles.date, { color: colors.secondaryText }]}>
                  {formatDate(transactionDate)} {formatTime(transactionDate)}
                </Text>

                <View style={styles.dashedDivider}>
                  {[...Array(24)].map((_, i) => (
                    <View key={i} style={[styles.dash, { backgroundColor: colors.divider }]} />
                  ))}
                </View>

                <DetailRow label="Recipient Details" value={receipt.receiverAccountName} />
                <Text style={[styles.subValue, { color: colors.secondaryText }]}>
                  OPay | {maskAccount(receipt.receiverAccountNumber)}
                </Text>

                <DetailRow label="Sender Details" value={receipt.senderName} />
                <Text style={[styles.subValue, { color: colors.secondaryText }]}>
                  OPay | {maskAccount(receipt.senderAccountNumber || '0000000000')}
                </Text>

                <DetailRow label="Transaction No." value={transactionNumber || receipt.reference} />
                <DetailRow label="Session ID" value={sessionId} />

                <View style={styles.dashedDivider}>
                  {[...Array(24)].map((_, i) => (
                    <View key={i} style={[styles.dash, { backgroundColor: colors.divider }]} />
                  ))}
                </View>

                <Text style={[styles.footer, { color: colors.secondaryText }]}>
                  Enjoy a better life with OPay. Get free transfers, withdrawals, bill payments, instant loans, and good
                  annual interest on your savings. OPay is licensed by the Central Bank of Nigeria and insured by the NDIC.
                </Text>
              </GlassCard>
            </ViewShot>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Share as image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={handleSave}>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            <GlassButton
              title="Generate Another"
              variant="secondary"
              onPress={() => {
                setReceipt(null);
                setTransactionNumber('');
                setSessionId('');
              }}
              style={styles.button}
            />
          </>
        )}

        <PaymentBottomSheet
          visible={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          onConfirm={handleConfirmPayment}
          loading={submitting}
          title="Bank Gen Receipt"
          summaryRows={[
            { label: 'Service', value: 'OPay Receipt Generation' },
            { label: 'Price', value: `₦${BANK_GEN_PRICE_NAIRA.toLocaleString()}` },
          ]}
          totalAmount={BANK_GEN_PRICE_KOBO}
          hkcBalance={hkcBalance}
          ngnBalance={ngnBalance}
          cashbackBalance={cashbackBalance}
          cashbackEligible={false}
          confirmLabel="Pay & Generate"
        />
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

function ErrorAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={[styles.errorText, { color: colors.primaryText }]}>{message}</Text>
      <GlassButton title="Go Back" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  error: { fontSize: typography.sizes.sm, marginBottom: spacing.md, textAlign: 'center' },
  form: { gap: spacing.md, padding: spacing.lg },
  field: { marginBottom: 0 },
  button: { marginTop: spacing.sm },
  receipt: { marginTop: spacing.lg, padding: spacing.xl, borderRadius: borderRadius.xl },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  logoBox: { width: 80, height: 28 },
  opayLogo: { width: '100%', height: '100%' },
  receiptType: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium as any },
  amount: {
    fontSize: 36,
    fontWeight: typography.weights.bold as any,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  status: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dashedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
  },
  dash: {
    width: 6,
    height: 1,
    borderRadius: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    flex: 0.45,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    flex: 0.55,
    textAlign: 'right',
  },
  subValue: {
    fontSize: typography.sizes.sm,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  footer: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
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
  actionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
