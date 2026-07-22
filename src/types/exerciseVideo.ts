/** Curated/seeded video, never user-editable. See src/data/exerciseVideos.json. */
export interface ExerciseDefaultVideo {
  id: string;
  exerciseId: string;
  title: string;
  videoId: string;
  channelName: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** A user's own saved video for one exercise: addable, renamable, favoritable, reorderable, deletable. */
export interface ExerciseSavedVideo {
  id: string;
  exerciseId: string;
  videoId: string;
  title: string;
  channelName: string | null;
  thumbnailUrl: string | null;
  youtubeUrl: string;
  isFavorite: boolean;
  sortOrder: number;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Seed-file shape for src/data/exerciseVideos.json; matches the seed pattern used for exercises/starter plans. */
export interface ExerciseVideoSeed {
  exerciseId: string;
  title: string;
  videoId: string;
  channelName: string | null;
  thumbnailUrl: string | null;
}

export interface SaveVideoInput {
  exerciseId: string;
  videoId: string;
  title: string;
  channelName: string | null;
  thumbnailUrl: string | null;
  youtubeUrl: string;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
}

export interface YouTubeOEmbedResult {
  title: string;
  authorName: string;
  thumbnailUrl: string;
}
