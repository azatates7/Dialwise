import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * state: 'new' | 'ringing' | 'dialing' | 'connecting' | 'active' | 'holding'
 *      | 'disconnecting' | 'disconnected' | 'select_account' | 'other'
 * direction: 'incoming' | 'outgoing' | 'unknown'
 */
export type CallInfo = {
  id: string;
  number: string;
  state: string;
  direction: string;
  /** Görüşmenin bağlandığı an (epoch ms). Bağlanmadıysa 0. */
  connectTime: number;
  canHold: boolean;
};

/** route ve supportedRoutes: 'earpiece' | 'speaker' | 'bluetooth' | 'wired' */
export type AudioState = {
  muted: boolean;
  route: string;
  supportedRoutes: ReadonlyArray<string>;
};

export type PhoneAccount = {
  id: string;
  label: string;
};

export interface Spec extends TurboModule {
  /** accountId null ise sistemin varsayılan SIM'i kullanılır. */
  placeCall(number: string, accountId: string | null): Promise<void>;
  answer(callId: string): void;
  reject(callId: string): void;
  hangup(callId: string): void;
  hold(callId: string, on: boolean): void;
  /** Çağrı 'select_account' durumundayken SIM seçimi. */
  selectPhoneAccount(callId: string, accountId: string): void;
  setMuted(muted: boolean): void;
  setAudioRoute(route: string): void;
  playDtmf(callId: string, digit: string): void;
  stopDtmf(callId: string): void;
  getActiveCalls(): ReadonlyArray<CallInfo>;
  getAudioState(): AudioState;
  getPhoneAccounts(): Promise<ReadonlyArray<PhoneAccount>>;

  readonly onCallAdded: CodegenTypes.EventEmitter<CallInfo>;
  readonly onCallStateChanged: CodegenTypes.EventEmitter<CallInfo>;
  readonly onCallRemoved: CodegenTypes.EventEmitter<string>;
  readonly onAudioStateChanged: CodegenTypes.EventEmitter<AudioState>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CallControl');