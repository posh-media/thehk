import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassInput, GlassButton, Header } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { formatCurrency } from '@lib/formatters';

const providers = [
  { id: 'paystack', name: 'Paystack', description: 'Cards, Bank Transfer, USSD', icon: 'card' },
  { id: 'korapay', name: 'Korapay', description: 'Cards, Bank Transfer, USSD', icon: 'card' },
];

const quickAmounts = [1000, 2000, 5000, 10000, 20000];

export default function FundWalletScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('2000');
  const [provider, setProvider] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    repositories.wallet.getWallet(user.id)
      .then((w) => setBalance(w.balance))
      .catch(() => {});
  }, [user?.id]);

  const handleFund = async () => {
    setError('');
    setLoading(true);
    try {
      const payment = await repositories.wallet.fund(user?.id || '', Number(amount), provider);
      if (!payment.authorizationUrl) {
        setError('Could not open payment checkout');
        return;
      }
      if (Platform.OS === 'web') {
        await Linking.openURL(payment.authorizationUrl);
      } else {
        await WebBrowser.openBrowserAsync(payment.authorizationUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Fund Wallet" />

        <GlassCard style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Current Balance</Text>
          <Text style={[styles.balance, { color: colors.primaryText }]}>{formatCurrency(balance)}</Text>
        </GlassCard>

        <Text style={[styles.label, { color: colors.primaryText }]}>Enter Amount</Text>
        <View style={[styles.amountRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.currency, { color: colors.primary }]}>₦</Text>
          <GlassInput
            placeholder="Minimum ₦500"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            containerStyle={styles.amountInput}
          />
        </View>

        <View style={styles.quickAmounts}>
          {quickAmounts.map((a) => (
            <TouchableOpacity
              key={a}
              activeOpacity={0.8}
              onPress={() => setAmount(String(a))}
              style={[styles.quickChip, { backgroundColor: Number(amount) === a ? colors.primary : colors.surface, borderColor: Number(amount) === a ? colors.primary : colors.border }]}
            >
              <Text style={[styles.quickText, { color: Number(amount) === a ? colors.inverseText : colors.primaryText }]}>₦{a.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.primaryText }]}>Select Payment Method</Text>
        {providers.map((p) => (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.8}
            onPress={() => setProvider(p.id)}
            style={[styles.provider, { backgroundColor: colors.surface, borderColor: provider === p.id ? colors.primary : colors.border }]}
          >
            <View style={[styles.providerIcon, { backgroundColor: colors.glassSurface }]}>
              <Ionicons name={p.icon as any} size={20} color={colors.primary} />
            </View>
            <View style={styles.providerInfo}>
              <Text style={[styles.providerName, { color: colors.primaryText }]}>{p.name}</Text>
              <Text style={[styles.providerDesc, { color: colors.secondaryText }]}>{p.description}</Text>
            </View>
            <View style={[styles.radio, { borderColor: provider === p.id ? colors.primary : colors.border }, provider === p.id && { backgroundColor: colors.primary }]}>
              {provider === p.id && <Ionicons name="checkmark" size={12} color={colors.inverseText} />}
            </View>
          </TouchableOpacity>
        ))}

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <GlassButton title="Proceed to Payment" rightIcon={<Ionicons name="arrow-forward" size={18} color={colors.inverseText} />} loading={loading} onPress={handleFund} style={styles.button} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  balanceCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(114, 198, 69, 0.08)',
  },
  balanceLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.lg,
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
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  quickText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
  error: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  providerDesc: {
    fontSize: typography.sizes.sm,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: spacing.lg,
  },
});
