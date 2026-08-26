import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/ThemeProvider';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, Header, GlassButton } from '@components';
import { useAuthStore } from '@stores/authStore';

const themeOptions: { label: string; value: 'dark' | 'light' | 'system'; icon: string }[] = [
  { label: 'Dark', value: 'dark', icon: 'moon-outline' },
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'System', value: 'system', icon: 'desktop-outline' },
];

export default function SettingsScreen() {
  const { colors, mode, resolvedMode, setMode } = useTheme();
  const router = useRouter();
  const { signOut } = useAuthStore();

  const [toggles, setToggles] = useState({
    pushNotifications: true,
    emailNotifications: false,
    twoFactor: false,
    biometric: false,
    hideBalance: false,
  });

  const toggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Settings" />

        <GlassCard style={styles.sheet} blur={false}>
          <Section title="Account" icon="person-outline">
            <Row label="Personal Information" icon="person-outline" onPress={() => router.push('/profile/personal-info' as any)} />
            <Row label="KYC & Verification" icon="shield-checkmark-outline" onPress={() => {}} />
          </Section>

          <Section title="Security" icon="lock-closed-outline">
            <Row label="Change PIN" icon="keypad-outline" onPress={() => {}} />
            <Row label="Two-Factor Authentication" icon="shield-outline" toggle isOn={toggles.twoFactor} onToggle={() => toggle('twoFactor')} />
            <Row label="Biometric Login" icon="finger-print-outline" toggle isOn={toggles.biometric} onToggle={() => toggle('biometric')} />
          </Section>

          <Section title="Notifications" icon="notifications-outline">
            <Row label="Push Notifications" icon="phone-portrait-outline" toggle isOn={toggles.pushNotifications} onToggle={() => toggle('pushNotifications')} />
            <Row label="Email Notifications" icon="mail-outline" toggle isOn={toggles.emailNotifications} onToggle={() => toggle('emailNotifications')} />
          </Section>

          <Section title="Appearance" icon="color-palette-outline" noCard>
            <View style={styles.themeRow}>
              {themeOptions.map((option) => {
                const active = mode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.8}
                    onPress={() => setMode(option.value)}
                    style={[
                      styles.themeButton,
                      { backgroundColor: active ? colors.primary : colors.surface },
                    ]}
                  >
                    <Ionicons name={option.icon as any} size={18} color={active ? colors.inverseText : colors.primaryText} />
                    <Text style={[styles.themeLabel, { color: active ? colors.inverseText : colors.primaryText }]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          <Section title="Privacy" icon="shield-outline">
            <Row label="Privacy Policy" icon="document-text-outline" onPress={() => router.push('/privacy' as any)} />
            <Row label="Terms of Service" icon="document-text-outline" onPress={() => router.push('/terms' as any)} />
            <Row label="Manage Consents" icon="toggle-outline" onPress={() => {}} />
          </Section>

          <Section title="Platform" icon="cube-outline">
            <Row label="Currency" icon="cash-outline" value="NGN" onPress={() => {}} />
            <Row label="Language" icon="language-outline" value="English" onPress={() => {}} />
          </Section>

          <Section title="App Information" icon="information-circle-outline">
            <Row label="Version" icon="apps-outline" value="1.0.0" />
            <Row label="Build" icon="hammer-outline" value="1000" />
            <Row label="Help Center" icon="headset-outline" onPress={() => router.push('/support' as any)} />
          </Section>

          <GlassButton title="Logout" variant="danger" onPress={signOut} style={styles.logout} />
        </GlassCard>
      </View>
    </ScrollView>
  );
}

function Section({ title, icon, children, noCard }: { title: string; icon: string; children: React.ReactNode; noCard?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>{title}</Text>
      </View>
      {noCard ? (
        <View style={styles.sectionCardContent}>{children}</View>
      ) : (
        <GlassCard style={styles.sectionCard} blur={false}>
          {children}
        </GlassCard>
      )}
    </View>
  );
}

function Row({
  label,
  icon,
  value,
  onPress,
  toggle,
  isOn,
  onToggle,
}: {
  label: string;
  icon: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  isOn?: boolean;
  onToggle?: () => void;
}) {
  const { colors } = useTheme();
  const hasAction = onPress || (toggle && onToggle);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!hasAction}
      onPress={onPress || onToggle}
      style={styles.row}
    >
      <Ionicons name={icon as any} size={18} color={colors.primary} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: colors.primaryText }]}>{label}</Text>
      {toggle ? (
        <CustomSwitch value={!!isOn} onValueChange={onToggle || (() => {})} />
      ) : value ? (
        <Text style={[styles.rowValue, { color: colors.secondaryText }]}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
      ) : null}
    </TouchableOpacity>
  );
}

function CustomSwitch({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onValueChange}
      style={[styles.track, { backgroundColor: value ? colors.primary : colors.border }]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.inverseText, marginLeft: value ? 18 : 2 }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sheet: {
    borderRadius: borderRadius.xxl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: spacing.lg,
  },
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  sectionCard: { padding: 0, overflow: 'hidden' },
  sectionCardContent: { paddingHorizontal: 0, paddingVertical: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  rowIcon: { marginRight: spacing.md },
  rowLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    marginRight: spacing.sm,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  themeLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    padding: 2,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  logout: { marginTop: spacing.xl },
});
