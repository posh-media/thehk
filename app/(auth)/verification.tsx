import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassButton, GlassCard } from '@components';
import { repositories } from '@repositories/mockRepository';

export default function VerificationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCheck = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const verified = await repositories.auth.verifyEmail();
      if (verified) {
        router.replace('/(tabs)');
      } else {
        setMessage('Email not verified yet. Please check your inbox and click the link.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);
    try {
      await repositories.auth.resendVerification();
      setMessage('Verification email resent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Could not resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primaryText }]}>Verify Email</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        A verification link was sent to your email. Tap the link, then press "I have verified" below.
      </Text>

      <GlassCard style={styles.form}>
        {message ? <Text style={[styles.message, { color: colors.success }]}>{message}</Text> : null}
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <GlassButton title="I have verified" loading={loading} onPress={handleCheck} style={styles.button} />
        <GlassButton title="Resend verification email" loading={resending} onPress={handleResend} variant="ghost" style={styles.button} />
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
  message: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  error: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
  },
});
