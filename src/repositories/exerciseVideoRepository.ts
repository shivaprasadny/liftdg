import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExerciseDefaultVideo, ExerciseSavedVideo, SaveVideoInput } from '@/types/exerciseVideo';
import { AppError, toAppError } from '@/utils/errors';
import { createId } from '@/utils/ids';

interface DefaultVideoRow { id: string; exercise_id: string; title: string; video_id: string; channel_name: string | null; thumbnail_url: string | null; sort_order: number; created_at: string; updated_at: string; }
interface SavedVideoRow { id: string; exercise_id: string; video_id: string; title: string; channel_name: string | null; thumbnail_url: string | null; youtube_url: string; is_favorite: number; sort_order: number; saved_at: string; created_at: string; updated_at: string; }

function mapDefault(row: DefaultVideoRow): ExerciseDefaultVideo {
  return { id: row.id, exerciseId: row.exercise_id, title: row.title, videoId: row.video_id, channelName: row.channel_name, thumbnailUrl: row.thumbnail_url, sortOrder: row.sort_order, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapSaved(row: SavedVideoRow): ExerciseSavedVideo {
  return { id: row.id, exerciseId: row.exercise_id, videoId: row.video_id, title: row.title, channelName: row.channel_name, thumbnailUrl: row.thumbnail_url, youtubeUrl: row.youtube_url, isFavorite: row.is_favorite === 1, sortOrder: row.sort_order, savedAt: row.saved_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function getDefaultVideos(db: SQLiteDatabase, exerciseId: string): Promise<ExerciseDefaultVideo[]> {
  const rows = await db.getAllAsync<DefaultVideoRow>('SELECT * FROM exercise_default_videos WHERE exercise_id = ? ORDER BY sort_order', [exerciseId]);
  return rows.map(mapDefault);
}

/** Favorite always first, then by the user's chosen order. */
export async function getSavedVideos(db: SQLiteDatabase, exerciseId: string): Promise<ExerciseSavedVideo[]> {
  const rows = await db.getAllAsync<SavedVideoRow>('SELECT * FROM exercise_saved_videos WHERE exercise_id = ? ORDER BY is_favorite DESC, sort_order', [exerciseId]);
  return rows.map(mapSaved);
}

export async function saveVideo(db: SQLiteDatabase, input: SaveVideoInput): Promise<ExerciseSavedVideo> {
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM exercise_saved_videos WHERE exercise_id = ? AND video_id = ?', [input.exerciseId, input.videoId]);
  if (existing) throw new AppError('This video is already saved for this exercise.');
  const row = await db.getFirstAsync<{ next: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM exercise_saved_videos WHERE exercise_id = ?', [input.exerciseId]);
  const id = createId('saved_video'); const now = new Date().toISOString();
  try {
    await db.runAsync(`INSERT INTO exercise_saved_videos
      (id, exercise_id, video_id, title, channel_name, thumbnail_url, youtube_url, is_favorite, sort_order, saved_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    [id, input.exerciseId, input.videoId, input.title, input.channelName, input.thumbnailUrl, input.youtubeUrl, row?.next ?? 0, now, now, now]);
  } catch (error) { throw toAppError(error, 'Could not save this video.'); }
  return { id, exerciseId: input.exerciseId, videoId: input.videoId, title: input.title, channelName: input.channelName, thumbnailUrl: input.thumbnailUrl, youtubeUrl: input.youtubeUrl, isFavorite: false, sortOrder: row?.next ?? 0, savedAt: now, createdAt: now, updatedAt: now };
}

export async function deleteSavedVideo(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM exercise_saved_videos WHERE id = ?', [id]);
}

export async function renameSavedVideo(db: SQLiteDatabase, id: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (trimmed.length < 1) throw new AppError('Enter a video title.');
  await db.runAsync('UPDATE exercise_saved_videos SET title = ?, updated_at = ? WHERE id = ?', [trimmed, new Date().toISOString(), id]);
}

/** Only one saved video per exercise can be favorite; tapping the current favorite clears it instead of leaving it stuck on. */
export async function toggleFavoriteVideo(db: SQLiteDatabase, exerciseId: string, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const current = await transaction.getFirstAsync<{ is_favorite: number }>('SELECT is_favorite FROM exercise_saved_videos WHERE id = ?', [id]);
    const now = new Date().toISOString();
    await transaction.runAsync('UPDATE exercise_saved_videos SET is_favorite = 0, updated_at = ? WHERE exercise_id = ?', [now, exerciseId]);
    if (!current || current.is_favorite !== 1) {
      await transaction.runAsync('UPDATE exercise_saved_videos SET is_favorite = 1, updated_at = ? WHERE id = ?', [now, id]);
    }
  });
}

/** Persists the user's chosen order (drag-and-drop or up/down controls); favorite still sorts first on read. */
export async function reorderSavedVideos(db: SQLiteDatabase, exerciseId: string, orderedIds: string[]): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const now = new Date().toISOString();
    for (const [index, id] of orderedIds.entries()) {
      await transaction.runAsync('UPDATE exercise_saved_videos SET sort_order = ?, updated_at = ? WHERE id = ? AND exercise_id = ?', [index, now, id, exerciseId]);
    }
  });
}
