import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, GlassInput, GlassSelect, GlassButton, ErrorState, EmptyState, LoadingState } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { NetworkOperator, DataPlan } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';

export default function DataScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser ?? repositories.auth.getCurrentUser();

  const [operators, setOperators] = useState<NetworkOperator[]>([]);
  const [operatorId, setOperatorId] = useState('');
  const [phone, setPhone] = useState('');
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [plansError, setPlansError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [ops, wallet] = await Promise.all([
          repositories.utility.getNetworkOperators(),
          repositories.wallet.getWallet(user?.id || ''),
        ]);
        setOperators(ops.filter((o) => o.supportsData));
        setBalance(wallet.balance);
      } catch (err: any) {
        setLoadError(err.message || 'Unable to load data networks. The provider may be unavailable.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  async function loadPlans(id: string) {
    setOperatorId(id);
    setSelectedPlanId('');
    setPlans([]);
    if (!id) return;
    setPlansLoading(true);
    setPlansError('');
    try {
      const result = await repositories.utility.getDataPlans(id);
      setPlans(result);
    } catch (err: any) {
      setPlansError(err.message || 'Unable to load data plans right now.');
    } finally {
      setPlansLoading(false);
    }
  }

  async function handlePhoneBlur() {
    if (phone.length < 10) return;
    setDetecting(true);
    try {
      const detected = await repositories.utility.detectNetworkOperator(phone);
      if (detected && detected.id !== operatorId) {
        loadPlans(detected.id);
      }
    } catch {
      // Auto-detect is a convenience only; the user can still pick manually.
    } finally {
      setDetecting(false);
    }
  }

  const operatorOptions = operators.map((o) => ({ label: o.name, value: o.id }));
  const selectedOperator = operators.find((o) => o.id === operatorId) || null;
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;
  const isValid = Boolean(selectedOperator) && phone.length >= 10 && Boolean(selectedPlan) && (selectedPlan?.amount ?? 0) <= (balance ?? 0);

  async function handleConfirm() {
    if (!selectedOperator || !selectedPlan) return;
    setSubmitting(true);
    setFormError('');
    try {
      await repositories.utility.purchaseData({ operatorId: selectedOperator.id, phone, planId: selectedPlan.id });
      Alert.alert('Data Purchased', `${selectedPlan.description} sent to ${phone}.`);
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
    return <EmptyState icon="wifi-outline" title="Data unavailable" description="The data provider is not available right now. Please try again later." />;
  }

  if (reviewing && selectedOperator && selectedPlan) {
    const balanceAfter = (balance ?? 0) - selectedPlan.amount;
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Header title="Review Purchase" onBack={() => setReviewing(false)} />
          <GlassCard style={styles.card}>
            <ReviewRow label="Network" value={selectedOperator.name} colors={colors} />
            <ReviewRow label="Phone Number" value={phone} colors={colors} />
            <ReviewRow label="Plan" value={selectedPlan.description} colors={colors} />
            <ReviewRow label="Amount" value={formatCurrency(selectedPlan.amount)} colors={colors} />
            <View style={styles.divider} />
            <ReviewRow label="Wallet Balance" value={formatCurrency(balance ?? 0)} colors={colors} />
            <ReviewRow label="Balance After" value={formatCurrency(balanceAfter)} colors={colors} emphasis />
          </GlassCard>
          {formError ? <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text> : null}
          <GlassButton title={`Pay ${formatCurrency(selectedPlan.amount)}`} onPress={handleConfirm} loading={submitting} style={styles.button} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Buy Data" />
        <GlassCard style={styles.card}>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Wallet Balance</Text>
            <Text style={[styles.balanceValue, { color: colors.primaryText }]}>{balance !== null ? formatCurrency(balance) : '—'}</Text>
          </View>

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
          <GlassSelect
            label={detecting ? 'Detected Network' : 'Network'}
            options={operatorOptions}
            value={operatorId}
            onSelect={loadPlans}
            placeholder={loading ? 'Loading networks...' : 'Select or detect network'}
            leftIcon="cellular"
          />
        </GlassCard>

        {operatorId ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Available Plans</Text>
            {plansLoading ? (
              <LoadingState />
            ) : plansError ? (
              <ErrorState message={plansError} onRetry={() => loadPlans(operatorId)} />
            ) : plans.length === 0 ? (
              <EmptyState icon="cube-outline" title="No plans available" description="This network has no data plans available right now." />
            ) : (
              <View style={styles.planGrid}>
                {plans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedPlanId(plan.id)}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: selectedPlanId === plan.id ? colors.primary : colors.surface,
                        borderColor: selectedPlanId === plan.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.planDescription, { color: selectedPlanId === plan.id ? colors.inverseText : colors.primaryText }]}>
                      {plan.description}
                    </Text>
                    <Text style={[styles.planPrice, { color: selectedPlanId === plan.id ? colors.inverseText : colors.primary }]}>
                      {formatCurrency(plan.amount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : null}

        {selectedPlan && balance !== null && selectedPlan.amount > balance && (
          <Text style={[styles.errorText, { color: colors.error }]}>Insufficient wallet balance</Text>
        )}

        <GlassButton title="Review Purchase" onPress={() => setReviewing(true)} disabled={!isValid} style={styles.button} />
        {selectedPlan && balance !== null && selectedPlan.amount > balance && (
          <GlassButton title="Fund Wallet" onPress={() => router.push('/wallet/fund')} variant="secondary" style={styles.button} />
        )}
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
  card: { padding: spacing.xl, marginBottom: spacing.lg },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  balanceLabel: { fontSize: typography.sizes.sm },
  balanceValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any },
  input: { marginBottom: 0 },
  hint: { fontSize: typography.sizes.xs, marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any, marginBottom: spacing.md },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  planCard: { width: '47%', padding: spacing.md, borderRadius: 16, borderWidth: 1 },
  planDescription: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  planPrice: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any },
  errorText: { fontSize: typography.sizes.sm, marginBottom: spacing.md },
  button: { marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  reviewLabel: { fontSize: typography.sizes.base },
  reviewValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
});
