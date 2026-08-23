import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, StatusBadge, LoadingState, ErrorState, GlassBottomSheet } from '@components';
import { Listing } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { formatCurrency } from '@lib/formatters';

export default function ProductDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await repositories.marketplace.getListing(id || '');
        setListing(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePurchase = async () => {
    if (!listing) return;
    try {
      setPurchasing(true);
      await repositories.marketplace.placeOrder({
        buyerId: 'current-user',
        listingId: listing.id,
        sellerId: listing.sellerId,
        quantity: 1,
        totalPrice: listing.price,
      });
      setPurchased(true);
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;
  if (!listing) return <ErrorState title="Not found" message="This product could not be found." onRetry={() => router.back()} />;

  const { product } = listing;
  const isSoldOut = listing.status === 'sold_out' || listing.stock <= 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>

          <Image source={{ uri: product.images[0] }} style={styles.image} />

          <View style={styles.headerRow}>
            <Text style={[styles.name, { color: colors.primaryText }]}>{product.name}</Text>
            <StatusBadge status={isSoldOut ? 'sold_out' : listing.status} />
          </View>

          <Text style={[styles.meta, { color: colors.secondaryText }]}>
            {product.category} • {product.type}
          </Text>

          <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(listing.price)}</Text>

          <GlassCard style={styles.detailsCard} blur={false}>
            <DetailRow icon="cube-outline" label="Stock Available" value={`${listing.stock} unit${listing.stock === 1 ? '' : 's'}`} />
            <DetailRow icon="calendar-outline" label="Year Created" value={product.yearCreated || 'N/A'} />
            <DetailRow icon="shield-checkmark-outline" label="Warranty" value={product.warranty || 'N/A'} />
            <DetailRow icon="ribbon-outline" label="Account Level" value={product.accountLevel || 'N/A'} last />
          </GlassCard>

          {product.shortDescription && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Overview</Text>
              <Text style={[styles.shortDescription, { color: colors.secondaryText }]}>{product.shortDescription}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Description</Text>
            <Text style={[styles.description, { color: colors.secondaryText }]}>{product.description}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.secondaryText }]}>Total Price</Text>
          <Text style={[styles.footerPrice, { color: colors.primaryText }]}>{formatCurrency(listing.price)}</Text>
        </View>
        <GlassButton
          title={isSoldOut ? 'Sold Out' : 'Buy Now'}
          disabled={isSoldOut}
          style={styles.buyButton}
          onPress={() => setConfirmVisible(true)}
        />
      </View>

      <GlassBottomSheet visible={confirmVisible} onClose={() => { setConfirmVisible(false); setPurchased(false); }}>
        {purchased ? (
          <View style={styles.sheetContent}>
            <View style={[styles.successIcon, { backgroundColor: colors.successSurface }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.primaryText }]}>Purchase Successful</Text>
            <Text style={[styles.sheetMessage, { color: colors.secondaryText }]}>
              Your order for {product.name} has been placed. The seller will deliver your account credentials shortly.
            </Text>
            <GlassButton
              title="Done"
              style={styles.sheetButton}
              onPress={() => {
                setConfirmVisible(false);
                setPurchased(false);
                router.push('/wallet');
              }}
            />
          </View>
        ) : (
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: colors.primaryText }]}>Confirm Purchase</Text>
            <Text style={[styles.sheetMessage, { color: colors.secondaryText }]}>
              You are about to buy "{product.name}" for {formatCurrency(listing.price)}. This amount will be deducted from your wallet balance.
            </Text>
            <View style={styles.sheetActions}>
              <GlassButton title="Cancel" variant="outline" style={styles.sheetActionButton} onPress={() => setConfirmVisible(false)} />
              <GlassButton
                title="Confirm & Pay"
                loading={purchasing}
                style={styles.sheetActionButton}
                onPress={handlePurchase}
              />
            </View>
          </View>
        )}
      </GlassBottomSheet>
    </View>
  );
}

function DetailRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, !last && { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.primaryText }]}>{value}</Text>
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
  image: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    flex: 1,
  },
  meta: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  price: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.lg,
  },
  detailsCard: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  shortDescription: {
    fontSize: typography.sizes.base,
    lineHeight: 20,
    fontWeight: typography.weights.medium as any,
  },
  description: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerLabel: {
    fontSize: typography.sizes.xs,
  },
  footerPrice: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  buyButton: {
    minWidth: 160,
  },
  sheetContent: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  sheetMessage: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  sheetButton: {
    width: '100%',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  sheetActionButton: {
    flex: 1,
  },
});
