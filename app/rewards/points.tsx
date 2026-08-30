import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassInput, GlassButton, Header, SkeletonList, ErrorState, EmptyState } from '@components';
import { Wallet, HkcTransaction, HkcBalance, ReferralSummary } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatCurrency, formatHkc, formatDate } from '@lib/formatters';

// HK Coins conversion (Phase 5): Wallet/Referral Balance -> HK Coins, at a
// single authoritative rate (1 NGN = 1 HKC), enforced server-side in
// functions/src/services/pointsService.ts. The rate shown here is display only.
const HKC_RATE_LABEL = '1 NGN = 1 HK Coin';
const MIN_CONVERSION_NAIRA = 100;
const quickAmounts = [100, 500, 1000, 5000];

type Source = 'wallet' | 'referral';

const typeLabel: Record<HkcTransaction['type'], string> = {
  conversion: 'Converted to HK Coins',
  deposit: 'Deposit / Bonus',
  spending: 'Spent',
  refund: 'Refund',
  signup_bonus: 'Signup Bonus',
  migration: 'Migrated from HK Points',
  adjustment: 'Adjustment',
};

const typeIcon: Record<HkcTransaction['type'], string> = {
  conversion: 'wallet-outline',
  deposit: 'arrow-down-circle-outline',
  spending: 'remove-circle-outline',
  refund: 'refresh-circle-outline',
  signup_bonus: 'gift-outline',
  migration: 'sync-outline',
  adjustment: 'options-outline',
};

export default function CoinsScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [hkc, setHkc] = useState<HkcBalance | null>(null);
  const [referralSummary, setReferralSummary] = useState<ReferralSummary | null>(null);
  const [transactions, setTransactions] = useState<HkcTransaction[]>([]);
  const [source, setSource] = useState<Source>('wallet');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [w, h, r, t] = await Promise.all([
        repositories.wallet.getWallet(user?.id || ''),
        repositories.rewards.getHkcBalance(),
        repositories.rewards.getReferralSummary(),
        repositories.rewards.getHkcTransactions(user?.id || ''),
      ]);
      setWallet(w);
      setHkc(h);
      setReferralSummary(r);
      setTransactions(t);
    } catch (err: any) {
      setError(err.message || 'Failed to load HK Coins data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const hkcPreview = Math.round(numericAmount); // 1 NGN = 1 HKC
  const sourceBalance = source === 'wallet' ? (wallet?.balance || 0) : (referralSummary?.balance || 0);
  const isValid = numericAmount >= MIN_CONVERSION_NAIRA && numericAmount * 100 <= sourceBalance;

  const handleChipPress = (value: number) => setAmount(value.toString());

  const handleConvert = async () => {
    if (!isValid) return;
    try {
      setConverting(true);
      const transaction = source === 'wallet'
        ? await repositories.rewards.convertWalletToHkc(numericAmount)
        : await repositories.rewards.convertReferralToHkc(numericAmount);
      setTransactions((prev) => [transaction, ...prev]);
      setHkc((prev) => (prev ? { ...prev, balance: prev.balance + transaction.amount } : prev));
      if (source === 'wallet') {
        setWallet((prev) => (prev ? { ...prev, balance: prev.balance - numericAmount * 100 } : prev));
      } else {
        setReferralSummary((prev) => (prev ? { ...prev, balance: prev.balance - numericAmount * 100 } : prev));
      }
      setAmount('');
      Alert.alert('Conversion Successful', `${formatCurrency(numericAmount * 100)} converted to ${formatHkc(transaction.amount)}`);
    } catch (err: any) {
      Alert.alert('Conversion Failed', err.message || 'Unable to convert to HK Coins');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="HK Coins" />
        <SkeletonList count={5} />
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="HK Coins" />

        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>HK Coins Balance</Text>
          <Text style={[styles.balance, { color: colors.primaryText }]}>{formatHkc(hkc?.balance || 0)}</Text>
          <View style={[styles.rateBadge, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
            <Text style={[styles.rateText, { color: colors.primary }]}>{HKC_RATE_LABEL}</Text>
          </View>
        </GlassCard>

        <GlassCard style={styles.convertCard}>
          <Text style={[styles.convertTitle, { color: colors.primaryText }]}>Convert to HK Coins</Text>

          <View style={styles.sourceToggle}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setSource('wallet'); setAmount(''); }}
              style={[styles.sourceTab, { backgroundColor: source === 'wallet' ? colors.primary : colors.glassSurface, borderColor: colors.glassBorder }]}
            >
              <Text style={[styles.sourceTabText, { color: source === 'wallet' ? colors.inverseText : colors.primaryText }]}>Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setSource('referral'); setAmount(''); }}
              style={[styles.sourceTab, { backgroundColor: source === 'referral' ? colors.primary : colors.glassSurface, borderColor: colors.glassBorder }]}
            >
              <Text style={[styles.sourceTabText, { color: source === 'referral' ? colors.inverseText : colors.primaryText }]}>Referral Balance</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.balanceRow}>
            <Text style={[styles.balanceRowLabel, { color: colors.secondaryText }]}>
              {source === 'wallet' ? 'Wallet Balance' : 'Referral Balance'}
            </Text>
            <Text style={[styles.balanceRowValue, { color: colors.primaryText }]}>{formatCurrency(sourceBalance)}</Text>
          </View>

          <GlassInput
            label="Amount to Convert (₦)"
            placeholder="e.g. 1,000"
            value={amount}
            onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            leftIcon="cash-outline"
            containerStyle={styles.input}
          />

          <View style={[styles.preview, { backgroundColor: colors.glassSurface }]}>
            <Text style={[styles.previewLabel, { color: colors.secondaryText }]}>You receive</Text>
            <Text style={[styles.previewValue, { color: colors.primary }]}>{formatHkc(hkcPreview)}</Text>
          </View>

          <Text style={[styles.chipsLabel, { color: colors.secondaryText }]}>Quick Amounts</Text>
          <View style={styles.chips}>
            {quickAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                activeOpacity={0.8}
                onPress={() => handleChipPress(value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: numericAmount === value ? colors.primary : colors.glassSurface,
                    borderColor: numericAmount === value ? colors.primary : colors.glassBorder,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: numericAmount === value ? colors.inverseText : colors.primaryText }]}>
                  {formatCurrency(value * 100)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {numericAmount > 0 && numericAmount * 100 > sourceBalance && (
            <Text style={[styles.errorText, { color: colors.error }]}>Insufficient {source === 'wallet' ? 'wallet' : 'referral'} balance</Text>
          )}

          <View style={styles.info}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.secondaryText }]}>
              Minimum conversion is ₦{MIN_CONVERSION_NAIRA}. Conversions are processed instantly and cannot be reversed.
            </Text>
          </View>

          <GlassButton
            title="Convert to HKC"
            loading={converting}
            disabled={!isValid}
            onPress={handleConvert}
            style={styles.convertButton}
          />
        </GlassCard>

        <Text style={[styles.historyTitle, { color: colors.primaryText }]}>HKC History</Text>
        {transactions.length === 0 ? (
          <EmptyState icon="sync-outline" title="No transactions yet" description="Convert wallet or referral balance to see HKC history here" />
        ) : (
          transactions.map((transaction) => (
            <GlassCard key={transaction.id} style={styles.historyCard} blur={false}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
                  <Ionicons name={typeIcon[transaction.type] as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.content}>
                  <Text style={[styles.description, { color: colors.primaryText }]}>{typeLabel[transaction.type]}</Text>
                  <Text style={[styles.date, { color: colors.mutedText }]}>{formatDate(transaction.createdAt)}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.points, { color: transaction.amount >= 0 ? colors.success : colors.error }]}>
                    {transaction.amount >= 0 ? '+' : ''}{formatHkc(transaction.amount)}
                  </Text>
                  {transaction.ngnAmount !== undefined && (
                    <Text style={[styles.cash, { color: colors.secondaryText }]}>{formatCurrency(transaction.ngnAmount)}</Text>
                  )}
                </View>
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
  balanceCard: { alignItems: 'center', marginBottom: spacing.lg },
  balanceLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  balance: { fontSize: 32, fontWeight: typography.weights.bold as any, marginBottom: spacing.md },
  rateBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1 },
  rateText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  convertCard: { marginBottom: spacing.lg },
  convertTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold as any, marginBottom: spacing.lg },
  sourceToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  sourceTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1 },
  sourceTabText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  balanceRowLabel: { fontSize: typography.sizes.sm },
  balanceRowValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
  input: { marginBottom: spacing.md },
  preview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  previewLabel: { fontSize: typography.sizes.sm },
  previewValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any },
  chipsLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  errorText: { fontSize: typography.sizes.sm, marginBottom: spacing.md },
  info: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  infoIcon: { marginRight: spacing.sm, marginTop: spacing.xs },
  infoText: { fontSize: typography.sizes.sm, flex: 1, lineHeight: 20 },
  convertButton: { marginBottom: spacing.sm },
  historyTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold as any, marginBottom: spacing.md },
  historyCard: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  content: { flex: 1 },
  description: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  date: { fontSize: typography.sizes.xs },
  right: { alignItems: 'flex-end' },
  points: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any, marginBottom: spacing.xs },
  cash: { fontSize: typography.sizes.xs },
});
