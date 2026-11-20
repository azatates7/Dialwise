import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';

type Props = {
  onRequest: () => Promise<boolean>;
  onSkip: () => void;
};

export function OnboardingScreen({ onRequest, onSkip }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const appName = t('app.name');

  const handleRequest = async () => {
    setBusy(true);
    try {
      const granted = await onRequest();
      setDenied(!granted);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('onboarding.title')}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {t('onboarding.body', { appName })}
        </Text>
        {denied && (
          <Text style={[styles.body, { color: colors.callRed }]}>{t('onboarding.denied', { appName })}</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={handleRequest}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: colors.accent, opacity: pressed || busy ? 0.7 : 1 },
          ]}>
          <Text style={styles.primaryText}>{t('onboarding.action')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onSkip} style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: colors.accent }]}>{t('onboarding.later')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, justifyContent: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  actions: { paddingBottom: 24, gap: 8 },
  primary: { borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 16 },
});