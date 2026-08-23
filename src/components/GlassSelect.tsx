import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { borderRadius, spacing, typography } from '@theme/tokens';
import { GlassCard } from './GlassCard';

interface Option {
  label: string;
  value: string;
}

interface GlassSelectProps {
  label?: string;
  options: Option[];
  value?: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  leftIcon?: string;
  error?: string;
}

export function GlassSelect({ label, options, value, placeholder = 'Select', onSelect, leftIcon, error }: GlassSelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {label && <Text style={[styles.label, { color: colors.secondaryText }]}>{label}</Text>}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border },
        ]}
      >
        {leftIcon && <Ionicons name={leftIcon as any} size={18} color={colors.primary} style={styles.leftIcon} />}
        <Text style={[styles.text, { color: selected ? colors.primaryText : colors.mutedText }]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
      </TouchableOpacity>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity style={styles.dismissArea} onPress={() => setOpen(false)} />
          <GlassCard blur={false} elevated style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Select</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: colors.primaryText }]}>{item.label}</Text>
                  {value === item.value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    marginBottom: spacing.sm,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: typography.sizes.base,
  },
  error: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  modalContent: {
    margin: spacing.lg,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  optionText: {
    fontSize: typography.sizes.base,
  },
});
