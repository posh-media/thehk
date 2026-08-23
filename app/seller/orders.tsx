import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, GlassInput, StatusBadge, LoadingState, ErrorState, EmptyState, GlassBottomSheet } from '@components';
import { MarketplaceOrder } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatCurrency, formatDate } from '@lib/formatters';

type FilterKey = 'all' | 'pending' | 'completed' | 'refunded';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Delivered' },
  { key: 'refunded', label: 'Refunded' },
];

export default function SellerOrdersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const [deliverOrder, setDeliverOrder] = useState<MarketplaceOrder | null>(null);
  const [credentialLabel, setCredentialLabel] = useState('');
  const [credentialSecret, setCredentialSecret] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await repositories.marketplace.getOrders(user?.id || '', 'seller');
        setOrders(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  const stats = {
    total: orders.length,
    completed: orders.filter((o) => o.status === 'completed').length,
    pending: orders.filter((o) => o.status === 'pending').length,
    refunded: orders.filter((o) => o.status === 'refunded').length,
  };

  const filteredOrders = orders.filter((o) => filter === 'all' || o.status === filter);

  const openDeliverSheet = (order: MarketplaceOrder) => {
    setDeliverOrder(order);
    setCredentialLabel('');
    setCredentialSecret('');
    setInstructions('');
    setSubmitError('');
  };

  const handleDeliver = async () => {
    if (!deliverOrder) return;
    if (!credentialLabel || !credentialSecret) {
      setSubmitError('Email/Username and Password/Token are required');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError('');
      const credentials = JSON.stringify({
        credentialLabel,
        credentialSecret,
        instructions,
      });
      await repositories.marketplace.deliverOrder(deliverOrder.id, credentials);
      setOrders((prev) =>
        prev.map((o) => (o.id === deliverOrder.id ? { ...o, status: 'completed' as const } : o))
      );
      setDeliverOrder(null);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to deliver order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.primaryText }]}>Order Management</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Track and deliver your marketplace sales.
          </Text>

          <View style={styles.statsGrid}>
            <StatCard label="Total Orders" value={stats.total} icon="cart-outline" color={colors.info} bg={colors.infoSurface} />
            <StatCard label="Completed" value={stats.completed} icon="checkmark-done-outline" color={colors.success} bg={colors.successSurface} />
            <StatCard label="Pending" value={stats.pending} icon="time-outline" color={colors.warning} bg={colors.warningSurface} />
            <StatCard label="Refunded" value={stats.refunded} icon="return-up-back-outline" color={colors.error} bg={colors.errorSurface} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: filter === f.key ? colors.primary : colors.surface,
                    borderColor: filter === f.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: filter === f.key ? colors.inverseText : colors.secondaryText }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setLoading(true)} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState icon="receipt-outline" title="No orders found" description="Orders matching this filter will appear here" />
          ) : (
            filteredOrders.map((order) => (
              <GlassCard key={order.id} style={styles.orderCard} blur={false}>
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orderProduct, { color: colors.primaryText }]} numberOfLines={1}>
                      {order.listing?.product.name || 'Product'}
                    </Text>
                    <Text style={[styles.orderRef, { color: colors.mutedText }]}>{order.reference}</Text>
                  </View>
                  <StatusBadge status={order.status} />
                </View>

                <View style={styles.orderMetaRow}>
                  <Text style={[styles.orderMeta, { color: colors.secondaryText }]}>
                    Qty {order.quantity} • {formatDate(order.createdAt)}
                  </Text>
                  <Text style={[styles.orderAmount, { color: colors.primary }]}>{formatCurrency(order.totalPrice)}</Text>
                </View>

                {order.status === 'pending' && (
                  <GlassButton
                    title="Deliver Account"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Ionicons name="send-outline" size={16} color={colors.primaryText} />}
                    style={styles.deliverButton}
                    onPress={() => openDeliverSheet(order)}
                  />
                )}
              </GlassCard>
            ))
          )}
        </View>
      </ScrollView>

      <GlassBottomSheet visible={!!deliverOrder} onClose={() => setDeliverOrder(null)}>
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.primaryText }]}>Deliver Account Credentials</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.secondaryText }]}>
            {deliverOrder?.listing?.product.name} • {formatCurrency(deliverOrder?.totalPrice || 0)}
          </Text>

          <GlassInput
            label="Email / Username"
            placeholder="Enter account email or username"
            value={credentialLabel}
            onChangeText={setCredentialLabel}
            containerStyle={styles.field}
          />
          <GlassInput
            label="Password / Token"
            placeholder="Enter password or access token"
            value={credentialSecret}
            onChangeText={setCredentialSecret}
            secureTextEntry
            containerStyle={styles.field}
          />
          <GlassInput
            label="Additional Instructions (optional)"
            placeholder="e.g. Do not change the password for 7 days"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
            containerStyle={styles.field}
            style={styles.textArea}
          />

          {submitError && <Text style={[styles.submitError, { color: colors.error }]}>{submitError}</Text>}

          <GlassButton title="Submit to Buyer" loading={submitting} onPress={handleDeliver} style={styles.submitButton} />
        </View>
      </GlassBottomSheet>
    </View>
  );
}

function StatCard({ label, value, icon, color, bg }: { label: string; value: number; icon: string; color: string; bg: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCardOuter}>
      <GlassCard style={styles.statCard} blur={false}>
        <View style={[styles.statIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.primaryText }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{label}</Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  statCardOuter: {
    width: '50%',
    padding: spacing.xs,
  },
  statCard: {
    padding: spacing.md,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  filtersRow: {
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
  orderCard: {
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  orderProduct: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
  orderRef: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  orderMeta: {
    fontSize: typography.sizes.sm,
  },
  orderAmount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
  },
  deliverButton: {
    alignSelf: 'flex-start',
  },
  sheetContent: {
    padding: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitError: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.xs,
  },
});
