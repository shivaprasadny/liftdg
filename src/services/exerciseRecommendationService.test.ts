import { describe, expect, it } from 'vitest';
import { rankExerciseReplacements, weightModesCompatible } from './exerciseRecommendationService';
import type { Exercise } from '@/types/exercise';
const exercise=(id:string,name:string,category:Exercise['category'],primary:string[],equipment:Exercise['equipment'],exerciseType:Exercise['exerciseType']='strength'):Exercise=>({id,name,category,primaryMuscles:primary,secondaryMuscles:[],equipment,exerciseType,instructions:[],isBuiltin:true,isArchived:false,createdAt:'',updatedAt:''});
const pullup=exercise('pullup','Pull-Up','Back',['Lats'],'Bodyweight','bodyweight');
const assisted=exercise('assisted','Assisted Pull-Up','Back',['Lats'],'Machine');
const curl=exercise('curl','Curl','Biceps',['Biceps'],'Dumbbell');
describe('exercise recommendations',()=>{
  it('ranks an explicit, same-muscle relation before unrelated candidates',()=>{const relation={id:'r',sourceExerciseId:'pullup',replacementExerciseId:'assisted',relationType:'REGRESSION' as const,priority:20,equipmentContext:null,difficultyDelta:-1,builtIn:true,active:true};expect(rankExerciseReplacements(pullup,[curl,assisted],{relations:[relation]})[0].exercise.id).toBe('assisted');});
  it('hard-excludes blocked exercises',()=>{expect(rankExerciseReplacements(pullup,[assisted],{restrictions:[{id:'x',exerciseId:'assisted',restrictionType:'avoid',reason:null,active:true,expiresAt:null}]})).toEqual([]);});
  it('uses equipment availability and deterministic name ordering',()=>{const cable=exercise('cable','Cable Pulldown','Back',['Lats'],'Cable');const machine=exercise('machine','Machine Pulldown','Back',['Lats'],'Machine');const first=rankExerciseReplacements(pullup,[machine,cable],{availableEquipment:new Set(['Cable'])});expect(first[0].exercise.id).toBe('cable');expect(rankExerciseReplacements(pullup,[machine,cable],{})).toEqual(rankExerciseReplacements(pullup,[machine,cable],{}));});
  it('explains matching factors',()=>expect(rankExerciseReplacements(pullup,[assisted],{})[0].reasons.some(reason=>reason.includes('Lats'))).toBe(true));
  it('detects unsafe bodyweight/external-weight transfer',()=>expect(weightModesCompatible(pullup,assisted)).toBe(false));
});
