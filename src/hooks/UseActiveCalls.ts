import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AudioState, CallControl, CallInfo } from '../native/CallControl';

function upsert(list: CallInfo[], call: CallInfo): CallInfo[] {
  const index = list.findIndex(c => c.id === call.id);
  if (index < 0) {
    return [...list, call];
  }
  const next = [...list];
  next[index] = call;
  return next;
}

/** Aktif çağrılar ve ses durumu. Native event'lerle güncellenir. */
export function useActiveCalls() {
  const [calls, setCalls] = useState<CallInfo[]>(() => CallControl.getActiveCalls());
  const [audio, setAudio] = useState<AudioState>(() => CallControl.getAudioState());

  useEffect(() => {
    const resync = () => {
      setCalls(CallControl.getActiveCalls());
      setAudio(CallControl.getAudioState());
    };

    const subs = [
      CallControl.onCallAdded(call => setCalls(prev => upsert(prev, call))),
      CallControl.onCallStateChanged(call => setCalls(prev => upsert(prev, call))),
      CallControl.onCallRemoved(id => setCalls(prev => prev.filter(c => c.id !== id))),
      CallControl.onAudioStateChanged(setAudio),
      AppState.addEventListener('change', state => {
        if (state === 'active') {
          resync();
        }
      }),
    ];
    // Abonelikten önce kaçmış olabilecek değişiklikleri yakalamak için.
    resync();

    return () => subs.forEach(s => s.remove());
  }, []);

  return { calls, audio };
}