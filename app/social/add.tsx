import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassInput, GlassSelect, GlassButton, Header, LoadingState } from '@components';
import { SocialProfile } from '@/types/domain';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';

const platformOptions = [
  { label: 'WhatsApp', value: 'WhatsApp' },
  { label: 'Instagram', value: 'Instagram' },
  { label: 'TikTok', value: 'TikTok' },
  { label: 'Facebook', value: 'Facebook' },
  { label: 'X / Twitter', value: 'X' },
  { label: 'YouTube', value: 'YouTube' },
  { label: 'Snapchat', value: 'Snapchat' },
  { label: 'Telegram', value: 'Telegram' },
  { label: 'LinkedIn', value: 'LinkedIn' },
];

function getUsernameLabel(platform: string): string {
  if (platform === 'WhatsApp') return 'Phone Number';
  if (platform === 'YouTube') return 'Channel Name';
  return 'Username / Handle';
}

export default function AddSocialProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [platform, setPlatform] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      const profiles = await repositories.socialProfile.getProfiles(user?.id || '');
      const profile = profiles.find((p) => p.id === id);
      if (profile) {
        setPlatform(profile.platform);
        setDisplayName(profile.displayName);
        setUsername(profile.username);
        setNotes(profile.notes || '');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load profile');
    } finally {
      setInitialLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!platform) next.platform = 'Select a platform';
    if (!displayName.trim()) next.displayName = 'Display name is required';
    if (!username.trim()) next.username = `${getUsernameLabel(platform)} is required`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const payload: Omit<SocialProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
        userId: user?.id || '',
        platform,
        displayName: displayName.trim(),
        username: username.trim(),
        notes: notes.trim() || undefined,
      };
      if (id) payload.id = id;
      await repositories.socialProfile.saveProfile(payload);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Account', 'Are you sure you want to remove this social account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await repositories.socialProfile.deleteProfile(id);
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete account');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (initialLoading) return <LoadingState />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <Header title={isEditing ? 'Edit Social Account' : 'Add Social Account'} />

        <View style={styles.avatarContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.avatar, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}
          >
            <Ionicons name="camera" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.secondaryText }]}>Profile image</Text>
        </View>

        <GlassCard style={styles.formCard} blur={false}>
          <GlassSelect
            label="Platform"
            placeholder="Select platform"
            options={platformOptions}
            value={platform}
            onSelect={setPlatform}
            leftIcon="phone-portrait"
            error={errors.platform}
          />
          <View style={styles.spacer} />
          <GlassInput
            label="Display Name"
            placeholder="e.g. John Doe"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="person-outline"
            error={errors.displayName}
          />
          <View style={styles.spacer} />
          <GlassInput
            label={getUsernameLabel(platform)}
            placeholder={platform === 'WhatsApp' ? '+234 812 345 6789' : '@username'}
            value={username}
            onChangeText={setUsername}
            leftIcon={platform === 'WhatsApp' ? 'call-outline' : 'at-outline'}
            error={errors.username}
          />
          <View style={styles.spacer} />
          <GlassInput
            label="Notes (optional)"
            placeholder="Personal, business, content account..."
            value={notes}
            onChangeText={setNotes}
            leftIcon="document-text-outline"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.notesInput}
          />
        </GlassCard>

        <GlassButton
          title={isEditing ? 'Save Changes' : 'Save Account'}
          loading={loading}
          onPress={handleSave}
          style={styles.saveButton}
        />

        {isEditing && (
          <GlassButton
            title="Delete Account"
            variant="danger"
            loading={loading}
            onPress={handleDelete}
            style={styles.deleteButton}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarHint: {
    fontSize: typography.sizes.sm,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  spacer: {
    height: spacing.md,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  deleteButton: {
    marginBottom: spacing.xl,
  },
});
