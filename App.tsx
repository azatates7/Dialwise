import React, { useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, TKey, useI18n } from './src/i18n';
import { navigationTheme, useTheme } from './src/theme';
import { useDefaultDialer } from './src/hooks/UseDefaultDialer';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { DevCallPanel } from './src/screens/dev/DevCallPanel';

type TabParamList = {
  Keypad: undefined;
  Recents: undefined;
  Contacts: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Geçici ekran: Faz 1'in sonraki adımlarında gerçek ekranlarla değişecek.
function Placeholder({ labelKey }: { labelKey: TKey }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textSecondary }}>{t(labelKey)}</Text>
    </View>
  );
}

// GEÇİCİ: geliştirme derlemesinde Keypad sekmesi native çağrı katmanını test eden paneli gösterir.
const KeypadScreen = () => (__DEV__ ? <DevCallPanel /> : <Placeholder labelKey="tabs.keypad" />);
const RecentsScreen = () => <Placeholder labelKey="tabs.recents" />;
const ContactsScreen = () => <Placeholder labelKey="tabs.contacts" />;

function Root() {
  const { dark, colors } = useTheme();
  const { t } = useI18n();
  const { isDefault, request } = useDefaultDialer();
  // "Şimdi değil" yalnızca bu oturum için geçerli; uygulama yeniden açılınca onboarding tekrar gösterilir.
  const [skipped, setSkipped] = useState(false);

  const statusBar = <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />;

  if (!isDefault && !skipped) {
    return (
      <>
        {statusBar}
        <OnboardingScreen onRequest={request} onSkip={() => setSkipped(true)} />
      </>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme(dark, colors)}>
      {statusBar}
      <Tab.Navigator
        screenOptions={{
          tabBarIconStyle: { display: 'none' },
          tabBarLabelStyle: { fontSize: 14 },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textSecondary,
          headerTitleStyle: { fontSize: 28, fontWeight: '600' },
          headerShadowVisible: false,
        }}>
        <Tab.Screen name="Keypad" component={KeypadScreen} options={{ title: t('tabs.keypad') }} />
        <Tab.Screen name="Recents" component={RecentsScreen} options={{ title: t('tabs.recents') }} />
        <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: t('tabs.contacts') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <Root />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});