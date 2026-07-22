import { describe, expect, it } from 'vitest';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';
import { AppError } from '@/utils/errors';
import { assertLaunchEligible, localTodayKey, orderTodaysWorkouts, withWorkoutStartLock } from './workoutLaunchService';

const item=(overrides:Partial<ScheduledWorkout>):ScheduledWorkout=>({id:'one',planId:'plan',scheduledDate:'2026-07-22',daypart:null,startTime:null,snapshotName:'Workout',snapshotWorkoutType:'strength',estimatedDurationMinutes:null,status:'scheduled',notes:null,programId:null,programWeekNumber:null,programDayId:null,createdAt:'2026-07-01T00:00:00.000Z',updatedAt:'2026-07-01T00:00:00.000Z',...overrides});

describe('start workout launch rules',()=>{
  it('uses the local calendar date',()=>expect(localTodayKey(new Date(2026,6,22,23,30))).toBe('2026-07-22'));
  it('orders exact times and then dayparts',()=>{const rows=orderTodaysWorkouts([item({id:'evening',daypart:'evening'}),item({id:'timed',startTime:'06:30'}),item({id:'morning',daypart:'morning'})]);expect(rows.map(x=>x.id)).toEqual(['timed','morning','evening'])});
  it('rejects completed, cancelled, and already-started occurrences',()=>{expect(()=>assertLaunchEligible(item({status:'completed'}))).toThrow(AppError);expect(()=>assertLaunchEligible(item({status:'cancelled'}))).toThrow(AppError);expect(()=>assertLaunchEligible(item({status:'in_progress',activeSessionId:'active'}))).toThrow(AppError)});
  it('prevents a concurrent duplicate start and releases the lock afterward',async()=>{let release!:()=>void;const pending=withWorkoutStartLock('same',()=>new Promise<void>(resolve=>{release=resolve}));await expect(withWorkoutStartLock('same',async()=>undefined)).rejects.toThrow(/already starting/);release();await pending;await expect(withWorkoutStartLock('same',async()=>42)).resolves.toBe(42)});
});
