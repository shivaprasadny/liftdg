import { useCallback, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { router } from 'expo-router';

import { launchPlan, launchQuickWorkout, launchScheduledWorkout } from '@/services/workoutLaunchService';
import type { QuickWorkoutInput, SessionSourceType } from '@/types/workoutLaunch';

export function useStartWorkout(db:SQLiteDatabase){const[busyKey,setBusyKey]=useState<string|null>(null);
  const run=useCallback(async(key:string,action:()=>Promise<string>)=>{if(busyKey)return;setBusyKey(key);try{const id=await action();router.push({pathname:'/workout/active',params:{id}});return id;}finally{setBusyKey(null);}},[busyKey]);
  return {busyKey,startPlan:(id:string,source?:SessionSourceType)=>run(`plan:${id}`,()=>launchPlan(db,id,source)),startScheduled:(id:string)=>run(`scheduled:${id}`,()=>launchScheduledWorkout(db,id)),startQuick:(input:QuickWorkoutInput)=>run(`quick:${input.sourceType}`,()=>launchQuickWorkout(db,input))};}
