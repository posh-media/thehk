import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';

export type StatusType =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'reversed'
  | 'refunded'
  | 'completed'
  | 'active'
  | 'sold_out'
  | 'rejected'
  | 'draft'
  | 'in_progress'
  | 'open'
  | 'resolved'
  | 'closed'
  | 'delivered'
  | 'under_review';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { colors } = useTheme();

  const statusMap: Record<string, { color: string; bg: string; text: string }> = {
    pending: { color: colors.warning, bg: colors.warningSurface, text: 'Pending' },
    processing: { color: colors.info, bg: colors.infoSurface, text: 'Processing' },
    successful: { color: colors.success, bg: colors.successSurface, text: 'Successful' },
    completed: { color: colors.success, bg: colors.successSurface, text: 'Completed' },
    failed: { color: colors.error, bg: colors.errorSurface, text: 'Failed' },
    cancelled: { color: colors.error, bg: colors.errorSurface, text: 'Cancelled' },
    reversed: { color: colors.warning, bg: colors.warningSurface, text: 'Reversed' },
    refunded: { color: colors.error, bg: colors.errorSurface, text: 'Refunded' },
    active: { color: colors.success, bg: colors.successSurface, text: 'Active' },
    sold_out: { color: colors.mutedText, bg: colors.surface, text: 'Sold Out' },
    rejected: { color: colors.error, bg: colors.errorSurface, text: 'Rejected' },
    draft: { color: colors.secondaryText, bg: colors.surface, text: 'Draft' },
    in_progress: { color: colors.info, bg: colors.infoSurface, text: 'In Progress' },
    open: { color: colors.info, bg: colors.infoSurface, text: 'Open' },
    resolved: { color: colors.success, bg: colors.successSurface, text: 'Resolved' },
    closed: { color: colors.mutedText, bg: colors.surface, text: 'Closed' },
    delivered: { color: colors.success, bg: colors.successSurface, text: 'Delivered' },
    under_review: { color: colors.warning, bg: colors.warningSurface, text: 'Under Review' },
  };

  const mapped = statusMap[status] || { color: colors.secondaryText, bg: colors.surface, text: status };

  return (
    <View style={[styles.badge, { backgroundColor: mapped.bg }]}>
      <Text style={[styles.text, { color: mapped.color }]}>{label || mapped.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
    textTransform: 'capitalize',
  },
});
