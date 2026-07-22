import type { SQLiteDatabase } from 'expo-sqlite';

import exercises from '@/data/exercises.json';
import exerciseVideos from '@/data/exerciseVideos.json';
import programs from '@/data/programs.json';
import starterPlans from '@/data/starterPlans.json';
import type { ProgramTemplateSeed } from '@/types/program';
import type { ExerciseSeed } from '@/types/exercise';
import type { ExerciseVideoSeed } from '@/types/exerciseVideo';
import type { StarterPlanSeed } from '@/types/workoutPlan';
import { createId } from '@/utils/ids';

import { EXERCISE_REPLACEMENT_SEED_VERSION, EXERCISE_SEED_VERSION, EXERCISE_VIDEO_SEED_VERSION, PLATE_CALCULATOR_SEED_VERSION, PROGRAM_SEED_VERSION, STARTER_PLAN_SEED_VERSION } from './schema';

export async function seedExerciseReplacements(db:SQLiteDatabase):Promise<void>{
  const current=await db.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',['exercise_replacement_seed_version']);if(Number(current?.value??0)>=EXERCISE_REPLACEMENT_SEED_VERSION)return;
  const now=new Date().toISOString();const relations=[
    ['pullup-assisted','back_pull_up','back_assisted_pull_up','REGRESSION',30],['pullup-pulldown','back_pull_up','back_lat_pulldown','MACHINE_VARIANT',25],
    ['assisted-pullup','back_assisted_pull_up','back_pull_up','PROGRESSION',25],['pulldown-pullup','back_lat_pulldown','back_pull_up','BODYWEIGHT_VARIANT',20],
    ['bench-db','chest_barbell_bench_press','chest_dumbbell_bench_press','FREE_WEIGHT_VARIANT',25],['bench-pushup','chest_barbell_bench_press','chest_push_up','BODYWEIGHT_VARIANT',20],
    ['squat-goblet','quads_back_squat','quads_goblet_squat','REGRESSION',25],['deadlift-rdl','hamstrings_deadlift','hamstrings_romanian_deadlift','SAME_LEVEL_ALTERNATIVE',20],
    ['press-db','shoulders_barbell_press','shoulders_dumbbell_press','FREE_WEIGHT_VARIANT',25],['row-db','back_barbell_row','back_dumbbell_row','FREE_WEIGHT_VARIANT',25],
    ['dip-bench','triceps_dip','triceps_bench_dip','REGRESSION',20],['stair-walk','cardio_stair_climber','cardio_treadmill_running','EQUIPMENT_ALTERNATIVE',15],
  ] as const;
  await db.withExclusiveTransactionAsync(async tx=>{for(const[id,source,replacement,type,priority]of relations){const valid=await tx.getFirstAsync('SELECT 1 FROM exercises WHERE id=?',[replacement]);if(valid)await tx.runAsync(`INSERT INTO exercise_replacement_relations(id,source_exercise_id,replacement_exercise_id,relation_type,priority,built_in,active,created_at,updated_at) VALUES(?,?,?,?,?,1,1,?,?) ON CONFLICT(id) DO UPDATE SET priority=excluded.priority,active=1,updated_at=excluded.updated_at`,[id,source,replacement,type,priority,now,now]);}
    const profiles=[['equipment-full-gym','Full Gym',1],['equipment-home','Home Gym',0],['equipment-none','No Equipment',0]] as const;for(const[id,name,isDefault]of profiles)await tx.runAsync(`INSERT INTO equipment_profiles(id,name,default_profile,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at`,[id,name,isDefault,now,now]);
    const all=['Barbell','Dumbbell','Cable','Machine','Bodyweight','Resistance Band','Kettlebell','Smith Machine','Cardio Machine','Other'];for(const equipment of all)await tx.runAsync(`INSERT OR IGNORE INTO equipment_profile_items(id,equipment_profile_id,equipment_type,available,created_at,updated_at) VALUES(?,?,?,?,?,?)`,[`full-${equipment.toLowerCase().replaceAll(' ','-')}`,'equipment-full-gym',equipment,1,now,now]);for(const equipment of ['Dumbbell','Bodyweight','Resistance Band','Kettlebell','Other'])await tx.runAsync(`INSERT OR IGNORE INTO equipment_profile_items(id,equipment_profile_id,equipment_type,available,created_at,updated_at) VALUES(?,?,?,?,?,?)`,[`home-${equipment.toLowerCase().replaceAll(' ','-')}`,'equipment-home',equipment,1,now,now]);await tx.runAsync(`INSERT OR IGNORE INTO equipment_profile_items(id,equipment_profile_id,equipment_type,available,created_at,updated_at) VALUES(?,?,?,?,?,?)`,['none-bodyweight','equipment-none','Bodyweight',1,now,now]);
    await tx.runAsync(`INSERT INTO app_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,['exercise_replacement_seed_version',String(EXERCISE_REPLACEMENT_SEED_VERSION),now]);});
}

export async function seedPlateCalculator(db:SQLiteDatabase):Promise<void>{const current=await db.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',['plate_calculator_seed_version']);if(Number(current?.value??0)>=PLATE_CALCULATOR_SEED_VERSION)return;const now=new Date().toISOString();const bars=[['bar-olympic-lb','Men’s Olympic Bar',45,'lb'],['bar-womens-lb','Women’s Olympic Bar',35,'lb'],['bar-training-lb','Training Bar',25,'lb'],['bar-technique-lb','Technique Bar',15,'lb'],['bar-olympic-kg','Men’s Olympic Bar',20,'kg'],['bar-womens-kg','Women’s Olympic Bar',15,'kg'],['bar-training-kg','Training Bar',10,'kg'],['bar-technique-kg','Technique Bar',5,'kg']] as const;const inventories=[{id:'inventory-standard-lb',name:'Standard Pound Plates',unit:'lb',bar:'bar-olympic-lb',plates:[55,45,35,25,15,10,5,2.5,1.25,.5]},{id:'inventory-standard-kg',name:'Standard Kilogram Plates',unit:'kg',bar:'bar-olympic-kg',plates:[25,20,15,10,5,2.5,2,1.5,1.25,1,.5,.25]}] as const;await db.withExclusiveTransactionAsync(async tx=>{for(const[id,name,weight,unit]of bars)await tx.runAsync(`INSERT INTO bar_profiles(id,name,bar_type,weight,unit,is_builtin,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at`,[id,name,'barbell',weight,unit,now,now]);for(const profile of inventories){await tx.runAsync(`INSERT INTO plate_inventory_profiles(id,name,unit,default_bar_id,is_builtin,created_at,updated_at) VALUES(?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at`,[profile.id,profile.name,profile.unit,profile.bar,now,now]);for(const[index,weight]of profile.plates.entries())await tx.runAsync(`INSERT INTO plate_inventory_items(id,inventory_profile_id,plate_weight,unit,quantity,enabled,display_order,created_at,updated_at) VALUES(?,?,?,?,4,1,?,?,?) ON CONFLICT(id) DO UPDATE SET plate_weight=excluded.plate_weight,updated_at=excluded.updated_at`,[`plate-${profile.unit}-${String(weight).replace('.','_')}`,profile.id,weight,profile.unit,index,now,now]);}await tx.runAsync(`INSERT INTO app_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,['plate_calculator_seed_version',String(PLATE_CALCULATOR_SEED_VERSION),now]);});}

const seeds = exercises as ExerciseSeed[];
const planSeeds = starterPlans as StarterPlanSeed[];
const videoSeeds = exerciseVideos as ExerciseVideoSeed[];
const programSeeds = programs as ProgramTemplateSeed[];

export async function seedBuiltInExercises(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    ['exercise_seed_version'],
  );
  if (Number(setting?.value ?? 0) >= EXERCISE_SEED_VERSION) return;

  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const statement = await transaction.prepareAsync(`
      INSERT INTO exercises (
        id, name, category, primary_muscles, secondary_muscles, equipment,
        exercise_type, instructions, is_builtin, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, category = excluded.category,
        primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles,
        equipment = excluded.equipment, exercise_type = excluded.exercise_type,
        instructions = excluded.instructions, updated_at = excluded.updated_at
    `);
    try {
      for (const exercise of seeds) {
        await statement.executeAsync([
          exercise.id, exercise.name, exercise.category, JSON.stringify(exercise.primaryMuscles),
          JSON.stringify(exercise.secondaryMuscles), exercise.equipment, exercise.exerciseType,
          JSON.stringify(exercise.instructions), now, now,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['exercise_seed_version', String(EXERCISE_SEED_VERSION), now],
    );
  });
}

export async function seedStarterPlans(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', ['starter_plan_seed_version'],
  );
  if (Number(setting?.value ?? 0) >= STARTER_PLAN_SEED_VERSION) return;
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const plan of planSeeds) {
      await transaction.runAsync(`INSERT INTO workout_plans
        (id, name, description, color, is_builtin, is_archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description,
          color = excluded.color, updated_at = excluded.updated_at`,
      [plan.id, plan.name, plan.description, plan.color, now, now]);
      await transaction.runAsync('DELETE FROM plan_exercises WHERE plan_id = ?', [plan.id]);
      for (const [index, item] of plan.exercises.entries()) {
        await transaction.runAsync(`INSERT INTO plan_exercises
          (id, plan_id, exercise_id, exercise_order, target_sets, target_reps_min,
           target_reps_max, target_weight, rest_seconds, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [createId('plan_exercise'), plan.id, item.exerciseId, index, item.targetSets,
          item.targetRepsMin, item.targetRepsMax, item.targetWeight, item.restSeconds, item.notes]);
      }
    }
    await transaction.runAsync(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['starter_plan_seed_version', String(STARTER_PLAN_SEED_VERSION), now]);
  });
}

/**
 * Curated default exercise videos ship as an empty seed file until real, verified YouTube links
 * are added (see DECISIONS.md). Re-running is safe: existing exercise IDs are refreshed by
 * (exercise_id, video_id), and the version key prevents re-seeding once nothing has changed.
 */
export async function seedExerciseVideos(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', ['exercise_video_seed_version'],
  );
  if (Number(setting?.value ?? 0) >= EXERCISE_VIDEO_SEED_VERSION) return;
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const orderByExercise = new Map<string, number>();
    for (const video of videoSeeds) {
      const order = orderByExercise.get(video.exerciseId) ?? 0;
      orderByExercise.set(video.exerciseId, order + 1);
      await transaction.runAsync(`INSERT INTO exercise_default_videos
        (id, exercise_id, title, video_id, channel_name, thumbnail_url, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exercise_id, video_id) DO UPDATE SET
          title = excluded.title, channel_name = excluded.channel_name,
          thumbnail_url = excluded.thumbnail_url, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
      [createId('default_video'), video.exerciseId, video.title, video.videoId, video.channelName, video.thumbnailUrl, order, now, now]);
    }
    await transaction.runAsync(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['exercise_video_seed_version', String(EXERCISE_VIDEO_SEED_VERSION), now]);
  });
}

/**
 * Built-in programs (DECISIONS.md #45) link to workout_plans by ID, so this must run after
 * seedStarterPlans. Weeks/days are fully deleted and re-inserted each time the version bumps —
 * simpler than diffing, and safe because built-in programs are never user-edited. `is_favorite`
 * and `is_builtin` are deliberately absent from the ON CONFLICT update so a user's favorite choice
 * survives a reseed.
 */
export async function seedBuiltInPrograms(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', ['program_seed_version'],
  );
  if (Number(setting?.value ?? 0) >= PROGRAM_SEED_VERSION) return;
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const program of programSeeds) {
      await transaction.runAsync(`INSERT INTO program_templates
        (id, name, description, category, goal, difficulty, duration_weeks, days_per_week,
         estimated_session_minutes, equipment_level, is_builtin, is_featured, is_archived, version, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description,
          category = excluded.category, goal = excluded.goal, difficulty = excluded.difficulty,
          duration_weeks = excluded.duration_weeks, days_per_week = excluded.days_per_week,
          estimated_session_minutes = excluded.estimated_session_minutes, equipment_level = excluded.equipment_level,
          is_featured = excluded.is_featured, notes = excluded.notes, updated_at = excluded.updated_at`,
      [program.id, program.name, program.description, program.category, program.goal, program.difficulty,
        program.durationWeeks, program.daysPerWeek, program.estimatedSessionMinutes, program.equipmentLevel,
        program.isFeatured ? 1 : 0, program.notes, now, now]);
      await transaction.runAsync('DELETE FROM program_weeks WHERE program_id = ?', [program.id]);
      for (const week of program.weeks) {
        const weekId = createId('program_week');
        await transaction.runAsync(`INSERT INTO program_weeks
          (id, program_id, week_number, title, focus, notes, is_deload, is_assessment, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [weekId, program.id, week.weekNumber, week.title, week.focus, week.notes,
          week.isDeload ? 1 : 0, week.isAssessment ? 1 : 0, now, now]);
        for (const [index, day] of program.days.entries()) {
          await transaction.runAsync(`INSERT INTO program_days
            (id, program_week_id, day_number, day_label, plan_id, workout_type, is_rest_day, is_optional,
             notes, display_order, estimated_duration_minutes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [createId('program_day'), weekId, day.dayNumber, day.dayLabel, day.planId, day.workoutType,
            day.isRestDay ? 1 : 0, day.isOptional ? 1 : 0, day.notes, index, day.estimatedDurationMinutes, now, now]);
        }
      }
    }
    await transaction.runAsync(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['program_seed_version', String(PROGRAM_SEED_VERSION), now]);
  });
}
