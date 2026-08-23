import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, StatusBadge } from '@components';

const steps = [
  { key: 'submitted', label: 'Submitted', icon: 'cloud-upload-outline' },
  { key: 'under_review', label: 'Under Review', icon: 'time-outline' },
  { key: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
  { key: 'live', label: 'Live', icon: 'storefront-outline' },
];

const currentStepIndex = 1;

export default function ReviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: colors.warningSurface }]}>
          <Ionicons name="hourglass-outline" size={40} color={colors.warning} />
        </View>

        <Text style={[styles.title, { color: colors.primaryText }]}>Submission Under Review</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Your product has been submitted successfully. Our team will review it shortly and notify you once it's approved.
        </Text>

        <View style={styles.badgeWrap}>
          <StatusBadge status="under_review" />
        </View>

        <GlassCard style={styles.stepperCard} blur={false}>
          <Text style={[styles.stepperTitle, { color: colors.primaryText }]}>Review Progress</Text>
          {steps.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isLast = index === steps.length - 1;
            const color = isDone ? colors.success : isCurrent ? colors.warning : colors.mutedText;
            const bg = isDone ? colors.successSurface : isCurrent ? colors.warningSurface : colors.surface;

            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIndicatorColumn}>
                  <View style={[styles.stepDot, { backgroundColor: bg, borderColor: color }]}>
                    <Ionicons name={step.icon as any} size={16} color={color} />
                  </View>
                  {!isLast && (
                    <View style={[styles.stepLine, { backgroundColor: isDone ? colors.success : colors.divider }]} />
                  )}
                </View>
                <View style={styles.stepTextColumn}>
                  <Text style={[styles.stepLabel, { color: isCurrent || isDone ? colors.primaryText : colors.mutedText }]}>
                    {step.label}
                  </Text>
                  {isCurrent && (
                    <Text style={[styles.stepHint, { color: colors.secondaryText }]}>
                      Typically takes 1-2 business days
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </GlassCard>

        <GlassCard style={styles.summaryCard} blur={false}>
          <Text style={[styles.summaryTitle, { color: colors.primaryText }]}>What happens next?</Text>
          <SummaryItem colors={colors} text="Our team verifies your product details and credentials." />
          <SummaryItem colors={colors} text="You'll receive a notification once it's approved or rejected." />
          <SummaryItem colors={colors} text="Approved listings go live on the marketplace immediately." last />
        </GlassCard>

        <View style={styles.actions}>
          <GlassButton title="View My Listings" variant="secondary" style={styles.actionButton} onPress={() => router.push('/seller/listings')} />
          <GlassButton title="Submit Another Product" style={styles.actionButton} onPress={() => router.push('/seller/upload')} />
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryItem({ colors, text, last }: { colors: any; text: string; last?: boolean }) {
  return (
    <View style={[styles.summaryItem, !last && { marginBottom: spacing.md }]}>
      <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.summaryDot} />
      <Text style={[styles.summaryText, { color: colors.secondaryText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: 'center' },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  badgeWrap: {
    marginBottom: spacing.xl,
  },
  stepperCard: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  stepperTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepIndicatorColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: spacing.xs,
  },
  stepTextColumn: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  stepLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginTop: spacing.xs,
  },
  stepHint: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  summaryCard: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  summaryTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  summaryDot: {
    marginTop: 6,
  },
  summaryText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
