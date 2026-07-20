import { zodResolver } from '@hookform/resolvers/zod';
import { router, useFocusEffect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors'; import { spacing } from '@/constants/spacing'; import { typography } from '@/constants/typography';
import { usePlanDraft } from '@/contexts/PlanDraftContext'; import { useDatabase } from '@/hooks/useDatabase';
import { createPlan, getPlanById, updatePlan } from '@/repositories/workoutPlanRepository';
import { getUserMessage } from '@/utils/errors'; import { planMetadataSchema, type PlanMetadataValues } from '@/utils/planValidation'; import { workoutPlanSchema } from '@/utils/planValidation';
import { AppButton } from './AppButton'; import { AppInput } from './AppInput'; import { PlanColorPicker } from './PlanColorPicker'; import { PlanExerciseRow } from './PlanExerciseRow'; import { SectionHeader } from './SectionHeader';

export function WorkoutPlanForm({ mode, planId }: { mode: 'create' | 'edit'; planId?: string }) {
  const db = useDatabase(); const planDraft = usePlanDraft(); const { draft } = planDraft;
  const [loading, setLoading] = useState(mode === 'edit');
  const { control, handleSubmit, getValues, reset, formState: { errors, isSubmitting } } = useForm<PlanMetadataValues>({ resolver: zodResolver(planMetadataSchema), defaultValues: { name: draft.name, description: draft.description } });

  useEffect(() => { if (mode !== 'edit' || !planId || draft.sourceId === planId) { setLoading(false); return; }
    void (async () => { try { const plan = await getPlanById(db, planId); if (!plan) throw new Error('Plan not found'); if (plan.isBuiltin) throw new Error('Duplicate a starter plan before editing it'); planDraft.loadPlan(plan); reset({ name: plan.name, description: plan.description ?? '' }); }
      catch (caught) { Alert.alert('Could not open plan', getUserMessage(caught)); router.back(); } finally { setLoading(false); } })();
  }, [db, draft.sourceId, mode, planDraft, planId, reset]);

  useFocusEffect(useCallback(() => { reset({ name: draft.name, description: draft.description }); }, [draft.description, draft.name, reset]));
  const sync = () => { const metadata = getValues(); planDraft.setMetadata({ ...metadata, color: draft.color }); };
  const save = async (metadata: PlanMetadataValues) => { try { const input = workoutPlanSchema.parse({ name: metadata.name, description: metadata.description || null, color: draft.color,
      exercises: draft.exercises.map(({ exercise: _exercise, draftId: _draftId, ...item }) => item) });
    const plan = mode === 'edit' && planId ? await updatePlan(db, { id: planId, ...input }) : await createPlan(db, input);
    planDraft.reset(); router.replace({ pathname: '/plans/[id]', params: { id: plan.id } });
  } catch (caught) { Alert.alert('Could not save plan', getUserMessage(caught, caught instanceof Error ? caught.message : 'Check the plan targets and try again.')); } };
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Controller control={control} name="name" render={({ field }) => <AppInput label="Plan name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.name?.message} />} />
    <Controller control={control} name="description" render={({ field }) => <AppInput label="Description (optional)" multiline value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.description?.message} />} />
    <PlanColorPicker value={draft.color} onChange={(color) => planDraft.setMetadata({ ...getValues(), color })} />
    <View style={styles.sectionRow}><SectionHeader>{`Exercises (${draft.exercises.length})`}</SectionHeader><AppButton label="Add Exercises" variant="secondary" onPress={() => { sync(); router.push('/plans/select-exercises'); }} /></View>
    {draft.exercises.length === 0 ? <Text style={styles.empty}>Add at least one exercise to save this plan.</Text> : draft.exercises.map((item, index) =>
      <PlanExerciseRow key={item.draftId} item={item} index={index} total={draft.exercises.length}
        onChange={(patch) => planDraft.updateExercise(item.draftId, patch)} onRemove={() => planDraft.removeExercise(item.draftId)} onMove={(direction) => planDraft.moveExercise(index, direction)} />)}
    <AppButton label={mode === 'edit' ? 'Save Changes' : 'Create Plan'} loading={isSubmitting} onPress={handleSubmit(save)} />
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', padding: spacing.xl } });
