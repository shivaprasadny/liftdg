export const programDifficulties = ['beginner', 'intermediate', 'advanced', 'all_levels'] as const;
export type ProgramDifficulty = (typeof programDifficulties)[number];

export const programDifficultyLabels: Record<ProgramDifficulty, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', all_levels: 'All Levels',
};
