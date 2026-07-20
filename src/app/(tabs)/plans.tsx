import { AppScreen } from '@/components/AppScreen'; import { EmptyState } from '@/components/EmptyState'; import { Header } from '@/components/Header';
export default function PlansScreen() { return <AppScreen header={<Header title="Plans" />}><EmptyState title="No plans yet" message="Workout plans arrive in Phase 2. Your database is ready for them." /></AppScreen>; }
