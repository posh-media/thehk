import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
// The Phase 4 Expo SDK moved expo-file-system to a new File/Directory API;
// the legacy subpath keeps the familiar documentDirectory/copyAsync
// functions this screen needs for a simple "save the receipt image"
// action.
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, GlassInput, Header, LoadingState, PaymentBottomSheet } from '@components';
import { Bank, ReceiptRecord } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatCurrency, formatDate } from '@lib/formatters';

// Receipt Generator (Phase 4 continuation). Bank account name verification
// is real, via Paystack's account-resolve endpoint
// (functions/src/services/bankService.ts) - the same provider already used
// for wallet funding. The receipt itself is a real Firestore record
// (functions/src/services/receiptService.ts), and the on-screen receipt
// card is captured as an image for share/save via react-native-view-shot +
// expo-sharing (true PDF export was not implemented - see
// PHASE_4_CONTINUATION_REPORT.md).
export default function GenerateReceiptScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const params = useLocalSearchParams();
  const transactionId = (params.transactionId as string) || undefined;
  const prefilledAmount = (params.amount as string) || '';

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);

  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [cashbackBalance, setCashbackBalance] = useState(0);

  const [amount, setAmount] = useState('');
  const [senderName, setSenderName] = useState(user?.displayName || '');
  const [senderAccount, setSenderAccount] = useState('');
  const [receiverBank, setReceiverBank] = useState<Bank | null>(null);
  const [receiverAccount, setReceiverAccount] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const receiptRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  useEffect(() => {
    if (prefilledAmount) setAmount(prefilledAmount);
  }, [prefilledAmount]);

  useEffect(() => {
    async function loadBalances() {
      if (!user) return;
      try {
        const [wallet, points, cashback] = await Promise.all([
          repositories.wallet.getWallet(user.id),
          repositories.rewards.getPointsBalance(),
          repositories.cashback.getBalance(),
        ]);
        setWalletBalance(wallet.balance || 0);
        setPointsBalance(points.balance || 0);
        setCashbackBalance(cashback.balance || 0);
      } catch (err) {
        // Non-fatal: the payment sheet will show 0 and the user can still see insufficient balance.
        console.warn('Could not load payment balances:', err);
      }
    }
    loadBalances();
  }, [user?.id]);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.bank.getBanks();
        setBanks(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load banks');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!receiverBank || receiverAccount.length !== 10) return;
    let cancelled = false;
    async function verify() {
      setVerifying(true);
      setVerifyError('');
      setReceiverName('');
      try {
        const result = await repositories.bank.verifyAccount(receiverBank!.code, receiverAccount);
        if (!cancelled) setReceiverName(result.accountName);
      } catch (err: any) {
        if (!cancelled) setVerifyError(err.message || 'Verification unavailable - enter the account name manually');
      } finally {
        if (!cancelled) setVerifying(false);
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [receiverBank, receiverAccount]);

  async function handleGenerate() {
    if (!amount || !senderName || !receiverBank || !receiverAccount || !receiverName) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setShowPaymentSheet(true);
  }

  async function handleConfirmPayment({ usePoints, useCashback }: { usePoints: boolean; useCashback: boolean }) {
    if (!receiverBank) return;
    setShowPaymentSheet(false);
    setSubmitting(true);
    try {
      const result = await repositories.receipt.purchaseBankGenReceipt({
        amount: Number(amount),
        senderName,
        senderAccountNumber: senderAccount || undefined,
        receiverBankName: receiverBank.name,
        receiverAccountNumber: receiverAccount,
        receiverAccountName: receiverName,
        usePoints,
        useCashback,
      });
      setReceipt(result);
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
      const dest = `${FileSystem.documentDirectory}the-hk-receipt-${receipt?.reference || Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      Alert.alert('Receipt Saved', 'The receipt image has been saved to the app documents folder.');
    } catch (err: any) {
      Alert.alert('Could not save receipt', err.message || 'Please try again.');
    }
  }

  if (loading) return <LoadingState />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Generate Receipt" />

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <GlassCard style={styles.form}>
          <GlassInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" leftIcon="cash-outline" placeholder="0.00" containerStyle={styles.field} />
          <GlassInput label="Sender Name" value={senderName} onChangeText={setSenderName} leftIcon="person-outline" placeholder="Full name" containerStyle={styles.field} />
          <GlassInput label="Sender Account Number" value={senderAccount} onChangeText={setSenderAccount} keyboardType="numeric" leftIcon="card-outline" placeholder="Account number (optional)" containerStyle={styles.field} />

          <Text style={[styles.label, { color: colors.secondaryText }]}>Receiver Bank</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setBankPickerVisible(true)}
            style={[styles.bankSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {receiverBank ? (
              <>
                <View style={[styles.bankLogo, { backgroundColor: colors.primaryGlow }]}>
                  <Text style={[styles.bankInitial, { color: colors.primary }]}>{receiverBank.name.charAt(0)}</Text>
                </View>
                <Text style={[styles.bankSelectorText, { color: colors.primaryText }]}>{receiverBank.name}</Text>
              </>
            ) : (
              <Text style={[styles.bankSelectorText, { color: colors.mutedText }]}>Select receiving bank</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
          </TouchableOpacity>

          <GlassInput
            label="Receiver Account Number"
            value={receiverAccount}
            onChangeText={setReceiverAccount}
            keyboardType="numeric"
            leftIcon="wallet-outline"
            placeholder="10 digit account number"
            containerStyle={styles.field}
          />
          {verifying ? <Text style={[styles.hint, { color: colors.secondaryText }]}>Verifying account…</Text> : null}
          {verifyError ? <Text style={[styles.hint, { color: colors.error }]}>{verifyError}</Text> : null}
          <GlassInput label="Receiver Account Name" value={receiverName} onChangeText={setReceiverName} leftIcon="person-outline" placeholder="Account holder name" containerStyle={styles.field} />

          <GlassButton title="Generate Receipt" onPress={handleGenerate} loading={false} style={styles.button} />
        </GlassCard>

        {receipt ? (
          <>
            <ViewShot ref={receiptRef} options={{ format: 'png', quality: 1 }}>
              <GlassCard style={[styles.preview, { backgroundColor: colors.surface }]}>
                <View style={styles.previewHeader}>
                  <Text style={[styles.brand, { color: colors.primary }]}>THE-HK</Text>
                  <Text style={[styles.previewTitle, { color: colors.primaryText }]}>Payment Receipt</Text>
                </View>
                <Text style={[styles.amount, { color: colors.primaryText }]}>{formatCurrency(receipt.amount)}</Text>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <DetailRow label="Reference" value={receipt.reference} />
                <DetailRow label="Sender" value={receipt.senderName} />
                {receipt.senderAccountNumber ? <DetailRow label="Sender Account" value={receipt.senderAccountNumber} /> : null}
                <DetailRow label="Receiver Bank" value={receipt.receiverBankName} />
                <DetailRow label="Receiver Account" value={receipt.receiverAccountNumber} />
                <DetailRow label="Receiver Name" value={receipt.receiverAccountName} />
                <DetailRow label="Date & Time" value={formatDate(receipt.createdAt)} />

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
          </>
        ) : null}
        <PaymentBottomSheet
          visible={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          onConfirm={handleConfirmPayment}
          loading={submitting}
          title="Bank Gen Receipt"
          summaryRows={[
            { label: 'Service', value: 'Bank Receipt Generation' },
            { label: 'Price', value: '₦100 or 100 HK Points' },
          ]}
          totalAmount={10000}
          walletBalance={walletBalance}
          pointsBalance={pointsBalance}
          cashbackBalance={cashbackBalance}
          cashbackEligible={false}
          allowPointsPayment
          pointsCost={100}
          confirmLabel="Pay & Generate"
        />
      </View>

      <Modal visible={bankPickerVisible} animationType="slide" onRequestClose={() => setBankPickerVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <Header title="Select Bank" onBack={() => setBankPickerVisible(false)} />
          <ScrollView style={styles.inner}>
            {banks.map((bank) => (
              <TouchableOpacity key={bank.id} activeOpacity={0.8} onPress={() => { setReceiverBank(bank); setBankPickerVisible(false); }}>
                <GlassCard style={styles.bankCard}>
                  <View style={styles.bankRow}>
                    <View style={[styles.bankLogo, { backgroundColor: colors.primaryGlow }]}>
                      <Text style={[styles.bankInitial, { color: colors.primary }]}>{bank.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.bankInfo}>
                      <Text style={[styles.bankName, { color: colors.primaryText }]}>{bank.name}</Text>
                      <Text style={[styles.bankCode, { color: colors.secondaryText }]}>Bank code: {bank.code}</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  error: { fontSize: typography.sizes.sm, marginBottom: spacing.md, textAlign: 'center' },
  form: { gap: spacing.md, padding: spacing.lg },
  field: { marginBottom: 0 },
  label: { fontSize: typography.sizes.sm, marginBottom: spacing.xs },
  bankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  bankSelectorText: { flex: 1, fontSize: typography.sizes.base },
  bankLogo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bankInitial: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold as any },
  hint: { fontSize: typography.sizes.xs },
  button: { marginTop: spacing.sm },
  preview: { marginTop: spacing.lg, padding: spacing.xl },
  previewHeader: { alignItems: 'center', marginBottom: spacing.md },
  brand: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any, letterSpacing: 1 },
  previewTitle: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  amount: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold as any, marginBottom: spacing.md, textAlign: 'center' },
  divider: { height: 1, marginVertical: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  detailLabel: { fontSize: typography.sizes.sm },
  detailValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium as any },
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
  modalContainer: { flex: 1 },
  bankCard: { marginBottom: spacing.md },
  bankRow: { flexDirection: 'row', alignItems: 'center' },
  bankInfo: { flex: 1, marginLeft: spacing.md },
  bankName: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  bankCode: { fontSize: typography.sizes.sm },
});
