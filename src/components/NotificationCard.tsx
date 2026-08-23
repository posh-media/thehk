import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';
import { Notification } from '@/types/domain';
import { relativeTime } from '@lib/formatters';
import { GlassCard } from './GlassCard';

interface NotificationCardProps {
  notification: Notification;
  onPress?: () => void;
}

const categoryIcons: Record<string, string> = {
  transaction: 'wallet-outline',
  system: 'information-circle-outline',
  promotion: 'gift-outline',
  security: 'shield-outline',
};

const categoryColors: Record<string, string> = {
  transaction: '#72C645',
  system: '#3B82F6',
  promotion: '#8B5CF6',
  security: '#EF4444',
};

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const { colors } = useTheme();
  const icon = categoryIcons[notification.category] || 'notifications-outline';
  const color = categoryColors[notification.category] || colors.primary;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <GlassCard style={styles.card} blur={false}>
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20`, borderColor: `${color}30` }]}>
            <Ionicons name={icon as any} size={20} color={color} />
          </View>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={1}>{notification.title}</Text>
              <Text style={[styles.time, { color: colors.mutedText }]}>{relativeTime(notification.createdAt)}</Text>
            </View>
            <Text style={[styles.body, { color: colors.secondaryText }]} numberOfLines={2}>{notification.body}</Text>
          </View>
          {!notification.isRead && <View style={[styles.unread, { backgroundColor: colors.primary }]} />}
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
    alignItems: 'flex-start',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: typography.sizes.xs,
  },
  body: {
    fontSize: typography.sizes.sm,
  },
  unread: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
    marginTop: spacing.sm,
  },
});
