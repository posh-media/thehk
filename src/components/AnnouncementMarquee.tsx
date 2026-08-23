import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/useTheme';
import { spacing, typography, borderRadius } from '@theme/tokens';

interface AnnouncementMarqueeProps {
  announcements: string[];
}

/**
 * Continuously-scrolling announcement banner for the homepage. Content
 * comes from `adminPanel.announcements` (see
 * functions/src/services/adminPanelService.ts) rather than being
 * hardcoded, so the future Admin Platform can update it without an app
 * release.
 */
export function AnnouncementMarquee({ announcements }: AnnouncementMarqueeProps) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const text = announcements.length > 0 ? announcements.join('     •     ') : '';

  useEffect(() => {
    if (!contentWidth || !containerWidth) return;
    translateX.setValue(containerWidth);
    const distance = containerWidth + contentWidth;
    const duration = Math.max(distance * 25, 6000); // ~25ms per pixel, floor for very short text

    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -contentWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [contentWidth, containerWidth, translateX]);

  if (!text) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Ionicons name="megaphone-outline" size={16} color={colors.primary} style={styles.icon} />
      <View style={styles.clip}>
        <Animated.Text
          numberOfLines={1}
          onLayout={(e: LayoutChangeEvent) => setContentWidth(e.nativeEvent.layout.width)}
          style={[styles.text, { color: colors.primaryText, transform: [{ translateX }] }]}
        >
          {text}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  icon: { marginRight: spacing.sm },
  clip: { flex: 1, overflow: 'hidden', height: 20 },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    position: 'absolute',
  },
});
