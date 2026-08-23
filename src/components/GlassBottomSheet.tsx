import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, DimensionValue } from 'react-native';
import { useTheme } from '@theme/useTheme';
import { spacing } from '@theme/tokens';
import { GlassCard } from './GlassCard';

interface GlassBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: DimensionValue;
}

export function GlassBottomSheet({ visible, onClose, children, height = 'auto' }: GlassBottomSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { height }]}>
              <GlassCard blur={false} elevated style={styles.content}>{children}</GlassCard>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  content: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: 24,
  },
});
