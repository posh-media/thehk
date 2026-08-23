import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { Header, NotificationCard, SkeletonList, ErrorState } from '@components';
import { Notification } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Transactions', value: 'transaction' },
  { label: 'System', value: 'system' },
  { label: 'Promotions', value: 'promotion' },
];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('all');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.notification.getNotifications(user?.id || '');
        setNotifications(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retry, user?.id]);

  const filtered = notifications.filter((n) => (filter === 'all' ? true : n.category === filter));

  async function handleMarkAllRead() {
    setMarking(true);
    try {
      await repositories.notification.markAllAsRead(user?.id || '');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read');
    } finally {
      setMarking(false);
    }
  }

  async function handlePress(id: string) {
    try {
      await repositories.notification.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Notifications" />
        <SkeletonList count={5} style={{ padding: spacing.lg }} />
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => { setRetry((r) => r + 1); setLoading(true); setError(''); }} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header
          title="Notifications"
          rightAction={
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={marking}
              onPress={handleMarkAllRead}
              style={[styles.markAll, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="checkmark-done-outline" size={22} color={marking ? colors.mutedText : colors.primary} />
            </TouchableOpacity>
          }
        />

        <View style={styles.chips}>
          {filters.map((f) => {
            const active = filter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                activeOpacity={0.8}
                onPress={() => setFilter(f.value)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.surface },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? colors.inverseText : colors.primaryText }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: colors.secondaryText }]}>No notifications in this category.</Text>
        ) : (
          filtered.map((n) => <NotificationCard key={n.id} notification={n} onPress={() => handlePress(n.id)} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  markAll: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  empty: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
