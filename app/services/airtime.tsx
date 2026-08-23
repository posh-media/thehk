import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, GlassInput, GlassSelect, GlassButton, ErrorState, EmptyState } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { NetworkOperator } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';

const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser ?? repositories.auth.getCurrentUser();

  const [operators, setOperators] = useState<NetworkOperator[]>([]);
  const [operatorId, setOperatorId] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [ops, wallet] = await Promise.all([
          repositories.utility.getNetworkOperators(),
          repositories.wallet.getWallet(user?.id || ''),
        ]);
        setOperators(ops.filter((o) => o.supportsAirtime));
        setBalance(wallet.balance);
      } catch (err: any) {
        setLoadError(err.message || 'Unable to load airtime networks. The provider may be unavailable.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  async function handlePhoneBlur() {
    if (phone.length < 10 || operatorId) return;
    setDetecting(true);
    try {
      const detected = await repositories.utility.detectNetworkOperator(phone);
      if (detected) setOperatorId(detected.id);
    } catch {
      // Auto-detect is a convenience only; the user can still pick manually.
    } finally {
      setDetecting(false);
    }
  }

  const operatorOptions = operators.map((o) => ({ label: o.name, value: o.id }));
  const selectedOperator = operators.find((o) => o.id === operatorId) || null;
  const numericAmount = parseFloat(amount) || 0;
  const balanceNaira = balance !== null ? balance / 100 : 0;
  const isValid = Boolean(selectedOperator) && phone.length >= 10 && numericAmount > 0 && numericAmount * 100 <= (balance ?? 0);

  async function handleConfirm() {
    if (!selectedOperator) return;
    setSubmitting(true);
    setFormError('');
    try {
      await repositories.utility.purchaseAirtime({ operatorId: selectedOperator.id, phone, amount: numericAmount });
      Alert.alert('Airtime Purchased', `₦${numericAmount.toLocaleString()} airtime sent to ${phone}.`);
      router.back();
    } catch (err: any) {
      setFormError(err.message || 'Purchase could not be completed. Your wallet has not been charged.');
      setReviewing(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={() => { setLoadError(''); setLoading(true); }} />;

  if (!loading && operators.length === 0) {
    return <EmptyState icon="cellular-outline" title="Airtime unavailable" description="The airtime provider is not available right now. Please try again later." />;
  }

  if (reviewing && selectedOperator) {
    const balanceAfter = (balance ?? 0) - numericAmount * 100;
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Header title="Review Purchase" onBack={() => setReviewing(false)} />
          <GlassCard style={styles.card}>
            <ReviewRow label="Network" value={selectedOperator.name} colors={colors} />
            <ReviewRow label="Phone Number" value={phone} colors={colors} />
            <ReviewRow label="Amount" value={formatCurrency(numericAmount * 100)} colors={colors} />
            <View style={styles.divider} />
            <ReviewRow label="Wallet Balance" value={formatCurrency(balance ?? 0)} colors={colors} />
            <ReviewRow label="Balance After" value={formatCurrency(balanceAfter)} colors={colors} emphasis />
          </GlassCard>
          {formError ? <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text> : null}
          <GlassButton title={`Pay ${formatCurrency(numericAmount * 100)}`} onPress={handleConfirm} loading={submitting} style={styles.button} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Buy Airtime" />
        <GlassCard style={styles.card}>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Wallet Balance</Text>
            <Text style={[styles.balanceValue, { color: colors.primaryText }]}>{balance !== null ? formatCurrency(balance) : '—'}</Text>
          </View>

          <GlassSelect
            label="Network"
            options={operatorOptions}
            value={operatorId}
            onSelect={setOperatorId}
            placeholder={loading ? 'Loading networks...' : 'Select network'}
            leftIcon="cellular"
          />
          <GlassInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            onBlur={handlePhoneBlur}
            placeholder="08012345678"
            keyboardType="phone-pad"
            leftIcon="call"
            containerStyle={styles.input}
          />
          {detecting && <Text style={[styles.hint, { color: colors.secondaryText }]}>Detecting network…</Text>}
          <GlassInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            leftIcon="cash"
            containerStyle={styles.input}
          />

          <Text style={[styles.chipLabel, { color: colors.secondaryText }]}>Quick amounts</Text>
          <View style={styles.chips}>
            {quickAmounts.map((a) => (
              <TouchableOpacity
                key={a}
                activeOpacity={0.8}
                onPress={() => setAmount(a.toString())}
                style={[styles.chip, { backgroundColor: numericAmount === a ? colors.primary : colors.surface }]}
              >
                <Text style={[styles.chipText, { color: numericAmount === a ? colors.inverseText : colors.primaryText }]}>
                  {formatCurrency(a * 100)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {numericAmount > 0 && balance !== null && numericAmount * 100 > balance && (
            <Text style={[styles.errorText, { color: colors.error }]}>Insufficient wallet balance</Text>
          )}

          <GlassButton
            title="Review Purchase"
            onPress={() => setReviewing(true)}
            disabled={!isValid}
            style={styles.button}
          />
          {numericAmount > 0 && balance !== null && numericAmount * 100 > balance && (
            <GlassButton title="Fund Wallet" onPress={() => router.push('/wallet/fund')} variant="secondary" style={styles.button} />
          )}
        </GlassCard>
      </View>
    </ScrollView>
  );
}

function ReviewRow({ label, value, colors, emphasis }: { label: string; value: string; colors: any; emphasis?: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: colors.secondaryText }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: emphasis ? colors.primary : colors.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { padding: spacing.xl },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  balanceLabel: { fontSize: typography.sizes.sm },
  balanceValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any },
  input: { marginBottom: spacing.md },
  hint: { fontSize: typography.sizes.xs, marginBottom: spacing.sm },
  chipLabel: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 9999 },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium as any },
  errorText: { fontSize: typography.sizes.sm, marginBottom: spacing.md },
  button: { marginTop: spacing.md },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  reviewLabel: { fontSize: typography.sizes.base },
  reviewValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
});
