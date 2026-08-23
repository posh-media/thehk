import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassInput, GlassButton, GlassSelect, Header, StatusBadge } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { Bank, Withdrawal } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';

const quickAmounts = [1000, 5000, 10000];

export default function WithdrawScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [note, setNote] = useState('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [b, w] = await Promise.all([repositories.bank.getBanks(), repositories.wallet.getWallet(user?.id || '')]);
        setBanks(b);
        setBalance(w.balance);
      } catch {}
    }
    load();
  }, [user?.id]);

  const selectedBank = banks.find((b) => b.id === bankId);

  const verify = async () => {
    if (selectedBank && accountNumber.length === 10) {
      const res = await repositories.bank.verifyAccount(selectedBank.code, accountNumber);
      setAccountName(res.accountName);
    }
  };

  const handleWithdraw = () => {
    if (!selectedBank) return;
    Alert.alert('Coming Soon', 'Withdrawals will be enabled in a later phase.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Withdraw Funds" />

        <GlassCard style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Current Wallet Balance</Text>
            <Ionicons name="eye-outline" size={20} color={colors.secondaryText} />
          </View>
          <Text style={[styles.balance, { color: colors.primaryText }]}>{formatCurrency(balance)}</Text>
        </GlassCard>

        <Text style={[styles.label, { color: colors.primaryText }]}>Enter Amount</Text>
        <View style={[styles.amountRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.currency, { color: colors.primary }]}>₦</Text>
          <GlassInput placeholder="Minimum ₦500" value={amount} onChangeText={setAmount} keyboardType="number-pad" containerStyle={styles.amountInput} />
        </View>
        <View style={styles.quickAmounts}>
          {quickAmounts.map((a) => (
            <TouchableOpacity key={a} activeOpacity={0.8} onPress={() => setAmount(String(a))} style={[styles.quickChip, { backgroundColor: Number(amount) === a ? colors.primary : colors.surface, borderColor: Number(amount) === a ? colors.primary : colors.border }]}>
              <Text style={[styles.quickText, { color: Number(amount) === a ? colors.inverseText : colors.primaryText }]}>₦{a.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <GlassSelect label="Select Bank" value={bankId} options={banks.map((b) => ({ label: b.name, value: b.id }))} onSelect={setBankId} leftIcon="business-outline" />
        <View style={styles.gap} />
        <GlassInput label="Account Number" placeholder="0123456789" value={accountNumber} onChangeText={setAccountNumber} onBlur={verify} keyboardType="number-pad" maxLength={10} />
        {accountName ? (
          <View style={[styles.verified, { backgroundColor: colors.successSurface }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.verifiedText, { color: colors.success }]}>{accountName}</Text>
          </View>
        ) : null}
        <View style={styles.gap} />
        <GlassInput label="Transaction Note (Optional)" placeholder="Rent payment..." value={note} onChangeText={setNote} />

        <SectionHeader title="Recent Withdrawals" action="See All" />
        {withdrawals.length === 0 ? (
          <GlassCard style={styles.withdrawalCard}>
            <View style={styles.row}>
              <Ionicons name="arrow-up" size={20} color={colors.primary} />
              <View style={styles.content}>
                <Text style={[styles.bank, { color: colors.primaryText }]}>Kuda Bank</Text>
                <Text style={[styles.date, { color: colors.secondaryText }]}>24 Oct, 2023</Text>
              </View>
              <View style={styles.amountCol}>
                <Text style={[styles.amount, { color: colors.primaryText }]}>-₦12,500</Text>
                <StatusBadge status="completed" />
              </View>
            </View>
          </GlassCard>
        ) : null}

        <GlassButton title="Proceed to Withdraw" loading={loading} onPress={handleWithdraw} style={styles.button} />
        <Text style={[styles.note, { color: colors.mutedText }]}>Funds will be processed within 24 hours</Text>
      </View>
    </ScrollView>
  );
}

const SectionHeader = ({ title, action }: { title: string; action?: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>{title}</Text>
      {action && <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
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
    fontSize: 32,
    fontWeight: typography.weights.bold as any,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  currency: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quickText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
  gap: {
    height: spacing.lg,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  verifiedText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginLeft: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
  },
  sectionAction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  withdrawalCard: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bank: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.sm,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  button: {
    marginTop: spacing.xl,
  },
  note: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
