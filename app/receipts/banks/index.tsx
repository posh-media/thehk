import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, LoadingState, ErrorState } from '@components';
import { Bank } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';

export default function BankSelectionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.bank.getBanks();
        const sorted = data.sort((a, b) => Number(b.implemented) - Number(a.implemented));
        setBanks(sorted);
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

  function handleSelect(bank: Bank) {
    if (bank.implemented && bank.receiptTemplate === 'opay') {
      router.push(`/receipts/banks/opay?bankId=${bank.id}` as any);
      return;
    }
    router.push(`/receipts/generate?bankId=${bank.id}` as any);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Select Bank" subtitle="Choose a bank to generate a receipt for" />

        <View style={styles.grid}>
          {banks.map((bank) => (
            <TouchableOpacity key={bank.id} activeOpacity={0.8} onPress={() => handleSelect(bank)} style={styles.bankWrapper}>
              <GlassCard style={styles.card}>
                <View style={styles.logoBox}>
                  <Image
                    source={bank.logoAsset ? bank.logoAsset : { uri: bank.logoUrl }}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityLabel={bank.name}
                  />
                </View>
                <Text style={[styles.name, { color: colors.primaryText }]} numberOfLines={1}>
                  {bank.name}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  bankWrapper: {
    width: '33.333%',
    padding: spacing.xs,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    minHeight: 110,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
    textAlign: 'center',
  },
});
