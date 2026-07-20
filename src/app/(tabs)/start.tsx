import { AppScreen } from '@/components/AppScreen'; import { EmptyState } from '@/components/EmptyState'; import { Header } from '@/components/Header';
export default function StartScreen() { return <AppScreen header={<Header title="Start" />}><EmptyState title="Workout tracking is next" message="Active workouts, sets, and autosave will be implemented in Phase 3." /></AppScreen>; }
