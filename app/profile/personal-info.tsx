import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassInput, GlassSelect, GlassButton, Header } from '@components';
import { useAuthStore } from '@stores/authStore';
import { showToast } from '@lib/toast';
import { storage } from '@infrastructure/firebase';
import { repositories } from '@repositories/mockRepository';
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

function VerificationRow({ label, verified, onVerify }: { label: string; verified: boolean; onVerify: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.verificationRow}>
      <View style={styles.verificationInfo}>
        <Ionicons name={verified ? 'checkmark-circle' : 'alert-circle-outline'} size={20} color={verified ? colors.success : colors.mutedText} />
        <Text style={[styles.verificationLabel, { color: colors.primaryText }]}>{label}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.8} onPress={verified ? undefined : onVerify} disabled={verified}>
        <Text style={[styles.verificationAction, { color: verified ? colors.success : colors.primary }]}>
          {verified ? 'Verified' : `Verify ${label}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function parseDate(value: string): Date {
  const d = value ? new Date(value) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(parseDate(dateOfBirth));

  async function handlePickImage() {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `users/${user.id}/profile/avatar`);
      await uploadBytes(storageRef, blob);
      const photoUrl = await getDownloadURL(storageRef);

      const updated = await repositories.auth.updateProfile(user.id, { photoUrl });
      setUser(updated);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Could not upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function onDateChange(_event: any, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      setPickerDate(selected);
      if (Platform.OS === 'android') {
        setDateOfBirth(formatDate(selected));
      }
    }
  }

  function confirmDate() {
    setDateOfBirth(formatDate(pickerDate));
    setShowDatePicker(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await repositories.auth.updateProfile(user.id, {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim() || user.displayName,
        email,
        phone: formatPhoneNumber(phone),
        username,
        country,
        dateOfBirth,
      });
      setUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title="Personal Information" />

        <View style={styles.avatarContainer}>
          <TouchableOpacity activeOpacity={0.9} onPress={handlePickImage} disabled={uploading}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.glassSurface, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={40} color={colors.primary} />
              </View>
            )}
            <View style={[styles.camera, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.inverseText} />
              ) : (
                <Ionicons name="camera" size={18} color={colors.inverseText} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.name, { color: colors.primaryText }]}>{user?.displayName || 'User'}</Text>
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

          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowDatePicker(true)}>
            <View pointerEvents="none">
              <GlassInput
                label="Date of Birth"
                value={dateOfBirth ? formatDate(dateOfBirth) : ''}
                placeholder="YYYY-MM-DD"
                leftIcon="calendar-outline"
                editable={false}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.verificationSection}>
            <VerificationRow
              label="Email"
              verified={!!user?.emailVerified}
              onVerify={async () => {
                if (user?.emailVerified) return;
                try {
                  await repositories.auth.resendVerification();
                  showToast('Verification email sent');
                } catch (err: any) {
                  Alert.alert('Email verification', err.message || 'Could not send verification email.');
                  return;
                }
                // Attempt to sync the verified state (no-op if not verified yet).
                try {
                  const updated = await repositories.auth.verifyEmail();
                  setUser(updated);
                  showToast('Email verified');
                } catch {
                  // Not verified yet; user must click the email link first.
                }
              }}
            />
            <VerificationRow
              label="Phone"
              verified={!!user?.phoneVerified}
              onVerify={() => showToast('Phone verification coming soon')}
            />
          </View>

          {success && (
            <View style={[styles.success, { backgroundColor: colors.successSurface }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>Changes saved successfully</Text>
            </View>
          )}

          <GlassButton title="Save Changes" onPress={handleSave} loading={saving} />
        </GlassCard>
      </View>

      {showDatePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Select Date of Birth</Text>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
                onChange={onDateChange}
                maximumDate={new Date()}
                themeVariant={colors.background === '#FFFFFF' ? 'light' : 'dark'}
              />
              <GlassButton title="Confirm" onPress={confirmDate} style={styles.modalButton} />
            </View>
          </View>
        </Modal>
      )}
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
  sectionLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  preferenceLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  verificationSection: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verificationLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium as any,
  },
  verificationAction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
  },
  modalButton: {
    marginTop: spacing.md,
    width: '100%',
  },
});
