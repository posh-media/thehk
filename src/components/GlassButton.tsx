import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface GlassButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function GlassButton({
  title,
  variant = 'primary',
  loading = false,
  size = 'md',
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}: GlassButtonProps) {
  const { colors } = useTheme();

  const variantStyles = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderColor: colors.border },
    outline: { backgroundColor: 'transparent', borderColor: colors.border },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    danger: { backgroundColor: colors.errorSurface, borderColor: colors.error },
  };

  const textStyles = {
    primary: { color: colors.inverseText },
    secondary: { color: colors.primaryText },
    outline: { color: colors.primaryText },
    ghost: { color: colors.primary },
    danger: { color: colors.error },
  };

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  };

  const textSizes = {
    sm: { fontSize: typography.sizes.sm },
    md: { fontSize: typography.sizes.base },
    lg: { fontSize: typography.sizes.md },
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textStyles[variant].color} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.text, textStyles[variant], textSizes[size]]}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    fontWeight: typography.weights.semibold as any,
  },
});
