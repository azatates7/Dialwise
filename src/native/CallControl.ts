import NativeCallControl from '../specs/NativeCallControl';
import type { AudioState, CallInfo, PhoneAccount } from '../specs/NativeCallControl';

export type { AudioState, CallInfo, PhoneAccount };

export type AudioRoute = 'earpiece' | 'speaker' | 'bluetooth' | 'wired';

export const CallControl = {
  placeCall: (number: string, accountId: string | null = null) => NativeCallControl.placeCall(number, accountId),
  answer: (callId: string) => NativeCallControl.answer(callId),
  reject: (callId: string) => NativeCallControl.reject(callId),
  hangup: (callId: string) => NativeCallControl.hangup(callId),
  hold: (callId: string, on: boolean) => NativeCallControl.hold(callId, on),
  selectPhoneAccount: (callId: string, accountId: string) => NativeCallControl.selectPhoneAccount(callId, accountId),
  setMuted: (muted: boolean) => NativeCallControl.setMuted(muted),
  setAudioRoute: (route: AudioRoute) => NativeCallControl.setAudioRoute(route),
  playDtmf: (callId: string, digit: string) => NativeCallControl.playDtmf(callId, digit),
  stopDtmf: (callId: string) => NativeCallControl.stopDtmf(callId),
  getActiveCalls: (): CallInfo[] => [...NativeCallControl.getActiveCalls()],
  getAudioState: (): AudioState => NativeCallControl.getAudioState(),
  getPhoneAccounts: async (): Promise<PhoneAccount[]> => [...(await NativeCallControl.getPhoneAccounts())],

  onCallAdded: (handler: (call: CallInfo) => void) => NativeCallControl.onCallAdded(handler),
  onCallStateChanged: (handler: (call: CallInfo) => void) => NativeCallControl.onCallStateChanged(handler),
  onCallRemoved: (handler: (callId: string) => void) => NativeCallControl.onCallRemoved(handler),
  onAudioStateChanged: (handler: (audio: AudioState) => void) => NativeCallControl.onAudioStateChanged(handler),
};