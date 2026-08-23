import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { Header, GlassCard, GlassInput, GlassSelect, GlassButton } from '@components';
import { formatCurrency } from '@lib/formatters';

const countries = [
  { label: 'United States (+1)', value: 'us' },
  { label: 'United Kingdom (+44)', value: 'uk' },
  { label: 'Canada (+1)', value: 'ca' },
  { label: 'Nigeria (+234)', value: 'ng' },
];

const prices: Record<string, number> = { us: 2500, uk: 3000, ca: 2800, ng: 1500 };

export default function VirtualNumbersScreen() {
  const { colors } = useTheme();
  const [country, setCountry] = useState('');
  const [quantity, setQuantity] = useState('1');

  const price = country ? prices[country] : 0;
  const qty = parseInt(quantity) || 0;
  const total = price * qty;
  const isValid = Boolean(country) && qty > 0;

  function handleBuy() {
    Alert.alert(
      'Coming Soon',
      'Virtual number rentals are not yet available. The architecture is in place and will be connected to a verified provider in a future update.'
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Virtual Numbers" />
        <GlassCard style={styles.card}>
          <GlassSelect
            label="Country"
            options={countries}
            value={country}
            onSelect={setCountry}
            placeholder="Select country"
            leftIcon="globe"
          />
          <GlassInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            leftIcon="call"
            containerStyle={styles.input}
          />
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.secondaryText }]}>Price each</Text>
            <Text style={[styles.priceValue, { color: colors.primaryText }]}>{formatCurrency(price)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.secondaryText }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primaryText }]}>{formatCurrency(total)}</Text>
          </View>
          <GlassButton title="Buy Number" onPress={handleBuy} disabled={!isValid} style={styles.button} />
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
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  priceLabel: { fontSize: typography.sizes.sm },
  priceValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  totalLabel: { fontSize: typography.sizes.base },
  totalValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any },
  button: { marginTop: spacing.sm },
});
