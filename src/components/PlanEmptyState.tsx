import { EmptyState } from './EmptyState';
export function PlanEmptyState({ starter = false }: { starter?: boolean }) { return <EmptyState title={starter ? 'No starter plans found' : 'No plans yet'} message={starter ? 'Try a different search.' : 'Create a plan and add exercises from your library.'} />; }
