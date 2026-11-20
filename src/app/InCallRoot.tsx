import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { I18nProvider } from '../i18n';
import { useTheme } from '../theme';
import { DevCallPanel } from '../screens/dev/DevCallPanel';

// InCallActivity'nin kök bileşeni ("InCall").
// GEÇİCİ: Adım 5'te DevCallPanel yerine gerçek InCall ekranı gelecek.
function Content() {
  const { dark, colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <DevCallPanel />
    </SafeAreaView>
  );
}

export function InCallRoot() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <Content />
      </I18nProvider>
    </SafeAreaProvider>
  );
}