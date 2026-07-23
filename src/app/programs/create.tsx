import { router } from 'expo-router';

import { ProgramBuilderForm } from '@/components/ProgramBuilderForm';
import { useDatabase } from '@/hooks/useDatabase';
import { createProgram } from '@/repositories/programRepository';

export default function CreateProgramScreen() {
  const db = useDatabase();
  return <ProgramBuilderForm submitLabel="Create Program" submittingLabel="Creating Program…" errorTitle="Could not create program"
    onSubmit={async (input) => {
      const program = await createProgram(db, input);
      router.replace({ pathname: '/programs/[id]', params: { id: program.id } });
    }} />;
}
