// One UI benzeri iki palet. darkColors, lightColors ile aynı anahtarlara sahip olmak zorunda
// (ThemeColors tipi bunu derleme anında kontrol eder).

export const lightColors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  surfaceVariant: '#E8E8E8',
  textPrimary: '#000000',
  textSecondary: '#6B6B6B',
  divider: '#DDDDDD',
  accent: '#2F6FED',
  callGreen: '#2DB84D',
  callRed: '#E5413B',
  missed: '#E5413B',
  tabBar: '#F2F2F2',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9A',
  divider: '#2C2C2E',
  accent: '#5B8DEF',
  callGreen: '#34C759',
  callRed: '#FF453A',
  missed: '#FF453A',
  tabBar: '#000000',
};