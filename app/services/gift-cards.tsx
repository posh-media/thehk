import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, GlassInput, GlassButton, ErrorState, EmptyState, LoadingState, PaymentBottomSheet } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { GiftCardProduct } from '@/types/domain';
import { formatCurrency } from '@lib/formatters';

type Mode = 'buy' | 'sell';
type Step = 'browse' | 'detail';

// Gift Card marketplace (buying side) via Reloadly's Gift Card API. The
// catalog, denominations, and pricing are loaded live from the provider -
// see functions/src/services/giftCardService.ts and
// PHASE_3C_COMPLETION_REPORT.md for the NGN-only scoping decision and
// verification status. Selling/trading gift cards is intentionally left
// "Coming Soon" - Reloadly has no buyback/trading API, and no other
// provider has been selected for that yet.
export default function GiftCardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser ?? repositories.auth.getCurrentUser();

  const [mode, setMode] = useState<Mode>('buy');
  const [step, setStep] = useState<Step>('browse');
  const [products, setProducts] = useState<GiftCardProduct[]>([]);
  const [selected, setSelected] = useState<GiftCardProduct | null>(null);
  const [denomination, setDenomination] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (mode !== 'buy') return;
    async function load() {
      try {
        const [items, wallet, points, cashback] = await Promise.all([
          repositories.giftCard.getProducts(),
          repositories.wallet.getWallet(user?.id || ''),
          repositories.rewards.getPointsBalance(),
          repositories.cashback.getBalance(),
        ]);
        setProducts(items);
        setBalance(wallet.balance);
        setPointsBalance(points.balance);
        setCashbackBalance(cashback.balance);
      } catch (err: any) {
        setLoadError(err.message || 'Unable to load gift cards. The provider may be unavailable.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mode, user?.id]);

  function openProduct(product: GiftCardProduct) {
    setSelected(product);
    setDenomination(product.fixedDenominations[0] ?? product.minAmount ?? null);
    setQuantity('1');
    setRecipientEmail(user?.email || '');
    setStep('detail');
  }

  const numericQuantity = parseInt(quantity, 10) || 0;
  const totalKobo = denomination !== null ? denomination * numericQuantity : 0;
  const isValid = Boolean(selected) && denomination !== null && numericQuantity > 0 && numericQuantity <= 10 && recipientEmail.includes('@');

  async function handleConfirm(useCashback: boolean) {
    if (!selected || denomination === null) return;
    setSubmitting(true);
    setFormError('');
    try {
      await repositories.giftCard.purchaseGiftCard({
        productId: selected.id,
        unitPrice: denomination,
        quantity: numericQuantity,
        recipientEmail,
        useCashback,
      });
      setShowPaymentSheet(false);
      Alert.alert('Gift Card Order Placed', `Your ${selected.brandName} gift card order is being processed. Check your orders for updates.`);
      router.back();
    } catch (err: any) {
      setFormError(err.message || 'Order could not be completed. Your wallet/cashback has not been charged.');
      Alert.alert('Order Failed', err.message || 'Order could not be completed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'sell') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Header title="Gift Cards" />
          <ModeToggle mode={mode} setMode={setMode} colors={colors} />
          <EmptyState
            icon="gift-outline"
            title="Coming Soon"
            description="Selling/trading gift cards requires a dedicated valuation and verification provider, which hasn't been connected yet."
          />
        </View>
      </ScrollView>
    );
  }

  if (loadError) return <ErrorState message={loadError} onRetry={() => { setLoadError(''); setLoading(true); }} />;
  if (loading) return <LoadingState />;

  if (step === 'detail' && selected) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <Header title={selected.brandName} onBack={() => setStep('browse')} />
          <GlassCard style={styles.card}>
            {selected.logoUrl ? (
              <Image source={{ uri: selected.logoUrl }} style={styles.detailLogo} resizeMode="contain" />
            ) : null}
            {selected.discountPercentage ? (
              <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.discountText}>{selected.discountPercentage}% off</Text>
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Denomination</Text>
            <View style={styles.denomGrid}>
              {(selected.denominationType === 'fixed' ? selected.fixedDenominations : suggestedRange(selected)).map((d) => (
                <TouchableOpacity
                  key={d}
                  activeOpacity={0.85}
                  onPress={() => setDenomination(d)}
                  style={[
                    styles.denomChip,
                    { backgroundColor: denomination === d ? colors.primary : colors.surface, borderColor: denomination === d ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={[styles.denomText, { color: denomination === d ? colors.inverseText : colors.primaryText }]}>{formatCurrency(d)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <GlassInput
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              leftIcon="albums"
              containerStyle={styles.input}
            />
            <GlassInput
              label="Recipient Email"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              containerStyle={styles.input}
            />

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.secondaryText }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primaryText }]}>{formatCurrency(totalKobo)}</Text>
            </View>

            {totalKobo > 0 && balance !== null && totalKobo > balance && (
              <Text style={[styles.errorText, { color: colors.error }]}>Insufficient wallet balance</Text>
            )}

            <GlassButton title="Review Order" onPress={() => setShowPaymentSheet(true)} disabled={!isValid} style={styles.button} />
            {totalKobo > 0 && balance !== null && totalKobo > balance && cashbackBalance < totalKobo - (balance ?? 0) && (
              <GlassButton title="Fund Wallet" onPress={() => router.push('/wallet/fund')} variant="secondary" style={styles.button} />
            )}
          </GlassCard>

          <PaymentBottomSheet
            visible={showPaymentSheet}
            onClose={() => setShowPaymentSheet(false)}
            onConfirm={({ useCashback }) => handleConfirm(useCashback)}
            loading={submitting}
            title={`${selected.brandName} Gift Card`}
            summaryRows={[
              { label: 'Denomination', value: formatCurrency(denomination ?? 0) },
              { label: 'Quantity', value: String(numericQuantity) },
              { label: 'Recipient', value: recipientEmail },
            ]}
            totalAmount={totalKobo}
            walletBalance={balance ?? 0}
            pointsBalance={pointsBalance}
            cashbackBalance={cashbackBalance}
          />
          {formError ? <Text style={[styles.errorText, { color: colors.error }]}>{formError}</Text> : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Gift Cards" />
        <ModeToggle mode={mode} setMode={setMode} colors={colors} />

        {products.length === 0 ? (
          <EmptyState icon="gift-outline" title="No gift cards available" description="The gift card catalog is empty or unavailable right now." />
        ) : (
          <View style={styles.grid}>
            {products.map((p) => (
              <TouchableOpacity key={p.id} activeOpacity={0.85} onPress={() => openProduct(p)} style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {p.logoUrl ? (
                  <Image source={{ uri: p.logoUrl }} style={styles.productLogo} resizeMode="contain" />
                ) : (
                  <View style={[styles.productLogoFallback, { backgroundColor: colors.background }]}>
                    <Text style={{ color: colors.secondaryText }}>{p.brandName.charAt(0)}</Text>
                  </View>
                )}
                <Text style={[styles.productName, { color: colors.primaryText }]} numberOfLines={1}>{p.brandName}</Text>
                <Text style={[styles.productPrice, { color: colors.secondaryText }]}>
                  From {formatCurrency(p.fixedDenominations[0] ?? p.minAmount ?? 0)}
                </Text>
                {p.discountPercentage ? (
                  <View style={[styles.smallBadge, { backgroundColor: colors.success }]}>
                    <Text style={styles.smallBadgeText}>{p.discountPercentage}% off</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function suggestedRange(product: GiftCardProduct): number[] {
  if (!product.minAmount || !product.maxAmount) return [];
  const steps = 4;
  const step = (product.maxAmount - product.minAmount) / steps;
  return Array.from({ length: steps + 1 }, (_, i) => Math.round(product.minAmount! + step * i));
}

function ModeToggle({ mode, setMode, colors }: { mode: Mode; setMode: (m: Mode) => void; colors: any }) {
  return (
    <View style={styles.toggle}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setMode('buy')} style={[styles.toggleTab, { backgroundColor: mode === 'buy' ? colors.primary : colors.surface }]}>
        <Text style={[styles.toggleText, { color: mode === 'buy' ? colors.inverseText : colors.primaryText }]}>Buy</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setMode('sell')} style={[styles.toggleTab, { backgroundColor: mode === 'sell' ? colors.primary : colors.surface }]}>
        <Text style={[styles.toggleText, { color: mode === 'sell' ? colors.inverseText : colors.primaryText }]}>Sell</Text>
      </TouchableOpacity>
    </View>
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
  toggle: { flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.md },
  toggleTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: 9999 },
  toggleText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
  card: { padding: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  productCard: { width: '47%', padding: spacing.md, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  productLogo: { width: 56, height: 56, marginBottom: spacing.sm },
  productLogoFallback: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  productName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  productPrice: { fontSize: typography.sizes.xs, marginBottom: spacing.xs },
  smallBadge: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: 9999, marginTop: spacing.xs },
  smallBadgeText: { color: '#fff', fontSize: 10, fontWeight: typography.weights.bold as any },
  detailLogo: { width: 96, height: 96, alignSelf: 'center', marginBottom: spacing.md },
  discountBadge: { alignSelf: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: 9999, marginBottom: spacing.lg },
  discountText: { color: '#fff', fontWeight: typography.weights.bold as any, fontSize: typography.sizes.xs },
  sectionTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any, marginBottom: spacing.md },
  denomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  denomChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1 },
  denomText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  input: { marginBottom: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  totalLabel: { fontSize: typography.sizes.base },
  totalValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any },
  errorText: { fontSize: typography.sizes.sm, marginBottom: spacing.md },
  button: { marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  reviewLabel: { fontSize: typography.sizes.base },
  reviewValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
});
