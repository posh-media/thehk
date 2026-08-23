import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';
import { GlassCard, GlassButton, GlassInput, GlassSelect, SectionHeader } from '@components';
import { repositories } from '@repositories/mockRepository';
import { useAuthStore } from '@stores/authStore';

const categories = [
  { label: 'Streaming', value: 'Streaming' },
  { label: 'Gaming', value: 'Gaming' },
  { label: 'Tech Tools', value: 'Tech Tools' },
  { label: 'Virtual Numbers', value: 'Virtual Numbers' },
  { label: 'Gift Cards', value: 'Gift Cards' },
];

const types = [
  { label: 'Account', value: 'Account' },
  { label: 'Slot', value: 'Slot' },
  { label: 'Code', value: 'Code' },
  { label: 'Subscription', value: 'Subscription' },
];

const accountLevels = [
  { label: 'Basic', value: 'Basic' },
  { label: 'Premium', value: 'Premium' },
  { label: 'Pro', value: 'Pro' },
  { label: 'N/A', value: 'N/A' },
];

export default function UploadProductScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [type, setType] = useState('');
  const [yearCreated, setYearCreated] = useState('');
  const [warranty, setWarranty] = useState('');
  const [accountLevel, setAccountLevel] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = name && category && description && price && stock && type;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await repositories.marketplace.createListing({
        sellerId: user?.id || '',
        productId: `prod-${Date.now()}`,
        product: {
          id: `prod-${Date.now()}`,
          name,
          category,
          description,
          images: ['https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=400&fit=crop'],
          type,
          yearCreated,
          warranty,
          accountLevel,
          shortDescription,
        },
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        status: 'pending_review',
      });
      router.push('/seller/review');
    } catch (err: any) {
      setError(err.message || 'Failed to submit product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.primaryText }]}>Upload Product</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          Fill in the details below. Your listing will be reviewed before it goes live.
        </Text>

        <TouchableOpacity activeOpacity={0.8} style={[styles.imageUpload, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.imageUploadIcon, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.imageUploadText, { color: colors.primaryText }]}>Upload Product Image</Text>
          <Text style={[styles.imageUploadHint, { color: colors.mutedText }]}>PNG or JPG, up to 5MB</Text>
        </TouchableOpacity>

        <SectionHeader title="Product Details" />
        <GlassCard style={styles.formCard} blur={false}>
          <GlassInput label="Product Name" placeholder="e.g. Netflix Premium 4K" value={name} onChangeText={setName} containerStyle={styles.field} />
          <GlassSelect label="Category" options={categories} value={category} onSelect={setCategory} placeholder="Select category" />
          <View style={styles.field} />
          <GlassSelect label="Product Type" options={types} value={type} onSelect={setType} placeholder="Select type" />
          <View style={styles.field} />
          <GlassInput
            label="Description"
            placeholder="Describe the product in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            containerStyle={styles.field}
            style={styles.textArea}
          />
          <GlassInput
            label="Short Description"
            placeholder="A one-line summary"
            value={shortDescription}
            onChangeText={setShortDescription}
            containerStyle={styles.field}
          />
        </GlassCard>

        <SectionHeader title="Pricing & Stock" />
        <GlassCard style={styles.formCard} blur={false}>
          <View style={styles.row}>
            <GlassInput
              label="Price (₦)"
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              containerStyle={styles.rowField}
            />
            <GlassInput
              label="Stock"
              placeholder="0"
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              containerStyle={styles.rowField}
            />
          </View>
        </GlassCard>

        <SectionHeader title="Additional Info" />
        <GlassCard style={styles.formCard} blur={false}>
          <View style={styles.row}>
            <GlassInput
              label="Year Created"
              placeholder="e.g. 2024"
              value={yearCreated}
              onChangeText={setYearCreated}
              containerStyle={styles.rowField}
            />
            <GlassInput
              label="Warranty"
              placeholder="e.g. 30 days"
              value={warranty}
              onChangeText={setWarranty}
              containerStyle={styles.rowField}
            />
          </View>
          <GlassSelect label="Account Level" options={accountLevels} value={accountLevel} onSelect={setAccountLevel} placeholder="Select level" />
        </GlassCard>

        {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

        <GlassButton title="Submit for Review" loading={submitting} onPress={handleSubmit} style={styles.submitButton} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing.lg,
  },
  imageUpload: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.xl,
  },
  imageUploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  imageUploadText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.xs,
  },
  imageUploadHint: {
    fontSize: typography.sizes.xs,
  },
  formCard: {
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rowField: {
    flex: 1,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
