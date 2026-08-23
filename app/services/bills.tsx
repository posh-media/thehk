import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, GlassInput, GlassSelect, GlassButton, ErrorState, EmptyState } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { BillCategory, Biller } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';

// Bill/Subscription payments via Reloadly's Utility Payments API. Categories
// and billers are loaded live from the provider (never hardcoded) - see
// functions/src/providers/reloadlyUtilityProvider.ts and
// PHASE_3C_COMPLETION_REPORT.md for what has and hasn't been verified.
export default function BillsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser ?? repositories.auth.getCurrentUser();

  const [categories, setCategories] = useState<BillCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billerId, setBillerId] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [billersLoading, setBillersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [billersError, setBillersError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [cats, wallet] = await Promise.all([
          repositories.utility.getBillCategories(),
          repositories.wallet.getWallet(user?.id || ''),
        ]);
        setCategories(cats);
        setBalance(wallet.balance);
      } catch (err: any) {
        setLoadError(err.message || 'Unable to load bill categories. The provider may be unavailable.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  async function loadBillers(catId: string) {
    setCategoryId(catId);
    setBillerId('');
    setBillers([]);
    if (!catId) return;
    setBillersLoading(true);
    setBillersError('');
    try {
      const result = await repositories.utility.getBillers(catId);
      setBillers(result);
    } catch (err: any) {
      setBillersError(err.message || 'Unable to load billers right now.');
    } finally {
      setBillersLoading(false);
    }
  }

  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.id }));
  const billerOptions = billers.map((b) => ({ label: b.name, value: b.id }));
  const selectedBiller = billers.find((b) => b.id === billerId) || null;
  const numericAmount = parseFloat(amount) || 0;
  const amountKobo = numericAmount * 100;
  const isValid = Boolean(selectedBiller) && customerNumber.length >= 3 && numericAmount > 0 && amountKobo <= (balance ?? 0);

  async function handleConfirm() {
    if (!selectedBiller) return;
    setSubmitting(true);
    setFormError('');
    try {
      await repositories.utility.payBill({ billerId: selectedBiller.id, customerNumber, amount: numericAmount });
      Alert.alert('Payment Submitted', `Your ${selectedBiller.name} payment is being processed.`);
      router.back();
    } catch (err: any) {
      setFormError(err.message || 'Payment could not be completed. Your wallet has not been charged.');
      setReviewing(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} onRetry={() => { setLoadError(''); setLoading(true); }} />;
  if (!loading && categories.length === 0) {
    return <EmptyState icon="receipt-outline" title="Bills unavailable" description="No bill payment categories are available right now. Please try again later." />;
  }

  if (reviewing && selectedBiller) {
    const balanceAfter = (balance ?? 0) - amountKobo;
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Header title="Review Payment" onBack={() => setReviewing(false)} />
          <GlassCard style={styles.card}>
            <ReviewRow label="Biller" value={selectedBiller.name} colors={colors} />
            <ReviewRow label="Customer Number" value={customerNumber} colors={colors} />
            <ReviewRow label="Amount" value={formatCurrency(amountKobo)} colors={colors} />
            <View style={styles.divider} />
            <ReviewRow label="Wallet Balance" value={formatCurrency(balance ?? 0)} colors={colors} />
            <ReviewRow label="Balance After" value={formatCurrency(balanceAfter)} colors={colors} emphasis />
          </GlassCard>
          {formError ? <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text> : null}
          <GlassButton title={`Pay ${formatCurrency(amountKobo)}`} onPress={handleConfirm} loading={submitting} style={styles.button} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Bills & Subscriptions" />
        <GlassCard style={styles.card}>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Wallet Balance</Text>
            <Text style={[styles.balanceValue, { color: colors.primaryText }]}>{balance !== null ? formatCurrency(balance) : '—'}</Text>
          </View>

          <GlassSelect
            label="Category"
            options={categoryOptions}
            value={categoryId}
            onSelect={loadBillers}
            placeholder={loading ? 'Loading categories...' : 'Select category'}
            leftIcon="receipt"
          />

          {categoryId && billersLoading && (
            <Text style={[styles.hint, { color: colors.secondaryText }]}>Loading billers…</Text>
          )}
          {categoryId && billersError && (
            <Text style={[styles.errorText, { color: colors.error }]}>{billersError}</Text>
          )}
          {categoryId && !billersLoading && !billersError && billers.length === 0 && (
            <Text style={[styles.hint, { color: colors.secondaryText }]}>No billers available for this category.</Text>
          )}

          {billers.length > 0 && (
            <GlassSelect
              label="Biller"
              options={billerOptions}
              value={billerId}
              onSelect={setBillerId}
              placeholder="Select biller"
              leftIcon="business"
            />
          )}

          {selectedBiller && (
            <>
              <GlassInput
                label="Customer / Meter / Account Number"
                value={customerNumber}
                onChangeText={setCustomerNumber}
                placeholder="Enter number"
                leftIcon="card"
                containerStyle={styles.input}
              />
              <Text style={[styles.hint, { color: colors.secondaryText }]}>
                Automatic verification isn't available for this biller — please double-check your details before paying.
              </Text>
              <GlassInput
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                leftIcon="cash"
                containerStyle={styles.input}
              />
            </>
          )}

          {numericAmount > 0 && balance !== null && amountKobo > balance && (
            <Text style={[styles.errorText, { color: colors.error }]}>Insufficient wallet balance</Text>
          )}

          <GlassButton title="Review Payment" onPress={() => setReviewing(true)} disabled={!isValid} style={styles.button} />
          {numericAmount > 0 && balance !== null && amountKobo > balance && (
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
  hint: { fontSize: typography.sizes.xs, marginBottom: spacing.md },
  errorText: { fontSize: typography.sizes.sm, marginBottom: spacing.md },
  button: { marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  reviewLabel: { fontSize: typography.sizes.base },
  reviewValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
});
