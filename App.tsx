import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, TKey, useI18n } from './src/i18n';
import { navigationTheme, useTheme } from './src/theme';

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

const KeypadScreen = () => <Placeholder labelKey="tabs.keypad" />;
const RecentsScreen = () => <Placeholder labelKey="tabs.recents" />;
const ContactsScreen = () => <Placeholder labelKey="tabs.contacts" />;

function Root() {
  const { dark, colors } = useTheme();
  const { t } = useI18n();

  return (
    <NavigationContainer theme={navigationTheme(dark, colors)}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
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