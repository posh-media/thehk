import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { useAuthStore } from '@stores/authStore';
import { spacing, typography } from '@theme/tokens';

export default function SplashScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isAuthenticated, isLoading, authError, clearAuthError } = useAuthStore();

  useEffect(() => {
    if (isLoading || authError) return;
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isLoading, isAuthenticated, authError, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.logoContainer, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.brand, { color: colors.primaryText }]}>THE-HK</Text>
      <Text style={[styles.tagline, { color: colors.secondaryText }]}>PREMIUM FINTECH SOLUTIONS</Text>

      {authError ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={clearAuthError}
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.continueButtonText, { color: colors.inverseText }]}>Continue to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  brand: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.sizes.sm,
    letterSpacing: 1,
  },
  loader: {
    marginTop: spacing.xxxl,
  },
  errorContainer: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  continueButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
  },
  continueButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
});
