import { AppScreen } from '@/components/AppScreen'; import { EmptyState } from '@/components/EmptyState'; import { Header } from '@/components/Header';
export default function HistoryScreen() { return <AppScreen header={<Header title="History" />}><EmptyState title="No workouts yet" message="Completed workouts will appear here after workout tracking is built." /></AppScreen>; }
