import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, ServiceCard, LoadingState, ErrorState, SectionHeader } from '@components';
import { repositories } from '@repositories/mockRepository';
import { Service, ServiceCategory } from '@/types/domain';
import { openService } from '@lib/serviceNavigation';

export default function ServiceCategoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [categories, allServices] = await Promise.all([
          repositories.service.getCategories(),
          repositories.service.getServices(id),
        ]);
        const found = categories.find((c) => c.id === id) || null;
        setCategory(found);
        setServices(allServices);
      } catch (err: any) {
        setError(err.message || 'Failed to load category');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => setLoading(true)} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title={category?.name || 'Services'} subtitle={category?.description} />
        <GlassCard style={styles.intro}>
          <Text style={[styles.name, { color: colors.primaryText }]}>{category?.name || 'Category'}</Text>
          {category?.description && (
            <Text style={[styles.description, { color: colors.secondaryText }]}>{category.description}</Text>
          )}
        </GlassCard>

        <SectionHeader title="Available Services" />
        {services.length === 0 ? (
          <Text style={[styles.empty, { color: colors.secondaryText }]}>No services in this category.</Text>
        ) : (
          <View style={styles.grid}>
            {services.map((s) => (
              <ServiceCard key={s.id} item={s} onPress={() => openService(router, s)} />
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
  intro: { marginBottom: spacing.xl },
  name: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any },
  description: { fontSize: typography.sizes.base, marginTop: spacing.sm },
  empty: { textAlign: 'center', marginTop: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
});
