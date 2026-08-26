import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { formatCurrency } from '@lib/formatters';
import { GlassBottomSheet } from './GlassBottomSheet';
import { GlassButton } from './GlassButton';

export interface PaymentSummaryRow {
  label: string;
  value: string;
}

export interface PaymentChoice {
  useCashback: boolean;
  usePoints: boolean;
}

interface PaymentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (choice: PaymentChoice) => void;
  loading?: boolean;
  title: string;
  summaryRows: PaymentSummaryRow[];
  totalAmount: number; // kobo
  walletBalance: number; // kobo
  pointsBalance: number; // whole HK Points, display only
  cashbackBalance: number; // kobo
  cashbackEligible?: boolean; // set false for services that don't support cashback yet
  allowPointsPayment?: boolean; // allow paying with HK Points when applicable
  pointsCost?: number; // whole HK Points required when allowPointsPayment is true
  confirmLabel?: string;
}

/**
 * Reusable payment confirmation bottom sheet, used across THE-HK services
 * so payment/cashback logic lives in one place rather than being
 * re-implemented per screen. Cashback is applied first (up to what's
 * available), and whatever remains is shown as the amount that will be
 * charged to the wallet - matching the server's own
 * `submitServiceOrder`/cashback-first priority
 * (functions/src/services/orderService.ts).
 *
 * Not every service opts into cashback yet - pass `cashbackEligible={false}`
 * to hide the toggle entirely for services that don't support it.
 *
 * `allowPointsPayment` adds an HK Points toggle. When selected, the wallet
 * charge is zero and the server debits the configured HK Points amount.
 */
export function PaymentBottomSheet({
  visible,
  onClose,
  onConfirm,
  loading,
  title,
  summaryRows,
  totalAmount,
  walletBalance,
  pointsBalance,
  cashbackBalance,
  cashbackEligible = true,
  allowPointsPayment = false,
  pointsCost = 0,
  confirmLabel = 'Confirm Payment',
}: PaymentBottomSheetProps) {
  const { colors } = useTheme();
  const [useCashback, setUseCashback] = useState(false);
  const [usePoints, setUsePoints] = useState(false);

  const canPayWithPoints = allowPointsPayment && pointsCost > 0 && pointsBalance >= pointsCost;

  const cashbackUsed = useMemo(
    () => (useCashback && !usePoints ? Math.min(cashbackBalance, totalAmount) : 0),
    [useCashback, usePoints, cashbackBalance, totalAmount]
  );
  const remaining = usePoints ? 0 : totalAmount - cashbackUsed;
  const canAfford = usePoints ? true : remaining <= walletBalance;

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
          <ResourceRow label="Wallet Balance" value={formatCurrency(walletBalance)} />
          <ResourceRow label="HK Points" value={`${pointsBalance.toLocaleString()} pts`} />
          <ResourceRow label="Cashback Balance" value={formatCurrency(cashbackBalance)} />
        </View>

        {canPayWithPoints && (
          <View style={[styles.toggleRow, { borderColor: colors.glassBorder }]}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.primaryText }]}>Pay with HK Points</Text>
              <Text style={[styles.toggleHint, { color: colors.secondaryText }]}>{pointsCost.toLocaleString()} pts</Text>
            </View>
            <Switch
              value={usePoints}
              onValueChange={(v) => {
                setUsePoints(v);
                if (v) setUseCashback(false);
              }}
              trackColor={{ false: colors.glassBorder, true: colors.primary }}
              thumbColor={colors.inverseText}
            />
          </View>
        )}

        {cashbackEligible && cashbackBalance > 0 && !usePoints && (
          <View style={[styles.toggleRow, { borderColor: colors.glassBorder }]}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.primaryText }]}>Use Cashback</Text>
              <Text style={[styles.toggleHint, { color: colors.secondaryText }]}>Applied first, before your wallet</Text>
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
          <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>Cashback Available</Text>
          <Text style={[styles.rowValue, { color: colors.primaryText }]}>{formatCurrency(cashbackBalance)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.secondaryText }]}>Cashback Used</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>{formatCurrency(cashbackUsed)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.totalLabel, { color: colors.primaryText }]}>{usePoints ? 'Paid with' : 'Amount to Pay'}</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>{usePoints ? `${pointsCost.toLocaleString()} pts` : formatCurrency(remaining)}</Text>
        </View>

        {!canAfford && (
          <Text style={[styles.errorText, { color: colors.error }]}>Insufficient balance for the remaining amount</Text>
        )}

        <GlassButton
          title={confirmLabel}
          onPress={() => onConfirm({ useCashback, usePoints })}
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
