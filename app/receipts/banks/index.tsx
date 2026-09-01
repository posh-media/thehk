import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, LoadingState, ErrorState } from '@components';
import { Bank } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';

const ORDERED_SLUGS = [
  'paycom',
  'kuda-bank',
  'united-bank-for-africa',
  'access-bank',
  'guaranty-trust-bank',
  'first-bank-of-nigeria',
  'zenith-bank',
  'fidelity-bank',
  'union-bank-of-nigeria',
  'palmpay',
];

function sortFeatured(banks: Bank[]) {
  return [...banks].sort((a, b) => {
    const ai = ORDERED_SLUGS.indexOf(a.slug || '');
    const bi = ORDERED_SLUGS.indexOf(b.slug || '');
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

function BankLogo({ bank }: { bank: Bank }) {
  const { colors } = useTheme();
  if (bank.logoAsset) {
    return <Image source={bank.logoAsset} style={styles.logo} resizeMode="contain" accessibilityLabel={bank.name} />;
  }
  if (bank.logoUrl) {
    return <Image source={{ uri: bank.logoUrl }} style={styles.logo} resizeMode="contain" accessibilityLabel={bank.name} />;
  }
  return (
    <View style={[styles.initials, { backgroundColor: `${colors.primary}20` }]}>
      <Text style={[styles.initialText, { color: colors.primary }]}>{bank.name.charAt(0)}</Text>
    </View>
  );
}

export default function BankSelectionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [featuredBanks, setFeaturedBanks] = useState<Bank[]>([]);
  const [wallets, setWallets] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.bank.getBanks();
        const bankItems = data.filter((b) => b.category === 'bank');
        const featured = bankItems.filter((b) => ORDERED_SLUGS.includes(b.slug || ''));
        setFeaturedBanks(sortFeatured(featured));
        setWallets(data.filter((b) => b.category === 'wallet'));
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
    // All banks and wallets currently use the default HK receipt template.
    // Per-bank templates can be wired here later by checking bank.receiptTemplate.
    router.push(`/receipts/generate?bankId=${bank.id}` as any);
  }

  function renderGrid(items: Bank[]) {
    return (
      <View style={styles.grid}>
        {items.map((bank) => (
          <TouchableOpacity key={bank.id} activeOpacity={0.8} onPress={() => handleSelect(bank)} style={styles.bankWrapper}>
            <GlassCard style={styles.card}>
              <View style={styles.logoBox}>
                <BankLogo bank={bank} />
              </View>
              <Text style={[styles.name, { color: colors.primaryText }]} numberOfLines={2}>
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
        {renderGrid(featuredBanks)}

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
  initials: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
  },
  name: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium as any,
    textAlign: 'center',
  },
});
