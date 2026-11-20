import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { DialerRole } from '../native/DialerRole';

/**
 * Varsayılan telefon uygulaması durumu.
 * Kullanıcı rolü sistem ayarlarından değiştirip geri dönerse, uygulama öne geldiğinde yeniden okunur.
 */
export function useDefaultDialer() {
  const [isDefault, setIsDefault] = useState<boolean>(() => DialerRole.isDefault());

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setIsDefault(DialerRole.isDefault());
      }
    });
    return () => sub.remove();
  }, []);

  const request = useCallback(async () => {
    const granted = await DialerRole.request();
    setIsDefault(granted);
    return granted;
  }, []);

  return { isDefault, request };
}