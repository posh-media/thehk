import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassInput, GlassButton, GlassCard } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState('alex.raymond@fintech.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secure, setSecure] = useState(true);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await repositories.auth.signIn(email, password);
      signIn(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.primary }]}>THE-HK</Text>
        <Text style={[styles.title, { color: colors.primaryText }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Sign in to access your wallet and services</Text>
      </View>

      <GlassCard style={styles.form}>
        <GlassInput
          label="Email Address"
          leftIcon="mail-outline"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.inputGap} />
        <GlassInput
          label="Password"
          leftIcon="lock-closed-outline"
          rightIcon={secure ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setSecure(!secure)}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
        />
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
          <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
        </TouchableOpacity>

        <GlassButton title="Sign In" loading={loading} onPress={handleLogin} style={styles.button} />
      </GlassCard>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.secondaryText }]}>Don&apos;t have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={[styles.footerAction, { color: colors.primary }]}> Create Account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
  },
  form: {
    padding: spacing.xl,
  },
  inputGap: {
    height: spacing.lg,
  },
  error: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginVertical: spacing.md,
  },
  forgotText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
  button: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.sizes.base,
  },
  footerAction: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
});
