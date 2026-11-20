import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /** Uygulama şu an varsayılan telefon uygulaması mı? */
  isDefaultDialer(): boolean;
  /** Sistem rol penceresini açar; kullanıcı seçimini yaptıktan sonra güncel durumu döner. */
  requestDefaultDialer(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DialerRole');