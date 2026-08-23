import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassButton, ProductCard, SectionHeader, LoadingState, ErrorState, EmptyState } from '@components';
import { Listing } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';

export default function MyListingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await repositories.marketplace.getMyListings(user?.id || '');
        setListings(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load listings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  const activeCount = listings.filter((l) => l.status === 'active').length;
  const pendingCount = listings.filter((l) => l.status === 'pending_review').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
              <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.primaryText }]}>My Listings</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Manage your marketplace products and track their performance.
          </Text>

          <View style={styles.statsRow}>
            <StatPill label="Active" value={activeCount} color={colors.success} bg={colors.successSurface} />
            <StatPill label="Pending" value={pendingCount} color={colors.warning} bg={colors.warningSurface} />
            <StatPill label="Total" value={listings.length} color={colors.info} bg={colors.infoSurface} />
          </View>

          <GlassButton
            title="Add New Listing"
            leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.inverseText} />}
            style={styles.addButton}
            onPress={() => router.push('/seller/upload')}
          />

          <SectionHeader title="Your Products" />

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setLoading(true)} />
          ) : listings.length === 0 ? (
            <EmptyState
              icon="pricetags-outline"
              title="No listings yet"
              description="Start selling by uploading your first product."
              action="Add New Listing"
              onAction={() => router.push('/seller/upload')}
            />
          ) : (
            listings.map((l) => (
              <ProductCard
                key={l.id}
                listing={l}
                horizontal
                onPress={() => router.push(`/marketplace/${l.id}` as any)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatPill({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.statPill, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  headerRow: { marginBottom: spacing.md },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statPill: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  addButton: {
    marginBottom: spacing.xl,
  },
});
