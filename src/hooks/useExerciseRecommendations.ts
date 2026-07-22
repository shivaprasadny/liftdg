import { useCallback, useEffect, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Exercise } from '@/types/exercise';
import type { ExerciseRecommendation } from '@/types/exerciseReplacement';
import { getDefaultEquipmentProfile, getExerciseRestrictions, getReplacementCandidates, getReplacementRelations } from '@/repositories/exerciseReplacementRepository';
import { rankExerciseReplacements } from '@/services/exerciseRecommendationService';

export function useExerciseRecommendations(db:SQLiteDatabase,current:Exercise|null){const[recommendations,setRecommendations]=useState<ExerciseRecommendation[]>([]);const[loading,setLoading]=useState(false);const[error,setError]=useState<string|null>(null);const load=useCallback(async()=>{if(!current)return;setLoading(true);setError(null);try{const[candidates,relations,restrictions,profile]=await Promise.all([getReplacementCandidates(db),getReplacementRelations(db,current.id),getExerciseRestrictions(db),getDefaultEquipmentProfile(db)]);setRecommendations(rankExerciseReplacements(current,candidates,{relations,restrictions,availableEquipment:profile?new Set(profile.equipment):undefined}));}catch{setError('Recommendations could not be loaded.');}finally{setLoading(false);}},[current,db]);useEffect(()=>{void load();},[load]);return{recommendations,loading,error,reload:load};}
