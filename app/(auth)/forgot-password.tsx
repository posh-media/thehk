import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassInput, GlassButton, GlassCard } from '@components';
import { repositories } from '@repositories/mockRepository';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await repositories.auth.resetPassword(email);
    setSent(true);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primaryText }]}>Forgot Password?</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Enter your email and we&apos;ll send you a verification code to reset your password.
      </Text>

      <GlassCard style={styles.form}>
        {sent ? (
          <>
            <Text style={[styles.success, { color: colors.success }]}>Reset instructions sent to {email}</Text>
            <GlassButton title="Continue" onPress={() => router.push('/(auth)/reset-password')} style={styles.button} />
          </>
        ) : (
          <>
            <GlassInput label="Email Address" leftIcon="mail-outline" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <GlassButton title="Send Reset Code" loading={loading} onPress={handleSubmit} style={styles.button} />
          </>
        )}
      </GlassCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing.xl,
  },
  form: {
    padding: spacing.xl,
  },
  success: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.xl,
  },
});
