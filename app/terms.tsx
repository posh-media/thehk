import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, GlassButton } from '@components';

const sections = [
  {
    title: '1. Introduction',
    body: 'Welcome to THE-HK. These Terms of Service govern your use of our mobile application and services. By accessing or using THE-HK, you agree to be bound by these terms and our Privacy Policy.',
  },
  {
    title: '2. Use of Services',
    body: 'THE-HK provides digital payment, wallet, marketplace, and social media services. You must use the services in compliance with applicable laws and only for lawful purposes. We may suspend or terminate access for violations.',
  },
  {
    title: '3. Account Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when registering.',
  },
  {
    title: '4. Prohibited Activities',
    body: 'You may not use THE-HK to engage in fraud, money laundering, unauthorized access, harassment, or any activity that violates our policies or the rights of others. We reserve the right to investigate and report violations.',
  },
  {
    title: '5. Payments and Refunds',
    body: 'All transactions are processed in Nigerian Naira (NGN) unless otherwise stated. Fees may apply to certain services. Refunds are handled in accordance with our refund policy and may require supporting documentation.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'THE-HK is provided on an "as is" basis. To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the services.',
  },
  {
    title: '7. Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of the services after changes constitutes acceptance of the revised terms. Please review this page periodically.',
  },
  {
    title: '8. Contact Us',
    body: 'If you have any questions about these Terms, please contact our support team through the Help Center or email support@the-hk.com.',
  },
];

export default function TermsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Terms of Service" />

        {sections.map((section) => (
          <GlassCard key={section.title} style={styles.section} blur={false}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.secondaryText }]}>{section.body}</Text>
          </GlassCard>
        ))}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAgreed(!agreed)}
          style={styles.checkboxRow}
        >
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={24}
            color={agreed ? colors.primary : colors.mutedText}
          />
          <Text style={[styles.checkboxText, { color: colors.primaryText }]}>
            I have read and agree to the Terms of Service
          </Text>
        </TouchableOpacity>

        <GlassButton
          title="Accept & Continue"
          disabled={!agreed}
          onPress={() => router.back()}
          style={styles.button}
        />
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  checkboxText: {
    flex: 1,
    fontSize: typography.sizes.base,
  },
  button: { marginBottom: spacing.xl },
});
