import { useLocalSearchParams } from 'expo-router'; import { WorkoutPlanForm } from '@/components/WorkoutPlanForm';
export default function EditPlanScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <WorkoutPlanForm mode="edit" planId={id} />; }
