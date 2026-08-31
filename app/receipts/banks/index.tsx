import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, LoadingState, ErrorState } from '@components';
import { Bank } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';

const BANK_ORDER = ['OPay', 'Kuda', 'United Bank for Africa', 'Access Bank', 'Guaranty Trust Bank', 'First Bank of Nigeria', 'Zenith Bank', 'Fidelity Bank', 'Union Bank', 'PalmPay'];

function sortBanks(banks: Bank[]) {
  return banks.sort((a, b) => {
    const ai = BANK_ORDER.indexOf(a.name);
    const bi = BANK_ORDER.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

export default function BankSelectionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [wallets, setWallets] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.bank.getBanks();
        const bankItems = data.filter((b) => b.category === 'bank');
        const walletItems = data.filter((b) => b.category === 'wallet');
        setBanks(sortBanks(bankItems));
        setWallets(walletItems);
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

  function renderGrid(items: Bank[]) {
    return (
      <View style={styles.grid}>
        {items.map((bank) => (
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
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Select Institution" subtitle="Choose a bank or wallet to generate a receipt for" />

        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Banks</Text>
        {renderGrid(banks)}

        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Wallets</Text>
        {renderGrid(wallets)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
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
