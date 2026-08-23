import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, StatusBadge, LoadingState, ErrorState } from '@components';
import { SupportTicket } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';
import { formatDate } from '@lib/formatters';

const priorityColors: Record<string, 'error' | 'warning' | 'info'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
};

export default function TicketsScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.support.getTickets(user?.id || '');
        setTickets(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retry, user?.id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => { setRetry((r) => r + 1); setLoading(true); setError(''); }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="My Tickets" />

        {tickets.length === 0 ? (
          <ErrorState title="No tickets yet" message="Your support requests will appear here." />
        ) : (
          tickets.map((ticket) => (
            <TouchableOpacity key={ticket.id} activeOpacity={0.8} onPress={() => setSelected(ticket)}>
              <GlassCard style={[styles.card, selected?.id === ticket.id && { borderColor: colors.primary }]} blur={false}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text style={[styles.subject, { color: colors.primaryText }]} numberOfLines={1}>
                      {ticket.subject}
                    </Text>
                    <Text style={[styles.meta, { color: colors.secondaryText }]}>
                      {ticket.category} • {formatDate(ticket.createdAt)}
                    </Text>
                  </View>
                  <StatusBadge status={ticket.status} />
                </View>
                <View style={styles.footer}>
                  <Text style={[styles.priority, { color: colors[priorityColors[ticket.priority] || 'info'] }]}>
                    Priority: {ticket.priority}
                  </Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))
        )}

        {selected && (
          <GlassCard style={styles.detail}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: colors.primaryText }]}>{selected.subject}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
            <View style={styles.detailRow}>
              <StatusBadge status={selected.status} />
              <Text style={[styles.detailPriority, { color: colors[priorityColors[selected.priority] || 'info'] }]}>
                {selected.priority} priority
              </Text>
            </View>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>Category</Text>
            <Text style={[styles.detailValue, { color: colors.primaryText }]}>{selected.category}</Text>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>Description</Text>
            <Text style={[styles.detailValue, { color: colors.primaryText }]}>{selected.description}</Text>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>Created</Text>
            <Text style={[styles.detailValue, { color: colors.primaryText }]}>{formatDate(selected.createdAt)}</Text>
            <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>Last Updated</Text>
            <Text style={[styles.detailValue, { color: colors.primaryText }]}>{formatDate(selected.updatedAt)}</Text>
          </GlassCard>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { marginBottom: spacing.md, padding: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: { flex: 1, marginRight: spacing.sm },
  subject: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  meta: { fontSize: typography.sizes.sm },
  footer: { marginTop: spacing.sm },
  priority: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  detail: { marginTop: spacing.lg, gap: spacing.sm },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginRight: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailPriority: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  detailLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  detailValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
});
