import { describe, expect, it } from 'vitest';
import { comparePlannedAndPerformed } from './plannedPerformedComparisonService';
import type { WorkoutDetails } from '@/types/workout';

describe('planned versus performed', () => {
  it('uses a neutral incomplete state when completed sets differ from the saved plan', () => {
    const exercise = { id:'bench', name:'Bench', category:'Chest', primaryMuscles:['Chest'], secondaryMuscles:[], equipment:'Barbell', exerciseType:'strength', instructions:[], isBuiltin:true, isArchived:false, createdAt:'', updatedAt:'' };
    const workout = { id:'w', planId:null, planName:null, name:'Push', workoutType:'strength', startedAt:'2026-01-01', completedAt:'2026-01-01', durationSeconds:60, notes:null, status:'completed', createdAt:'', updatedAt:'', cardioSessions:[], groups:[], summary:{exerciseCount:1,completedExerciseCount:1,completedSetCount:1,totalRepetitions:8,totalVolume:400,averageRpe:null,durationSeconds:60}, originalSnapshotJson:JSON.stringify({schemaVersion:1,name:'Push',workoutType:'strength',estimatedDurationMinutes:null,notes:null,sourcePlanId:null,sourcePlanUpdatedAt:null,exercises:[{id:'slot',planId:'p',exerciseId:'bench',exerciseOrder:0,targetSets:3,targetRepsMin:8,targetRepsMax:10,targetWeight:null,restSeconds:90,notes:null,exercise}]}), exercises:[{id:'we',workoutId:'w',exerciseId:'bench',exerciseOrder:0,targetSets:3,targetRepsMin:8,targetRepsMax:10,targetWeight:null,restSeconds:90,notes:null,startedAt:null,completedAt:null,exercise,sets:[{id:'s',workoutExerciseId:'we',setNumber:1,weight:50,reps:8,setType:'working',rpe:null,completed:true,completedAt:'',notes:null,createdAt:'',updatedAt:'',volume:400}]}] } as unknown as WorkoutDetails;
    const result = comparePlannedAndPerformed(workout);
    expect(result.exercises[0].state).toBe('incomplete');
    expect(result.changes[0]).toContain('incomplete');
  });
});
