import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

interface StoredTimer { endAt: number | null; pausedRemaining: number | null; anchorSetId?: string | null; }
export function useRestTimer(workoutId: string) {
  const key = `liftdg:rest-timer:${workoutId}`; const [timer, setTimer] = useState<StoredTimer>({ endAt: null, pausedRemaining: null }); const [now, setNow] = useState(Date.now());
  useEffect(() => { void AsyncStorage.getItem(key).then((value) => { if (value) { try { setTimer(JSON.parse(value) as StoredTimer); } catch { /* Invalid UI preference is safely ignored. */ } } }); }, [key]);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  const persist = useCallback((next: StoredTimer) => { setTimer(next); void AsyncStorage.setItem(key, JSON.stringify(next)); }, [key]);
  const remaining = timer.pausedRemaining ?? (timer.endAt ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : 0);
  useEffect(() => { if (timer.endAt && remaining === 0) persist({ endAt: null, pausedRemaining: null, anchorSetId: null }); }, [persist, remaining, timer.endAt]);
  const adjust=(seconds:number)=>persist(timer.pausedRemaining!=null?{endAt:null,pausedRemaining:Math.max(0,remaining+seconds),anchorSetId:timer.anchorSetId}:{endAt:Date.now()+Math.max(0,remaining+seconds)*1000,pausedRemaining:null,anchorSetId:timer.anchorSetId});
  return { remaining, running: Boolean(timer.endAt), paused: timer.pausedRemaining != null, anchorSetId: timer.anchorSetId ?? null,
    start: (seconds: number, anchorSetId?: string) => persist({ endAt: Date.now() + Math.max(0, seconds) * 1000, pausedRemaining: null, anchorSetId: anchorSetId ?? null }),
    pause: () => persist({ endAt: null, pausedRemaining: remaining, anchorSetId: timer.anchorSetId }),
    resume: () => persist({ endAt: Date.now() + remaining * 1000, pausedRemaining: null, anchorSetId: timer.anchorSetId }),
    addThirty: () => persist(timer.pausedRemaining != null ? { endAt: null, pausedRemaining: remaining + 30, anchorSetId: timer.anchorSetId } : { endAt: Date.now() + (remaining + 30) * 1000, pausedRemaining: null, anchorSetId: timer.anchorSetId }),
    addFifteen:()=>adjust(15),subtractFifteen:()=>adjust(-15),restart:(seconds:number)=>persist({endAt:Date.now()+Math.max(0,seconds)*1000,pausedRemaining:null,anchorSetId:timer.anchorSetId}),
    skip: () => persist({ endAt: null, pausedRemaining: null, anchorSetId: null }) };
}
