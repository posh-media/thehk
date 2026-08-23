import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassInput, GlassSelect, GlassButton, Header } from '@components';
import { useAuthStore } from '@stores/authStore';
import { formatPhoneNumber } from '@lib/formatters';

const countries = [
  'Nigeria',
  'Ghana',
  'Kenya',
  'South Africa',
  'United States',
  'United Kingdom',
  'Canada',
];

export default function PersonalInfoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [username, setUsername] = useState(user?.username || '');
  const [country, setCountry] = useState(user?.country || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setUser({
      ...user,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim() || user.displayName,
      email,
      phone: formatPhoneNumber(phone),
      username,
      country,
      dateOfBirth,
      updatedAt: new Date().toISOString(),
    });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Personal Information" />

        <View style={styles.avatarContainer}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.glassSurface }]}>
              <Ionicons name="person" size={40} color={colors.primary} />
            </View>
          )}
          <TouchableOpacity activeOpacity={0.8} style={[styles.camera, { backgroundColor: colors.primary, borderColor: colors.background }]}>
            <Ionicons name="camera" size={18} color={colors.inverseText} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.name, { color: colors.primaryText }]}>
          {user?.displayName || 'User'}
        </Text>
        <Text style={[styles.email, { color: colors.secondaryText }]}>{user?.email}</Text>

        <GlassCard style={styles.form}>
          <View style={styles.row}>
            <View style={styles.half}>
              <GlassInput label="First Name" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={styles.half}>
              <GlassInput label="Last Name" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <GlassInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" leftIcon="mail-outline" />
          <GlassInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" leftIcon="call-outline" />
          <GlassInput label="Username" value={username} onChangeText={setUsername} leftIcon="at-outline" />
          <GlassSelect
            label="Country"
            options={countries.map((c) => ({ label: c, value: c }))}
            value={country}
            onSelect={setCountry}
            placeholder="Select country"
            leftIcon="earth-outline"
          />
          <GlassInput label="Date of Birth" value={dateOfBirth} onChangeText={setDateOfBirth} leftIcon="calendar-outline" placeholder="YYYY-MM-DD" />

          {success && (
            <View style={[styles.success, { backgroundColor: colors.successSurface }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>Changes saved successfully</Text>
            </View>
          )}

          <GlassButton title="Save Changes" onPress={handleSave} loading={saving} />
        </GlassCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  camera: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    textAlign: 'center',
  },
  email: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  successText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
  },
});
