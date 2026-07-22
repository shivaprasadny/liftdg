import type { Exercise } from '@/types/exercise';
import type { ExerciseRecommendation, ExerciseReplacementRelation, ExerciseRestriction } from '@/types/exerciseReplacement';

export interface RecommendationContext { availableEquipment?:ReadonlySet<string>;relations?:readonly ExerciseReplacementRelation[];restrictions?:readonly ExerciseRestriction[];favoriteExerciseIds?:ReadonlySet<string>;recentReplacementIds?:ReadonlySet<string>; }

const overlap=(a:readonly string[],b:readonly string[])=>a.filter(value=>b.some(other=>other.toLowerCase()===value.toLowerCase())).length;
const inferredPattern=(exercise:Exercise):string=>exercise.movementPattern??({Chest:'Horizontal Push',Back:'Horizontal Pull',Shoulders:'Vertical Push',Quadriceps:'Squat',Hamstrings:'Hinge',Glutes:'Hinge',Cardio:'Conditioning',Mobility:'Mobility',Yoga:'Mobility',Core:'Core Stability'} as Record<string,string>)[exercise.category]??'Other';

/** Scores bounded candidates deterministically; restrictions are hard exclusions, while relations and preferences are transparent boosts. */
export function rankExerciseReplacements(current:Exercise,candidates:readonly Exercise[],context:RecommendationContext={}):ExerciseRecommendation[]{
  const blocked=new Set((context.restrictions??[]).filter(item=>item.active&&(item.restrictionType==='avoid'||item.restrictionType==='do_not_recommend'||item.restrictionType==='temporarily_unavailable')&&(!item.expiresAt||new Date(item.expiresAt)>new Date())).map(item=>item.exerciseId));
  const relations=new Map((context.relations??[]).filter(item=>item.active&&item.sourceExerciseId===current.id).map(item=>[item.replacementExerciseId,item]));
  return candidates.filter(item=>item.id!==current.id&&!item.isArchived&&!blocked.has(item.id)).map(exercise=>{
    let score=0;const reasons:string[]=[];const currentPattern=inferredPattern(current);const candidatePattern=inferredPattern(exercise);
    if(currentPattern===candidatePattern){score+=40;reasons.push(`Same ${currentPattern.toLowerCase()} pattern`);}
    const primary=overlap(current.primaryMuscles,exercise.primaryMuscles);if(primary){score+=30+Math.min(primary-1,2)*3;reasons.push(`Trains ${exercise.primaryMuscles.slice(0,2).join(' and ')}`);}
    const secondary=overlap(current.secondaryMuscles,exercise.secondaryMuscles);if(secondary)score+=Math.min(secondary*5,10);
    if(current.category===exercise.category)score+=12;
    if(current.exerciseType===exercise.exerciseType)score+=8;
    if(current.equipment===exercise.equipment){score+=10;reasons.push(`Uses the same ${exercise.equipment.toLowerCase()} setup`);}
    if(context.availableEquipment){if(context.availableEquipment.has(exercise.equipment)){score+=18;reasons.push(`${exercise.equipment} is available`);}else score-=30;}
    if(current.difficulty&&exercise.difficulty===current.difficulty)score+=7;
    if(current.laterality&&exercise.laterality===current.laterality)score+=5;
    if(current.exerciseRole&&exercise.exerciseRole===current.exerciseRole)score+=5;
    const relation=relations.get(exercise.id);if(relation){score+=50+relation.priority;reasons.unshift(relation.relationType==='REGRESSION'?'Explicit easier progression':relation.relationType==='PROGRESSION'?'Explicit progression':'Curated exercise alternative');}
    if(context.favoriteExerciseIds?.has(exercise.id)){score+=4;reasons.push('Marked as a favorite');}
    if(context.recentReplacementIds?.has(exercise.id)){score+=3;reasons.push('Used as a recent replacement');}
    const category:ExerciseRecommendation['category']=relation||score>=75?'Best Match':currentPattern===candidatePattern?'Same Movement Pattern':primary?'Same Primary Muscle':current.equipment!==exercise.equipment?'Equipment Alternative':'Other';
    return{exercise,score,reasons:[...new Set(reasons)].slice(0,3),category};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.exercise.name.localeCompare(b.exercise.name));
}

export function weightModesCompatible(from:Exercise,to:Exercise):boolean{
  const body=(exercise:Exercise)=>exercise.exerciseType==='bodyweight'||exercise.equipment==='Bodyweight';
  if(body(from)!==body(to))return false;
  return from.equipment===to.equipment||(!body(from)&&!body(to)&&from.exerciseType===to.exerciseType);
}
