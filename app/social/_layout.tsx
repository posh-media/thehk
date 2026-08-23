import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@theme/useTheme';

export default function SocialLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
