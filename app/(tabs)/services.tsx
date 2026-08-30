import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, ServiceCard, SectionHeader, SkeletonList, ErrorState } from '@components';
import { Service } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { openService } from '@lib/serviceNavigation';

export default function ServicesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const s = await repositories.service.getServices();
        setServices(s);
      } catch (err: any) {
        setError(err.message || 'Failed to load services');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.inner}>
          <Text style={[styles.title, { color: colors.primaryText }]}>All Services</Text>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

  const normalizedSearch = search.toLowerCase();

  const popular = useMemo(
    () => services.filter((s) => s.isPopular).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [services]
  );
  const all = useMemo(
    () => services.filter((s) => s.name.toLowerCase().includes(normalizedSearch)).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [services, normalizedSearch]
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.primaryText }]}>All Services</Text>
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedText} />
          <TextInput
            style={[styles.searchInput, { color: colors.primaryText }]}
            placeholder="Search services..."
            placeholderTextColor={colors.mutedText}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <SectionHeader title="Popular Services" />
        <View style={styles.grid}>
          {popular.map((s) => (
            <ServiceCard key={s.id} item={s} onPress={() => openService(router, s)} />
          ))}
        </View>

        <SectionHeader title="All Services" />
        <View style={styles.grid}>
          {all.map((s) => (
            <ServiceCard key={s.id} item={s} onPress={() => openService(router, s)} />
          ))}
        </View>

        {all.length === 0 && (
          <Text style={[styles.empty, { color: colors.secondaryText }]}>No services found.</Text>
        )}
      </View>
    </ScrollView>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: typography.sizes.base,
  },
});
