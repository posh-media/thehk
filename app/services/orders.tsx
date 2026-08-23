import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, StatusBadge, SkeletonList, ErrorState, EmptyState } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { ServiceOrder } from '@/types/domain';
import { formatCurrency, formatDate } from '@lib/formatters';

export default function ServiceOrdersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser ?? repositories.auth.getCurrentUser();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.service.getOrders(user?.id || '');
        setOrders(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Service Orders" />
        <SkeletonList count={5} />
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Service Orders" />
        {orders.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No orders yet" description="Your service orders will appear here" />
        ) : (
          <View style={styles.list}>
            {orders.map((o) => (
              <GlassCard key={o.id} style={styles.orderCard}>
                <View style={styles.header}>
                  <Text style={[styles.serviceName, { color: colors.primaryText }]}>{o.serviceName}</Text>
                  <StatusBadge status={o.status} />
                </View>
                <Text style={[styles.meta, { color: colors.secondaryText }]}>
                  {o.serviceType === 'airtime' || o.serviceType === 'data' || o.serviceType === 'bill'
                    ? `${o.platform} • ${o.link}`
                    : o.serviceType === 'gift_card'
                    ? `${o.platform} • Qty ${o.quantity} • ${o.link}`
                    : `${o.platform} • ${o.quantity} units`}
                </Text>
                <View style={styles.footer}>
                  <Text style={[styles.reference, { color: colors.mutedText }]}>{o.reference}</Text>
                  <Text style={[styles.amount, { color: colors.primary }]}>{formatCurrency(o.amount)}</Text>
                </View>
                <Text style={[styles.date, { color: colors.mutedText }]}>{formatDate(o.createdAt)}</Text>
              </GlassCard>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  list: { gap: spacing.md },
  orderCard: { marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  serviceName: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
  meta: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  reference: { fontSize: typography.sizes.xs },
  amount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any },
  date: { fontSize: typography.sizes.xs },
});
