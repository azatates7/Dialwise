// GEÇİCİ GELİŞTİRME PANELİ (Faz 1 / Adım 3)
// Native çağrı katmanını test etmek için. Yalnızca __DEV__ derlemede görünür.
// Adım 5'te InCall ekranı, Faz 3'te gerçek Keypad gelince silinecek.
// Kullanıcıya gösterilmediği için metinler i18n'e eklenmedi.

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CallControl, CallInfo, PhoneAccount } from '../../native/CallControl';
import { useActiveCalls } from '../../hooks/UseActiveCalls';
import { useTheme } from '../../theme';

function Button({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: color, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function DevCallPanel() {
  const { colors } = useTheme();
  const { calls, audio } = useActiveCalls();
  const [number, setNumber] = useState('');
  const [accounts, setAccounts] = useState<PhoneAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  // İzinler App.tsx'te isteniyor; izin sonradan verilirse "Reload SIM" ile yeniden okunur.
  const loadAccounts = () => {
    CallControl.getPhoneAccounts()
      .then(setAccounts)
      .catch(e => setError(String(e)));
  };

  useEffect(loadAccounts, []);

  const call = async () => {
    setError(null);
    try {
      await CallControl.placeCall(number.trim());
    } catch (e) {
      setError(String(e));
    }
  };

  const renderActions = (c: CallInfo) => {
    if (c.state === 'ringing') {
      return (
        <>
          <Button label="Answer" color={colors.callGreen} onPress={() => CallControl.answer(c.id)} />
          <Button label="Reject" color={colors.callRed} onPress={() => CallControl.reject(c.id)} />
        </>
      );
    }
    if (c.state === 'select_account') {
      return accounts.map(a => (
        <Button key={a.id} label={a.label || a.id} color={colors.accent} onPress={() => CallControl.selectPhoneAccount(c.id, a.id)} />
      ));
    }
    const speakerOn = audio.route === 'speaker';
    return (
      <>
        <Button label="Hang up" color={colors.callRed} onPress={() => CallControl.hangup(c.id)} />
        {c.canHold && (
          <Button
            label={c.state === 'holding' ? 'Unhold' : 'Hold'}
            color={colors.accent}
            onPress={() => CallControl.hold(c.id, c.state !== 'holding')}
          />
        )}
        <Button label={audio.muted ? 'Unmute' : 'Mute'} color={colors.accent} onPress={() => CallControl.setMuted(!audio.muted)} />
        <Button
          label={speakerOn ? 'Earpiece' : 'Speaker'}
          color={colors.accent}
          onPress={() => CallControl.setAudioRoute(speakerOn ? 'earpiece' : 'speaker')}
        />
      </>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>DEV CALL PANEL</Text>

      <View style={styles.row}>
        <TextInput
          value={number}
          onChangeText={setNumber}
          placeholder="Number"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.divider }]}
        />
        <Button label="Call" color={colors.callGreen} onPress={call} />
      </View>
      {error && <Text style={{ color: colors.callRed }}>{error}</Text>}

      <View style={styles.row}>
        <Text style={[styles.caption, styles.flex, { color: colors.textSecondary }]}>
          SIM: {accounts.map(a => a.label || a.id).join(', ') || '-'}
        </Text>
        <Button label="Reload SIM" color={colors.accent} onPress={loadAccounts} />
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Audio: route={audio.route} muted={String(audio.muted)} supported=[{audio.supportedRoutes.join(', ')}]
      </Text>

      {calls.length === 0 && <Text style={{ color: colors.textSecondary }}>No active calls</Text>}
      {calls.map(c => (
        <View key={c.id} style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.textPrimary }}>
            {c.id} · {c.number || '(unknown)'} · {c.direction}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            state={c.state} canHold={String(c.canHold)} connectTime={c.connectTime}
          </Text>
          <View style={styles.actions}>{renderActions(c)}</View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  caption: { fontSize: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18 },
  card: { borderRadius: 12, padding: 12, gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
});