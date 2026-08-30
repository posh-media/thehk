import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { formatCurrency, formatHkc } from '@lib/formatters';
import { GlassBottomSheet } from './GlassBottomSheet';
import { GlassButton } from './GlassButton';

export interface PaymentSummaryRow {
  label: string;
  value: string;
}

export interface PaymentChoice {
  useCashback: boolean;
}

interface PaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (choice: PaymentChoice) => void;
  loading?: boolean;
  title: string;
  summaryRows: PaymentSummaryRow[];
  totalAmount: number; // kobo
  hkcBalance: number; // whole HKC units
  ngnBalance: number; // kobo
  cashbackBalance: number; // kobo
  cashbackEligible?: boolean; // set false for services that don't support cashback yet
  confirmLabel?: string;
}

const KOBO_PER_HKC = 100;

/**
 * Reusable payment confirmation bottom sheet used across THE-HK services.
 * It mirrors the server-authoritative payment priority used in
 * `debitConsumerPayment` (functions/src/services/walletService.ts):
 * HK Coins -> Cashback -> NGN wallet.
 */
export function PaymentBottomSheet({
  visible,
  onClose,
  onConfirm,
  loading,
  title,
  summaryRows,
  totalAmount,
  hkcBalance,
  ngnBalance,
  cashbackBalance,
  cashbackEligible = true,
  confirmLabel = 'Confirm Payment',
}: PaymentBottomSheetProps) {
  const { colors } = useTheme();
  const [useCashback, setUseCashback] = useState(false);

  const { hkcUsed, cashbackUsed, ngnUsed, canAfford } = useMemo(() => {
    let remaining = totalAmount;

    let cbUsed = 0;
    if (useCashback) {
      cbUsed = Math.min(cashbackBalance, remaining);
      remaining -= cbUsed;
    }

    const hkcAvailableKobo = hkcBalance * KOBO_PER_HKC;
    const hkcKoboUsed = Math.min(hkcAvailableKobo, remaining);
    const hkcUsedWhole = hkcKoboUsed / KOBO_PER_HKC;
    remaining -= hkcKoboUsed;

    const ngnUsed = remaining;
    const canAfford = ngnUsed <= ngnBalance;

    return { hkcUsed: hkcUsedWhole, cashbackUsed: cbUsed, ngnUsed, canAfford };
  }, [useCashback, totalAmount, hkcBalance, ngnBalance, cashbackBalance]);

  return (
    <GlassBottomSheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.primaryText }]}>{title}</Text>

        {summaryRows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>{row.label}</Text>
            <Text style={[styles.rowValue, { color: colors.primaryText }]}>{row.value}</Text>
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>Payment Resources</Text>
        <View style={[styles.resourceCard, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
          <ResourceRow label="HK Coins" value={formatHkc(hkcBalance)} />
          <ResourceRow label="NGN Wallet" value={formatCurrency(ngnBalance)} />
          <ResourceRow label="Cashback Balance" value={formatCurrency(cashbackBalance)} />
        </View>

        {cashbackEligible && cashbackBalance > 0 && (
          <View style={[styles.toggleRow, { borderColor: colors.glassBorder }]}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.primaryText }]}>Use Cashback</Text>
              <Text style={[styles.toggleHint, { color: colors.secondaryText }]}>Applied after HK Coins, before NGN wallet</Text>
            </View>
            <Switch
              value={useCashback}
              onValueChange={setUseCashback}
              trackColor={{ false: colors.glassBorder, true: colors.primary }}
              thumbColor={colors.inverseText}
            />
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>HK Coins Used</Text>
          <Text style={[styles.rowValue, { color: colors.primaryText }]}>{formatHkc(hkcUsed)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>Cashback Used</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>{formatCurrency(cashbackUsed)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>NGN Wallet Used</Text>
          <Text style={[styles.rowValue, { color: colors.primaryText }]}>{formatCurrency(ngnUsed)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.totalLabel, { color: colors.primaryText }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(totalAmount)}</Text>
        </View>

        {!canAfford && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            Insufficient balance. Fund your HKC/NGN wallet to continue.
          </Text>
        )}

        <GlassButton
          title={confirmLabel}
          onPress={() => onConfirm({ useCashback })}
          loading={loading}
          disabled={!canAfford}
          style={styles.confirmButton}
        />
      </ScrollView>
    </GlassBottomSheet>
  );
}

function ResourceRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.resourceRow}>
      <Text style={[styles.resourceLabel, { color: colors.secondaryText }]}>{label}</Text>
      <Text style={[styles.resourceValue, { color: colors.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold as any, marginBottom: spacing.lg, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontSize: typography.sizes.sm },
  rowValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium as any },
  divider: { height: 1, marginVertical: spacing.md },
  sectionLabel: { fontSize: typography.sizes.xs, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  resourceCard: { borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  resourceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  resourceLabel: { fontSize: typography.sizes.sm },
  resourceValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold as any },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  toggleLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
  toggleHint: { fontSize: typography.sizes.xs, marginTop: 2 },
  totalLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any },
  totalValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any },
  errorText: { fontSize: typography.sizes.sm, marginBottom: spacing.md, textAlign: 'center' },
  confirmButton: { marginTop: spacing.md },
});
