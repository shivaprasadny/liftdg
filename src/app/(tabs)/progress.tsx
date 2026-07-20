import { AppScreen } from '@/components/AppScreen'; import { EmptyState } from '@/components/EmptyState'; import { Header } from '@/components/Header';
export default function ProgressScreen() { return <AppScreen header={<Header title="Progress" />}><EmptyState title="Progress starts with a workout" message="Your on-device statistics and records will appear here." /></AppScreen>; }
