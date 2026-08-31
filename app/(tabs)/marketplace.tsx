import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, ProductCard, SectionHeader, SkeletonList, ErrorState, EmptyState } from '@components';
import { Listing } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';

const categories = ['All', 'Socials', 'Gaming', 'Streaming', 'Tools', 'Others'];

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.marketplace.getListings({
          search: search || undefined,
          category: category === 'All' ? undefined : category,
        });
        setListings(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load marketplace');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [search, category, retry]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.inner}>
          <Text style={[styles.title, { color: colors.primaryText }]}>Logs Market</Text>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => { setRetry((r) => r + 1); setLoading(true); setError(''); }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.primaryText }]}>Logs Market</Text>
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedText} />
          <TextInput
            style={[styles.searchInput, { color: colors.primaryText }]}
            placeholder="Search products..."
            placeholderTextColor={colors.mutedText}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {categories.map((c) => (
            <TouchableOpacityChip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <SectionHeader title="Featured Products" />
        {listings.length === 0 ? (
          <EmptyState icon="cart-outline" title="No products found" description="Try adjusting your search or filters" />
        ) : (
          <View style={styles.grid}>
            {listings.map((l) => (
              <ProductCard key={l.id} listing={l} onPress={() => router.push(`/marketplace/${l.id}` as any)} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function TouchableOpacityChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }, active && {}]}>
      <Text style={[styles.chipText, { color: active ? colors.inverseText : colors.secondaryText }]} onPress={onPress}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.base,
  },
  filters: {
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
});
