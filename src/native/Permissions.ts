import { PermissionsAndroid, Permission, Platform } from 'react-native';

/**
 * Telefon uygulaması için gereken çalışma zamanı izinleri.
 * Mikrofon (RECORD_AUDIO) burada istenmez: kayıt ilk kez açıldığında istenecek (AGENTS.md Bölüm 5).
 */
export async function requestCallPermissions(): Promise<boolean> {
  const permissions: Permission[] = [
    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  ];
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const result = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(result).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
}