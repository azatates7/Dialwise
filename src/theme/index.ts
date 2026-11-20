import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { darkColors, lightColors, ThemeColors } from './colors';

export type { ThemeColors } from './colors';

/** Sistem temasını takip eder; sistem teması değişince bileşen yeniden çizilir. */
export function useTheme(): { dark: boolean; colors: ThemeColors } {
  const dark = useColorScheme() === 'dark';
  return { dark, colors: dark ? darkColors : lightColors };
}

/** React Navigation'a aynı paleti verir. */
export function navigationTheme(dark: boolean, colors: ThemeColors): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.tabBar,
      text: colors.textPrimary,
      border: colors.divider,
    },
  };
}