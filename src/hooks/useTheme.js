import { useTheme as useThemeContext } from '../theme/ThemeContext';

export default function useTheme() {
  return useThemeContext();
}