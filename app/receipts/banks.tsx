import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, Header, LoadingState, ErrorState } from '@components';
import { Bank } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';

export default function BanksScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.bank.getBanks();
        setBanks(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load banks');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retry]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => { setRetry((r) => r + 1); setLoading(true); setError(''); }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Select Bank" />

        {banks.map((bank) => {
          const isSelected = selected === bank.id;
          const initial = bank.name.charAt(0).toUpperCase();
          return (
            <TouchableOpacity key={bank.id} activeOpacity={0.8} onPress={() => setSelected(bank.id)}>
              <GlassCard style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.logo, { backgroundColor: colors.primaryGlow }]}>
                    <Text style={[styles.initial, { color: colors.primary }]}>{initial}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.primaryText }]}>{bank.name}</Text>
                    <Text style={[styles.code, { color: colors.secondaryText }]}>Bank code: {bank.code}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={isSelected ? colors.primary : colors.mutedText}
                  />
                </View>
              </GlassCard>
            </TouchableOpacity>
          );
        })}

        <GlassButton
          title="Continue"
          disabled={!selected}
          onPress={() => router.back()}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  initial: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
  },
  info: { flex: 1 },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  code: { fontSize: typography.sizes.sm },
  button: { marginTop: spacing.lg },
});
