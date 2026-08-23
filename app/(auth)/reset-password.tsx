import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassInput, GlassButton, GlassCard } from '@components';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/(auth)/login');
    }, 800);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primaryText }]}>Reset Password</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Enter the code sent to your email and your new password.</Text>

      <GlassCard style={styles.form}>
        <GlassInput label="Verification Code" leftIcon="key-outline" placeholder="123456" value={code} onChangeText={setCode} keyboardType="number-pad" />
        <View style={styles.gap} />
        <GlassInput label="New Password" leftIcon="lock-closed-outline" placeholder="Enter new password" value={password} onChangeText={setPassword} secureTextEntry />
        <GlassButton title="Reset Password" loading={loading} onPress={handleReset} style={styles.button} />
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
  gap: {
    height: spacing.lg,
  },
  button: {
    marginTop: spacing.xl,
  },
});
