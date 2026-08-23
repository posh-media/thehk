import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassCard, Header } from '@components';

const sections = [
  {
    title: '1. Introduction',
    body: 'THE-HK is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your personal information when you use our application and services.',
  },
  {
    title: '2. Information We Collect',
    body: 'We collect information you provide directly, such as your name, email, phone number, and payment details. We also collect device information, usage data, and transaction history to operate and improve our services.',
  },
  {
    title: '3. How We Use Information',
    body: 'Your information is used to process transactions, verify your identity, provide customer support, personalize your experience, detect fraud, and comply with legal obligations.',
  },
  {
    title: '4. Data Sharing',
    body: 'We do not sell your personal information. We may share data with trusted partners, payment processors, and regulatory authorities only when necessary to provide our services or comply with the law.',
  },
  {
    title: '5. Your Rights',
    body: 'You have the right to access, update, or delete your personal information. You can manage your preferences through the app settings or contact our support team for assistance.',
  },
  {
    title: '6. Security',
    body: 'We implement industry-standard security measures, including encryption and access controls, to protect your data. However, no method of transmission over the internet is completely secure.',
  },
  {
    title: '7. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or by email. Please review this policy periodically.',
  },
  {
    title: '8. Contact Us',
    body: 'If you have any questions or concerns about this Privacy Policy, please contact us at privacy@the-hk.com or through the Help Center.',
  },
];

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Privacy Policy" />

        {sections.map((section) => (
          <GlassCard key={section.title} style={styles.section} blur={false}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.secondaryText }]}>{section.body}</Text>
          </GlassCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
});
