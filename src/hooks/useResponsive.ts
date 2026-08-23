import { useWindowDimensions } from 'react-native';
import { breakpoints } from '@theme/tokens';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;
  const isLargeDesktop = width >= breakpoints.xl;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isWeb: typeof navigator !== 'undefined' && navigator.product !== 'ReactNative',
  };
}

export function useBreakpointValue<T>(values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T; xxl?: T }): T | undefined {
  const { width } = useWindowDimensions();
  if (width >= breakpoints.xxl && values.xxl !== undefined) return values.xxl;
  if (width >= breakpoints.xl && values.xl !== undefined) return values.xl;
  if (width >= breakpoints.lg && values.lg !== undefined) return values.lg;
  if (width >= breakpoints.md && values.md !== undefined) return values.md;
  if (width >= breakpoints.sm && values.sm !== undefined) return values.sm;
  return values.xs;
}
