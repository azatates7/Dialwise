import NativeDialerRole from '../specs/NativeDialerRole';

export const DialerRole = {
  isDefault(): boolean {
    return NativeDialerRole.isDefaultDialer();
  },
  request(): Promise<boolean> {
    return NativeDialerRole.requestDefaultDialer();
  },
};