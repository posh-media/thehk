import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, GlassInput, GlassSelect, GlassButton, SectionHeader, StatusBadge, SkeletonList, ErrorState, EmptyState } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';
import { SocialMediaService, ServiceOrder } from '@/types/domain';
import { formatCurrency, formatDate } from '@lib/formatters';

export default function SMMScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user: storeUser } = useAuthStore();
  const user = storeUser ?? repositories.auth.getCurrentUser();

  const [services, setServices] = useState<SocialMediaService[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [selectedService, setSelectedService] = useState<SocialMediaService | null>(null);
  const [link, setLink] = useState('');
  const [linkHint, setLinkHint] = useState('');
  const [quantity, setQuantity] = useState('1000');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [allServices, allOrders] = await Promise.all([
          repositories.service.getSocialMediaServices(),
          repositories.service.getOrders(user?.id || ''),
        ]);
        setServices(allServices);
        setOrders(allOrders.filter((o) => !o.serviceType || o.serviceType === 'social_media'));
      } catch (err: any) {
        setError(err.message || 'Failed to load services');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  const platforms = React.useMemo(
    () => [...new Set(services.map((s) => s.platform))].map((p) => ({ label: p, value: p })),
    [services]
  );
  const filteredServices = services.filter((s) => s.platform === selectedCategory);
  const serviceOptions = filteredServices.map((s) => ({ label: s.name, value: s.id }));

  function handleCategoryChange(value: string) {
    const exact = services.find((s) => s.platform.toLowerCase() === value.toLowerCase())?.platform;
    const platform = exact || value;
    setSelectedCategory(platform);
    setServiceId('');
    setSelectedService(null);
    const first = services.find((s) => s.platform === platform);
    if (first) {
      setServiceId(first.id);
      setSelectedService(first);
      setQuantity(first.minQuantity.toString());
    }
  }

  function handleServiceChange(value: string) {
    setServiceId(value);
    const found = services.find((s) => s.id === value) || null;
    setSelectedService(found);
    if (found) {
      setQuantity(found.minQuantity.toString());
    }
  }

  function detectPlatform(urlText: string): string | null {
    try {
      const url = new URL(urlText.trim());
      const host = url.hostname.toLowerCase();
      const map: Record<string, string[]> = {
        Instagram: ['instagram'],
        Twitter: ['twitter', 'x.com'],
        YouTube: ['youtube', 'youtu.be'],
        TikTok: ['tiktok'],
        Facebook: ['facebook', 'fb.me'],
      };
      for (const [platform, keys] of Object.entries(map)) {
        if (keys.some((k) => host.includes(k))) return platform;
      }
    } catch {
      return null;
    }
    return null;
  }

  async function handlePaste() {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      setLinkHint('Clipboard is empty');
      return;
    }
    try {
      new URL(text.trim());
    } catch {
      setLink(text);
      setLinkHint('Pasted text is not a valid URL. Please enter the link manually.');
      return;
    }
    setLink(text.trim());
    const platform = detectPlatform(text);
    if (platform) {
      handleCategoryChange(platform);
      setLinkHint(`Detected ${platform}. Select the matching service below.`);
    } else {
      setLinkHint('Could not detect a supported social platform. Please select the category manually.');
    }
  }

  const total = selectedService ? (parseInt(quantity) || 0) * selectedService.rate : 0;

  const isValid =
    Boolean(selectedService) &&
    link.length > 0 &&
    selectedService !== null &&
    parseInt(quantity) >= selectedService.minQuantity &&
    parseInt(quantity) <= selectedService.maxQuantity;

  async function handlePlaceOrder() {
    if (!selectedService || !link || !quantity) return;
    setSubmitting(true);
    try {
      await repositories.service.placeServiceOrder({
        userId: user?.id || '',
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        platform: selectedService.platform,
        link,
        quantity: parseInt(quantity),
        amount: total,
      });
      const updatedOrders = await repositories.service.getOrders(user?.id || '');
      setOrders(updatedOrders);
      setLink('');
    } catch (err: any) {
      setError(err.message || 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Social Media Services" />
        <SkeletonList count={5} />
      </View>
    );
  }
  if (error && !submitting) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Social Media Services" />

        <GlassCard style={styles.card}>
          <GlassSelect
            label="Category"
            options={platforms}
            value={selectedCategory}
            onSelect={handleCategoryChange}
            placeholder="Select platform"
            leftIcon="people"
          />
          <GlassSelect
            label="Service"
            options={serviceOptions}
            value={serviceId}
            onSelect={handleServiceChange}
            placeholder="Select service"
            leftIcon="cube"
          />
        </GlassCard>

        {selectedService && (
          <GlassCard style={styles.infoCard}>
            <Text style={[styles.infoTitle, { color: colors.primaryText }]}>{selectedService.name}</Text>
            <Text style={[styles.infoDesc, { color: colors.secondaryText }]}>{selectedService.description}</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Rate</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>{formatCurrency(selectedService.rate)} / unit</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Min / Max</Text>
              <Text style={[styles.infoValue, { color: colors.primaryText }]}>
                {selectedService.minQuantity} - {selectedService.maxQuantity}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Refill</Text>
              <Text style={[styles.infoValue, { color: selectedService.refill ? colors.success : colors.error }]}>
                {selectedService.refill ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Cancel</Text>
              <Text style={[styles.infoValue, { color: selectedService.cancel ? colors.success : colors.error }]}>
                {selectedService.cancel ? 'Yes' : 'No'}
              </Text>
            </View>
            {selectedService.averageTime && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Avg. time</Text>
                <Text style={[styles.infoValue, { color: colors.primaryText }]}>{selectedService.averageTime}</Text>
              </View>
            )}
          </GlassCard>
        )}

        <GlassCard style={styles.card}>
          <GlassInput
            label="Link / Profile"
            value={link}
            onChangeText={setLink}
            placeholder="https://instagram.com/username"
            leftIcon="link"
            rightIcon="clipboard-outline"
            onRightIconPress={handlePaste}
            containerStyle={styles.input}
          />
          {linkHint ? <Text style={[styles.hint, { color: colors.secondaryText }]}>{linkHint}</Text> : null}
          <GlassInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            leftIcon="stats-chart"
            containerStyle={styles.input}
          />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.secondaryText }]}>Total charge</Text>
            <Text style={[styles.totalValue, { color: colors.primaryText }]}>{formatCurrency(total)}</Text>
          </View>
          <GlassButton
            title="Place Order"
            onPress={handlePlaceOrder}
            loading={submitting}
            disabled={!isValid}
            style={styles.button}
          />
        </GlassCard>

        <SectionHeader title="Recent Orders" action="See All" onAction={() => router.push('/services/orders')} />
        {orders.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No orders yet" description="Your SMM orders will appear here" />
        ) : (
          <View style={styles.orders}>
            {orders.slice(0, 3).map((o) => (
              <GlassCard key={o.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={[styles.orderName, { color: colors.primaryText }]}>{o.serviceName}</Text>
                  <StatusBadge status={o.status} />
                </View>
                <Text style={[styles.orderMeta, { color: colors.secondaryText }]}>
                  {o.platform} • {o.quantity} units
                </Text>
                <Text style={[styles.orderAmount, { color: colors.primary }]}>
                  {formatCurrency(o.amount)} • {formatDate(o.createdAt)}
                </Text>
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
  card: { marginBottom: spacing.lg },
  infoCard: { marginBottom: spacing.lg },
  infoTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold as any, marginBottom: spacing.xs },
  infoDesc: { fontSize: typography.sizes.base, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  infoLabel: { fontSize: typography.sizes.sm },
  infoValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  input: { marginBottom: spacing.md },
  hint: { fontSize: typography.sizes.sm, marginTop: -spacing.sm, marginBottom: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  totalLabel: { fontSize: typography.sizes.base },
  totalValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any },
  button: { marginTop: spacing.sm },
  orders: { gap: spacing.md },
  orderCard: { marginBottom: spacing.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  orderName: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
  orderMeta: { fontSize: typography.sizes.sm, marginBottom: spacing.xs },
  orderAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
});
