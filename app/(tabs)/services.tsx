import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { ServiceCard, SectionHeader, SkeletonList } from '@components';
import { Service } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { openService } from '@lib/serviceNavigation';

const SERVICES_CACHE_KEY = '@thehk/services';

export default function ServicesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const s = await repositories.service.getServices();
      setServices(s);
      await AsyncStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(s));
    } catch (err: any) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadCached() {
      try {
        const cached = await AsyncStorage.getItem(SERVICES_CACHE_KEY);
        if (cached) {
          setServices(JSON.parse(cached) as Service[]);
          setLoading(false);
        }
      } catch {
        // ignore cache read errors
      }
      refresh();
    }
    loadCached();
  }, [refresh]);

  if (loading && services.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.inner}>
          <Text style={[styles.title, { color: colors.primaryText }]}>All Services</Text>
          <SkeletonList count={5} />
        </View>
      </View>
    );
  }

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
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}

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

        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.primaryText }]}>All Services</Text>
          <TouchableOpacity onPress={refresh} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
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
  errorText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
