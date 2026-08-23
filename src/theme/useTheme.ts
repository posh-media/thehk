import { useTheme as useThemeContext } from './ThemeProvider';

export function useTheme() {
  return useThemeContext();
}
