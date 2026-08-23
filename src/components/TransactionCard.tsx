import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';
import { Transaction } from '@/types/domain';
import { formatCurrency, relativeTime } from '@lib/formatters';
import { StatusBadge } from './StatusBadge';
import { GlassCard } from './GlassCard';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

const typeIcons: Record<string, string> = {
  wallet_funding: 'wallet-outline',
  withdrawal: 'arrow-down-outline',
  airtime: 'phone-portrait-outline',
  data: 'wifi-outline',
  bill_payment: 'receipt-outline',
  social_media_order: 'people-outline',
  gift_card_purchase: 'gift-outline',
  gift_card_sale: 'gift-outline',
  marketplace_purchase: 'cart-outline',
  marketplace_refund: 'return-down-back-outline',
  referral_reward: 'share-outline',
  points_conversion: 'sync-outline',
};

export function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const { colors } = useTheme();
  const isCredit = ['wallet_funding', 'referral_reward', 'marketplace_refund'].includes(transaction.type);
  const icon = typeIcons[transaction.type] || 'swap-horizontal-outline';

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <GlassCard style={styles.card} blur={false}>
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
            <Ionicons name={icon as any} size={20} color={colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={1}>
              {transaction.description}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{relativeTime(transaction.createdAt)}</Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={[styles.amount, { color: isCredit ? colors.success : colors.primaryText }]}>
              {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>
            <StatusBadge status={transaction.status} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
});
