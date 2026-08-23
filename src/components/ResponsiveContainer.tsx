import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useResponsive } from '@hooks/useResponsive';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  showNav?: boolean;
  scroll?: boolean;
}

export function ResponsiveContainer({ children, showNav = true, scroll = true }: ResponsiveContainerProps) {
  const { isDesktop, isTablet } = useResponsive();
  const showSidebar = isDesktop || isTablet;

  const content = (
    <View style={[styles.content, { maxWidth: showSidebar ? 1200 : undefined, width: '100%' }]}>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      {showSidebar && showNav && <Sidebar />}
      <View style={styles.main}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          <View style={styles.scrollContent}>{content}</View>
        )}
      </View>
      {!showSidebar && showNav && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    padding: 16,
    width: '100%',
  },
});
