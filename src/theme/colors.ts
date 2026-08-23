export const palette = {
  black: '#0D0D0D',
  blackLight: '#141414',
  blackElevated: '#1A1A1A',
  blackSoft: '#1E1E1E',
  white: '#FFFFFF',
  whiteSoft: '#F5F6F8',
  green: '#72C645',
  greenDark: '#5A9F35',
  greenGlow: 'rgba(114, 198, 69, 0.25)',
  grey100: '#F3F4F6',
  grey200: '#E5E7EB',
  grey300: '#D1D5DB',
  grey400: '#9CA3AF',
  grey500: '#6B7280',
  grey600: '#4B5563',
  grey700: '#374151',
  grey800: '#1F2937',
  red: '#EF4444',
  redSoft: '#F87171',
  redSurface: 'rgba(239, 68, 68, 0.12)',
  amber: '#F59E0B',
  amberSoft: '#FBBF24',
  amberSurface: 'rgba(245, 158, 11, 0.12)',
  blue: '#3B82F6',
  blueSurface: 'rgba(59, 130, 246, 0.12)',
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  glassSurface: string;
  glassBorder: string;
  border: string;
  divider: string;
  primary: string;
  primaryHover: string;
  primaryGlow: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  inverseText: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  successSurface: string;
  warningSurface: string;
  errorSurface: string;
  infoSurface: string;
  overlay: string;
  shadow: string;
};

export const darkTheme: ThemeColors = {
  background: palette.black,
  surface: palette.blackLight,
  surfaceElevated: palette.blackElevated,
  glassSurface: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.08)',
  divider: 'rgba(255, 255, 255, 0.06)',
  primary: palette.green,
  primaryHover: palette.greenDark,
  primaryGlow: palette.greenGlow,
  primaryText: palette.white,
  secondaryText: palette.grey400,
  mutedText: palette.grey500,
  inverseText: palette.black,
  success: palette.green,
  warning: palette.amber,
  error: palette.red,
  info: palette.blue,
  successSurface: 'rgba(114, 198, 69, 0.12)',
  warningSurface: palette.amberSurface,
  errorSurface: palette.redSurface,
  infoSurface: palette.blueSurface,
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export const lightTheme: ThemeColors = {
  background: palette.whiteSoft,
  surface: palette.white,
  surfaceElevated: palette.white,
  glassSurface: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  border: 'rgba(0, 0, 0, 0.08)',
  divider: 'rgba(0, 0, 0, 0.06)',
  primary: palette.green,
  primaryHover: palette.greenDark,
  primaryGlow: palette.greenGlow,
  primaryText: '#111111',
  secondaryText: palette.grey600,
  mutedText: palette.grey400,
  inverseText: palette.white,
  success: '#16A34A',
  warning: palette.amber,
  error: palette.red,
  info: palette.blue,
  successSurface: 'rgba(22, 163, 74, 0.10)',
  warningSurface: palette.amberSurface,
  errorSurface: palette.redSurface,
  infoSurface: palette.blueSurface,
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.08)',
};

export type ThemeMode = 'dark' | 'light' | 'system';
