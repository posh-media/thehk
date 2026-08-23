import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { spacing } from '@theme/tokens';
import { Header, GlassCard, GlassInput, GlassSelect, GlassButton } from '@components';

const platforms = [
  { label: 'Steam', value: 'steam' },
  { label: 'PlayStation', value: 'playstation' },
  { label: 'Xbox', value: 'xbox' },
  { label: 'Mobile Legends', value: 'mobile-legends' },
];

const products: Record<string, { label: string; value: string }[]> = {
  steam: [
    { label: 'Steam Wallet $10', value: 'steam-10' },
    { label: 'Steam Wallet $25', value: 'steam-25' },
    { label: 'Steam Wallet $50', value: 'steam-50' },
  ],
  playstation: [
    { label: 'PSN $10', value: 'psn-10' },
    { label: 'PSN $20', value: 'psn-20' },
    { label: 'PSN $50', value: 'psn-50' },
  ],
  xbox: [
    { label: 'Xbox $10', value: 'xbox-10' },
    { label: 'Xbox $25', value: 'xbox-25' },
    { label: 'Xbox $50', value: 'xbox-50' },
  ],
  'mobile-legends': [
    { label: '50 Diamonds', value: 'ml-50' },
    { label: '200 Diamonds', value: 'ml-200' },
    { label: '500 Diamonds', value: 'ml-500' },
  ],
};

export default function GamingScreen() {
  const { colors } = useTheme();
  const [platform, setPlatform] = useState('');
  const [product, setProduct] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');

  const productOptions = products[platform] || [];
  const isValid = Boolean(platform) && Boolean(product) && accountId.length > 0 && (parseFloat(amount) || 0) > 0;

  function onPlatformChange(value: string) {
    setPlatform(value);
    setProduct('');
  }

  function handleBuy() {
    Alert.alert(
      'Coming Soon',
      'Gaming top-ups are not yet available. The architecture is in place and will be connected to a verified provider in a future update.'
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Gaming" />
        <GlassCard style={styles.card}>
          <GlassSelect
            label="Platform / Game"
            options={platforms}
            value={platform}
            onSelect={onPlatformChange}
            placeholder="Select platform"
            leftIcon="game-controller"
          />
          <GlassSelect
            label="Product"
            options={productOptions}
            value={product}
            onSelect={setProduct}
            placeholder="Select product"
            leftIcon="cube"
          />
          <GlassInput
            label="Account ID"
            value={accountId}
            onChangeText={setAccountId}
            placeholder="Enter player ID or username"
            leftIcon="person"
            containerStyle={styles.input}
          />
          <GlassInput
            label="Amount (NGN)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter amount"
            leftIcon="cash"
            containerStyle={styles.input}
          />
          <GlassButton title="Buy Now" onPress={handleBuy} disabled={!isValid} style={styles.button} />
        </GlassCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { padding: spacing.xl },
  input: { marginBottom: spacing.md },
  button: { marginTop: spacing.md },
});
