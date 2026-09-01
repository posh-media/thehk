import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
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
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function GlassSelect({ label, options, value, placeholder = 'Select', onSelect, leftIcon, error, searchable, searchPlaceholder = 'Search...' }: GlassSelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

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

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => { setOpen(false); setQuery(''); }}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity style={styles.dismissArea} onPress={() => { setOpen(false); setQuery(''); }} />
          <GlassCard blur={false} elevated style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Select</Text>
            {searchable && (
              <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.mutedText} />
                <TextInput
                  style={[styles.searchInput, { color: colors.primaryText }]}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.mutedText}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                />
              </View>
            )}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                    setQuery('');
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: typography.sizes.base,
  },
});
