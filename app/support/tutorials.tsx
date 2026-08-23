import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, LoadingState, ErrorState, EmptyState } from '@components';
import { AdminPlatformConfig } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';

type Tab = 'tutorials' | 'tips';

function youtubeThumbnail(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : undefined;
}

// Tutorials & Tips (Phase 4 continuation). Content is loaded from the
// `adminPanel/platform` Firestore document rather than hardcoded, so the
// future Admin Platform can manage it directly - see
// functions/src/services/adminPanelService.ts.
export default function TutorialsScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('tutorials');
  const [config, setConfig] = useState<AdminPlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await repositories.admin.getPlatformConfig();
        setConfig(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tutorials');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retry]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => { setRetry((r) => r + 1); setLoading(true); setError(''); }} />;

  const tutorials = config?.tutorials || [];
  const tips = config?.tips || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Tutorials" />

        <View style={styles.tabs}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setTab('tutorials')} style={[styles.tab, { backgroundColor: tab === 'tutorials' ? colors.primary : colors.surface }]}>
            <Text style={[styles.tabText, { color: tab === 'tutorials' ? colors.inverseText : colors.primaryText }]}>Tutorials</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setTab('tips')} style={[styles.tab, { backgroundColor: tab === 'tips' ? colors.primary : colors.surface }]}>
            <Text style={[styles.tabText, { color: tab === 'tips' ? colors.inverseText : colors.primaryText }]}>Tips</Text>
          </TouchableOpacity>
        </View>

        {tab === 'tutorials' && (
          tutorials.length === 0 ? (
            <EmptyState icon="play-circle-outline" title="No tutorials yet" description="Check back soon for guides on using THE-HK" />
          ) : (
            tutorials.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => item.videoUrl && Linking.openURL(item.videoUrl)}
              >
                <GlassCard style={styles.card} blur={false}>
                  <Image
                    source={{ uri: item.thumbnailUrl || youtubeThumbnail(item.videoUrl) || 'https://images.unsplash.com/photo-1611162616805-6a1a8a5c1a1b?w=400&h=225&fit=crop' }}
                    style={styles.thumbnail}
                  />
                  {item.category === 'youtube' && (
                    <View style={styles.playOverlay}>
                      <Ionicons name="play-circle" size={48} color="#fff" />
                    </View>
                  )}
                  <View style={styles.content}>
                    <View style={[styles.badge, { backgroundColor: `${colors.error}20` }]}>
                      <Ionicons name={item.category === 'youtube' ? 'logo-youtube' : 'book-outline'} size={14} color={colors.error} />
                      <Text style={[styles.badgeText, { color: colors.error }]}>{item.category}</Text>
                    </View>
                    <Text style={[styles.title, { color: colors.primaryText }]}>{item.title}</Text>
                    <Text style={[styles.description, { color: colors.secondaryText }]} numberOfLines={2}>{item.description}</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))
          )
        )}

        {tab === 'tips' && (
          tips.length === 0 ? (
            <EmptyState icon="bulb-outline" title="No tips yet" description="Check back soon for helpful tips" />
          ) : (
            tips.map((tip, index) => (
              <GlassCard key={index} style={styles.tipCard} blur={false}>
                <View style={styles.tipRow}>
                  <Ionicons name="bulb-outline" size={20} color={colors.warning} style={styles.tipIcon} />
                  <Text style={[styles.tipText, { color: colors.primaryText }]}>{tip}</Text>
                </View>
              </GlassCard>
            ))
          )
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  tabs: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.full },
  tabText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any },
  card: { marginBottom: spacing.md, padding: 0, overflow: 'hidden' },
  thumbnail: { width: '100%', height: 160 },
  playOverlay: { position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center' },
  content: { padding: spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold as any, textTransform: 'capitalize' },
  title: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold as any, marginBottom: spacing.xs },
  description: { fontSize: typography.sizes.sm },
  tipCard: { marginBottom: spacing.md },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start' },
  tipIcon: { marginRight: spacing.md, marginTop: 2 },
  tipText: { fontSize: typography.sizes.base, flex: 1, lineHeight: 20 },
});
