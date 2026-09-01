import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Modal, Image, Alert } from 'react-native';
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
import { formatCurrency, formatDate, formatHkc } from '@lib/formatters';

const BANK_GEN_PRICE_NAIRA = 100;
const BANK_GEN_PRICE_KOBO = BANK_GEN_PRICE_NAIRA * 100;
const OTHERS_BANK_ID = 'bank-others';

export default function GenerateReceiptScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const params = useLocalSearchParams();
  const transactionId = (params.transactionId as string) || undefined;
  const prefilledAmount = (params.amount as string) || '';
  const initialBankId = (params.bankId as string) || undefined;

  const [banks, setBanks] = useState<Bank[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);

  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hkcBalance, setHkcBalance] = useState(0);
  const [ngnBalance, setNgnBalance] = useState(0);
  const [cashbackBalance, setCashbackBalance] = useState(0);

  const [amount, setAmount] = useState('');
  const [senderName, setSenderName] = useState(user?.displayName || '');
  const [senderAccount, setSenderAccount] = useState('');
  const [receiverBank, setReceiverBank] = useState<Bank | null>(null);
  const [customBankName, setCustomBankName] = useState('');
  const [receiverAccount, setReceiverAccount] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [walletEmail, setWalletEmail] = useState('');
  const [walletCrypto, setWalletCrypto] = useState('');
  const [walletNetwork, setWalletNetwork] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const receiptRef = useRef<React.ElementRef<typeof ViewShot>>(null);

  const allBanks = useMemo<Bank[]>(() => {
    const others: Bank = {
      id: OTHERS_BANK_ID,
      name: 'Others',
      code: 'OTHERS',
      category: 'bank',
      logoAsset: undefined,
      logoUrl: undefined,
      implemented: false,
      receiptTemplate: 'generic',
    };
    return [...banks].sort((a, b) => a.name.localeCompare(b.name)).concat(others);
  }, [banks]);

  const displayBanks = useMemo<Bank[]>(() => {
    const q = search.toLowerCase().trim();
    return q
      ? allBanks.filter((b) => b.id === OTHERS_BANK_ID || b.name.toLowerCase().includes(q))
      : allBanks;
  }, [allBanks, search]);

  const isOthers = receiverBank?.id === OTHERS_BANK_ID;
  const isWallet = receiverBank?.category === 'wallet';

  const senderAccountLabel = useMemo(() => {
    if (!receiverBank) return 'Sender Account Number';
    if (isOthers) return 'Sender Account Number';
    if (isWallet) {
      if (receiverBank.id === 'wallet-paypal') return `Sender ${receiverBank.name} Email`;
      return `Sender ${receiverBank.name} Wallet Address`;
    }
    return `Sender ${receiverBank.name} Account Number`;
  }, [receiverBank, isOthers, isWallet]);

  const senderAccountPlaceholder = useMemo(() => {
    if (isWallet && receiverBank?.id === 'wallet-paypal') return 'Sender PayPal email';
    if (isWallet) return 'Sender wallet address';
    return 'Sender account number';
  }, [receiverBank, isWallet]);

  const receiverAccountLabel = useMemo(() => {
    if (!receiverBank) return 'Receiver Account Number';
    if (isOthers) return 'Receiver Account Number';
    if (isWallet) {
      if (receiverBank.id === 'wallet-paypal') return `Receiver ${receiverBank.name} Email`;
      return `Receiver ${receiverBank.name} Wallet Address`;
    }
    return 'Receiver Account Number';
  }, [receiverBank, isOthers, isWallet]);

  const receiverAccountPlaceholder = useMemo(() => {
    if (isWallet && receiverBank?.id === 'wallet-paypal') return 'receiver@paypal.com';
    if (isWallet) return 'Wallet address';
    return '10 digit account number';
  }, [receiverBank, isWallet]);

  useEffect(() => {
    if (prefilledAmount) setAmount(prefilledAmount);
  }, [prefilledAmount]);

  useEffect(() => {
    async function loadBalances() {
      if (!user) return;
      try {
        const [wallet, hkc, cashback] = await Promise.all([
          repositories.wallet.getWallet(user.id),
          repositories.rewards.getHkcBalance(),
          repositories.cashback.getBalance(),
        ]);
        setNgnBalance(wallet.balance || 0);
        setHkcBalance(hkc.balance || 0);
        setCashbackBalance(cashback.balance || 0);
      } catch (err) {
        console.warn('Could not load payment balances:', err);
      }
    }
    loadBalances();
  }, [user?.id]);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.bank.getBanks();
        // Load all banks and wallets; the form adapts based on selection.
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
    if (!initialBankId || allBanks.length === 0) return;
    const bank = allBanks.find((b) => b.id === initialBankId);
    if (bank) setReceiverBank(bank);
  }, [initialBankId, allBanks]);

  useEffect(() => {
    if (!receiverBank || receiverBank.id === OTHERS_BANK_ID || receiverBank.category === 'wallet') return;
    if (receiverAccount.length !== 10) return;
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
    if (!amount || Number(amount) <= 0 || !senderName || !senderAccount || !receiverBank || !receiverAccount || !receiverName) {
      setError('Please fill in all required fields');
      return;
    }
    if (receiverBank.id === OTHERS_BANK_ID && !customBankName.trim()) {
      setError('Please enter the custom bank name');
      return;
    }
    if (!isWallet && !isOthers && receiverAccount.length !== 10) {
      setError('Please enter a valid 10-digit receiver account number');
      return;
    }
    if (isWallet && receiverBank.id !== 'wallet-paypal' && (!walletCrypto.trim() || !walletNetwork.trim())) {
      setError('Please enter the crypto asset and network');
      return;
    }
    setError('');
    setShowPaymentSheet(true);
  }

  async function handleConfirmPayment({ useCashback }: { useCashback: boolean }) {
    if (!receiverBank) return;
    const bankName = receiverBank.id === OTHERS_BANK_ID ? customBankName.trim() : receiverBank.name;
    const metadata = isWallet
      ? {
          walletType: receiverBank.name,
          email: walletEmail.trim() || undefined,
          crypto: walletCrypto.trim() || undefined,
          network: walletNetwork.trim() || undefined,
        }
      : undefined;
    setShowPaymentSheet(false);
    setSubmitting(true);
    try {
      const result = await repositories.receipt.purchaseBankGenReceipt({
        amount: Number(amount),
        senderName,
        senderAccountNumber: senderAccount || undefined,
        receiverBankName: bankName,
        receiverAccountNumber: receiverAccount,
        receiverAccountName: receiverName,
        useCashback,
        metadata,
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
          <GlassInput label={senderAccountLabel} value={senderAccount} onChangeText={setSenderAccount} leftIcon="card-outline" placeholder={senderAccountPlaceholder} containerStyle={styles.field} />

          <Text style={[styles.label, { color: colors.secondaryText }]}>Receiver Bank</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setBankPickerVisible(true)}
            style={[styles.bankSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {receiverBank ? (
              <>
                {receiverBank.logoAsset || receiverBank.logoUrl ? (
                  <Image source={receiverBank.logoAsset || { uri: receiverBank.logoUrl }} style={styles.bankLogo} resizeMode="contain" />
                ) : (
                  <View style={[styles.bankLogo, { backgroundColor: colors.primaryGlow }]}>
                    <Text style={[styles.bankInitial, { color: colors.primary }]}>{receiverBank.name.charAt(0)}</Text>
                  </View>
                )}
                <Text style={[styles.bankSelectorText, { color: colors.primaryText }]}>{receiverBank.name}</Text>
              </>
            ) : (
              <Text style={[styles.bankSelectorText, { color: colors.mutedText }]}>Select receiving bank</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
          </TouchableOpacity>

          {receiverBank?.id === OTHERS_BANK_ID && (
            <GlassInput
              label="Custom Bank Name"
              value={customBankName}
              onChangeText={setCustomBankName}
              leftIcon="business-outline"
              placeholder="Enter bank name"
              containerStyle={styles.field}
            />
          )}

          {isWallet && (
            <>
              <GlassInput
                label="Receiver Name"
                value={receiverName}
                onChangeText={setReceiverName}
                leftIcon="person-outline"
                placeholder="Receiver full name"
                containerStyle={styles.field}
              />
              {receiverBank?.id !== 'wallet-paypal' && (
                <>
                  <GlassInput
                    label="Crypto"
                    value={walletCrypto}
                    onChangeText={setWalletCrypto}
                    leftIcon="logo-bitcoin"
                    placeholder="BTC, ETH, USDT..."
                    containerStyle={styles.field}
                  />
                  <GlassInput
                    label="Network"
                    value={walletNetwork}
                    onChangeText={setWalletNetwork}
                    leftIcon="git-network-outline"
                    placeholder="Network (e.g. TRC20, ERC20)"
                    containerStyle={styles.field}
                  />
                </>
              )}
              <GlassInput
                label={receiverAccountLabel}
                value={receiverAccount}
                onChangeText={setReceiverAccount}
                leftIcon="wallet-outline"
                placeholder={receiverAccountPlaceholder}
                keyboardType={receiverBank?.id === 'wallet-paypal' ? 'email-address' : 'default'}
                containerStyle={styles.field}
              />
              <GlassInput
                label="Email (optional)"
                value={walletEmail}
                onChangeText={setWalletEmail}
                keyboardType="email-address"
                leftIcon="mail-outline"
                placeholder="receiver@example.com"
                containerStyle={styles.field}
              />
            </>
          )}

          {!isWallet && (
            <>
              <GlassInput
                label={receiverAccountLabel}
                value={receiverAccount}
                onChangeText={setReceiverAccount}
                keyboardType="numeric"
                leftIcon="wallet-outline"
                placeholder={receiverAccountPlaceholder}
                containerStyle={styles.field}
              />
              {verifying ? <Text style={[styles.hint, { color: colors.secondaryText }]}>Verifying account…</Text> : null}
              {verifyError ? <Text style={[styles.hint, { color: colors.error }]}>{verifyError}</Text> : null}
              <GlassInput label="Receiver Account Name" value={receiverName} onChangeText={setReceiverName} leftIcon="person-outline" placeholder="Account holder name" containerStyle={styles.field} />
            </>
          )}
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

                <DetailRow label={receipt.metadata?.walletType ? 'Wallet' : 'Bank'} value={receipt.receiverBankName} />
                <DetailRow label="Reference" value={receipt.reference} />
                <DetailRow label="Sender" value={receipt.senderName} />
                {receipt.senderAccountNumber ? <DetailRow label="Sender Account" value={receipt.senderAccountNumber} /> : null}
                <DetailRow label={receipt.metadata?.walletType ? 'Wallet Address / Email' : 'Receiver Account'} value={receipt.receiverAccountNumber} />
                <DetailRow label="Receiver Name" value={receipt.receiverAccountName} />
                {receipt.metadata?.crypto ? <DetailRow label="Crypto" value={String(receipt.metadata.crypto)} /> : null}
                {receipt.metadata?.network ? <DetailRow label="Network" value={String(receipt.metadata.network)} /> : null}
                {receipt.metadata?.email ? <DetailRow label="Email" value={String(receipt.metadata.email)} /> : null}
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

      <Modal visible={bankPickerVisible} animationType="slide" onRequestClose={() => { setBankPickerVisible(false); setSearch(''); }}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <Header title="Select Bank" onBack={() => { setBankPickerVisible(false); setSearch(''); }} />
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.mutedText} />
            <TextInput
              style={[styles.searchInput, { color: colors.primaryText }]}
              placeholder="Search bank..."
              placeholderTextColor={colors.mutedText}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <ScrollView style={styles.inner}>
            {displayBanks.map((bank) => (
              <TouchableOpacity key={bank.id} activeOpacity={0.8} onPress={() => { setReceiverBank(bank); setBankPickerVisible(false); setSearch(''); }}>
                <GlassCard style={styles.bankCard}>
                  <View style={styles.bankRow}>
                    {bank.logoAsset || bank.logoUrl ? (
                      <Image source={bank.logoAsset || { uri: bank.logoUrl }} style={styles.bankLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.bankLogo, { backgroundColor: colors.primaryGlow }]}>
                        <Text style={[styles.bankInitial, { color: colors.primary }]}>{bank.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={styles.bankInfo}>
                      <Text style={[styles.bankName, { color: colors.primaryText }]}>{bank.name}</Text>
                      {bank.id !== OTHERS_BANK_ID && (
                        <Text style={[styles.bankCode, { color: colors.secondaryText }]}>Bank code: {bank.code}</Text>
                      )}
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.base,
  },
});
