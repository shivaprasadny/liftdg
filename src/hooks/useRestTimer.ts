import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

interface StoredTimer { endAt: number | null; pausedRemaining: number | null; }
export function useRestTimer(workoutId: string) {
  const key = `liftdg:rest-timer:${workoutId}`; const [timer, setTimer] = useState<StoredTimer>({ endAt: null, pausedRemaining: null }); const [now, setNow] = useState(Date.now());
  useEffect(() => { void AsyncStorage.getItem(key).then((value) => { if (value) { try { setTimer(JSON.parse(value) as StoredTimer); } catch { /* Invalid UI preference is safely ignored. */ } } }); }, [key]);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  const persist = useCallback((next: StoredTimer) => { setTimer(next); void AsyncStorage.setItem(key, JSON.stringify(next)); }, [key]);
  const remaining = timer.pausedRemaining ?? (timer.endAt ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : 0);
  useEffect(() => { if (timer.endAt && remaining === 0) persist({ endAt: null, pausedRemaining: null }); }, [persist, remaining, timer.endAt]);
  const adjust=(seconds:number)=>persist(timer.pausedRemaining!=null?{endAt:null,pausedRemaining:Math.max(0,remaining+seconds)}:{endAt:Date.now()+Math.max(0,remaining+seconds)*1000,pausedRemaining:null});
  return { remaining, running: Boolean(timer.endAt), paused: timer.pausedRemaining != null,
    start: (seconds: number) => persist({ endAt: Date.now() + Math.max(0, seconds) * 1000, pausedRemaining: null }),
    pause: () => persist({ endAt: null, pausedRemaining: remaining }),
    resume: () => persist({ endAt: Date.now() + remaining * 1000, pausedRemaining: null }),
    addThirty: () => persist(timer.pausedRemaining != null ? { endAt: null, pausedRemaining: remaining + 30 } : { endAt: Date.now() + (remaining + 30) * 1000, pausedRemaining: null }),
    addFifteen:()=>adjust(15),subtractFifteen:()=>adjust(-15),restart:(seconds:number)=>persist({endAt:Date.now()+Math.max(0,seconds)*1000,pausedRemaining:null}),
    skip: () => persist({ endAt: null, pausedRemaining: null }) };
}
