import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography } from '@theme/tokens';
import { GlassInput, GlassButton, GlassCard } from '@components';
import { useAuthStore } from '@stores/authStore';
import { repositories } from '@repositories/mockRepository';

export default function SignupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signIn } = useAuthStore();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', referralCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secure, setSecure] = useState(true);

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await repositories.auth.signUp(form.email, form.password, form);
      if (form.referralCode.trim()) {
        try {
          await repositories.rewards.applyReferralCode(form.referralCode.trim());
        } catch (refErr) {
          // A bad/expired referral code should never block account creation -
          // the account is already created at this point.
          console.warn('Referral code could not be applied:', refErr);
        }
      }
      signIn(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primaryText }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Join THE-HK and start your financial journey</Text>
      </View>

      <GlassCard style={styles.form}>
        <View style={styles.row}>
          <GlassInput label="First Name" placeholder="John" value={form.firstName} onChangeText={(v: string) => update('firstName', v)} containerStyle={styles.half} />
          <GlassInput label="Last Name" placeholder="Doe" value={form.lastName} onChangeText={(v: string) => update('lastName', v)} containerStyle={styles.half} />
        </View>
        <View style={styles.gap} />
        <GlassInput label="Email Address" leftIcon="mail-outline" placeholder="john@example.com" value={form.email} onChangeText={(v: string) => update('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <View style={styles.gap} />
        <GlassInput label="Phone Number" leftIcon="call-outline" placeholder="+234 800 000 0000" value={form.phone} onChangeText={(v: string) => update('phone', v)} keyboardType="phone-pad" />
        <View style={styles.gap} />
        <GlassInput
          label="Referral Code (optional)"
          leftIcon="gift-outline"
          placeholder="e.g. AB12CD"
          value={form.referralCode}
          onChangeText={(v: string) => update('referralCode', v.toUpperCase())}
          autoCapitalize="characters"
        />
        <View style={styles.gap} />
        <GlassInput
          label="Password"
          leftIcon="lock-closed-outline"
          rightIcon={secure ? 'eye-off-outline' : 'eye-outline'}
          onRightIconPress={() => setSecure(!secure)}
          placeholder="Create a password"
          value={form.password}
          onChangeText={(v: string) => update('password', v)}
          secureTextEntry={secure}
        />
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <GlassButton title="Create Account" loading={loading} onPress={handleSignup} style={styles.button} />
      </GlassCard>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.secondaryText }]}>Already have an account?</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={[styles.footerAction, { color: colors.primary }]}> Sign In</Text>
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
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
  },
  form: {
    padding: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  gap: {
    height: spacing.lg,
  },
  error: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  button: {
    marginTop: spacing.xl,
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
