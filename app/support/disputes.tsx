import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassInput, GlassSelect, GlassButton, Header, SkeletonList, ErrorState, EmptyState, StatusBadge } from '@components';
import { Dispute } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { formatDate } from '@lib/formatters';

const categories = [
  { label: 'Transaction Issue', value: 'transaction' },
  { label: 'Service Order Issue', value: 'order' },
  { label: 'Wallet / Funding', value: 'wallet' },
  { label: 'Referral / Rewards', value: 'rewards' },
  { label: 'Other', value: 'other' },
];

// Dispute Center (Phase 4 continuation) - real, Firestore-backed
// (functions/src/services/disputeService.ts). Unlike Support tickets/FAQ
// (still mock in this phase), disputes are genuinely submitted, stored,
// and readable back by the user, ready for the future Admin Platform to
// review and respond to.
export default function DisputesScreen() {
  const { colors } = useTheme();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Dispute | null>(null);

  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderReference, setOrderReference] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await repositories.support.getDisputes();
      setDisputes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (!category || !subject || !description) return;
    setSubmitting(true);
    try {
      await repositories.support.createDispute({
        category,
        subject,
        description,
        orderReference: orderReference || undefined,
      });
      setCategory('');
      setSubject('');
      setDescription('');
      setOrderReference('');
      setShowForm(false);
      await load();
      Alert.alert('Dispute Submitted', 'Our team will review your dispute and respond here.');
    } catch (err: any) {
      Alert.alert('Could not submit dispute', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Dispute Center" />
        <SkeletonList count={5} />
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Dispute Center" />

        <GlassButton
          title={showForm ? 'Cancel' : 'Open a Dispute'}
          onPress={() => setShowForm(!showForm)}
          variant={showForm ? 'secondary' : 'primary'}
          style={styles.openButton}
        />

        {showForm && (
          <GlassCard style={styles.form}>
            <GlassSelect
              label="Category"
              options={categories}
              value={category}
              onSelect={setCategory}
              placeholder="Select category"
              leftIcon="pricetag-outline"
            />
            <GlassInput
              label="Order / Transaction Reference (optional)"
              value={orderReference}
              onChangeText={setOrderReference}
              placeholder="e.g. HK-SMM-001"
              leftIcon="receipt-outline"
              containerStyle={styles.field}
            />
            <GlassInput
              label="Subject"
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief summary of the issue"
              leftIcon="create-outline"
              containerStyle={styles.field}
            />
            <GlassInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what happened in detail"
              multiline
              numberOfLines={4}
              containerStyle={styles.field}
            />
            <GlassButton
              title="Submit Dispute"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!category || !subject || !description}
              style={styles.button}
            />
          </GlassCard>
        )}

        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>My Disputes</Text>
        {disputes.length === 0 ? (
          <EmptyState icon="alert-circle-outline" title="No disputes yet" description="Disputes you open will appear here" />
        ) : (
          disputes.map((d) => {
            const isExpanded = selected?.id === d.id;
            return (
              <TouchableOpacity key={d.id} activeOpacity={0.8} onPress={() => setSelected(isExpanded ? null : d)}>
                <GlassCard style={styles.card} blur={false}>
                  <View style={styles.row}>
                    <View style={styles.content}>
                      <Text style={[styles.subject, { color: colors.primaryText }]} numberOfLines={1}>{d.subject}</Text>
                      <Text style={[styles.meta, { color: colors.secondaryText }]}>{d.category} • {formatDate(d.createdAt)}</Text>
                    </View>
                    <StatusBadge status={d.status} />
                  </View>
                  {isExpanded && (
                    <View style={styles.details}>
                      <Text style={[styles.description, { color: colors.secondaryText }]}>{d.description}</Text>
                      {d.orderReference ? (
                        <Text style={[styles.reference, { color: colors.mutedText }]}>Reference: {d.orderReference}</Text>
                      ) : null}
                      {d.adminResponse ? (
                        <View style={[styles.responseBox, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
                          <Text style={[styles.responseLabel, { color: colors.primary }]}>Support Response</Text>
                          <Text style={[styles.responseText, { color: colors.primaryText }]}>{d.adminResponse}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.pendingText, { color: colors.mutedText }]}>
                          <Ionicons name="time-outline" size={12} /> Awaiting a response from our team
                        </Text>
                      )}
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  openButton: { marginBottom: spacing.lg },
  form: { gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  field: { marginBottom: 0 },
  button: { marginTop: spacing.sm },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold as any, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { flex: 1, marginRight: spacing.md },
  subject: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  meta: { fontSize: typography.sizes.xs },
  details: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  description: { fontSize: typography.sizes.sm, marginBottom: spacing.sm, lineHeight: 20 },
  reference: { fontSize: typography.sizes.xs, marginBottom: spacing.sm },
  responseBox: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, marginTop: spacing.sm },
  responseLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold as any, marginBottom: spacing.xs },
  responseText: { fontSize: typography.sizes.sm },
  pendingText: { fontSize: typography.sizes.xs, marginTop: spacing.sm },
});
