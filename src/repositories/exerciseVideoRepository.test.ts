import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it, vi } from 'vitest';

import { reorderSavedVideos, saveVideo, toggleFavoriteVideo } from './exerciseVideoRepository';

describe('toggleFavoriteVideo', () => {
  it('clears every favorite for the exercise, then sets only the target when it was not already favorite', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { getFirstAsync: vi.fn(async () => ({ is_favorite: 0 })), runAsync } as unknown as SQLiteDatabase;
    const db = { withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction) } as unknown as SQLiteDatabase;

    await toggleFavoriteVideo(db, 'exercise-1', 'video-2');

    expect(runAsync).toHaveBeenNthCalledWith(1, expect.stringContaining('is_favorite = 0'), expect.arrayContaining(['exercise-1']));
    expect(runAsync).toHaveBeenNthCalledWith(2, expect.stringContaining('is_favorite = 1'), expect.arrayContaining(['video-2']));
  });

  it('only clears favorites (does not re-set) when the target was already the favorite — a tap toggles it off', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { getFirstAsync: vi.fn(async () => ({ is_favorite: 1 })), runAsync } as unknown as SQLiteDatabase;
    const db = { withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction) } as unknown as SQLiteDatabase;

    await toggleFavoriteVideo(db, 'exercise-1', 'video-2');

    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenCalledWith(expect.stringContaining('is_favorite = 0'), expect.arrayContaining(['exercise-1']));
  });
});

describe('reorderSavedVideos', () => {
  it('persists sort_order matching each id\'s new position, scoped to the exercise', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { runAsync } as unknown as SQLiteDatabase;
    const db = { withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction) } as unknown as SQLiteDatabase;

    await reorderSavedVideos(db, 'exercise-1', ['video-b', 'video-a', 'video-c']);

    expect(runAsync).toHaveBeenNthCalledWith(1, expect.stringContaining('sort_order'), [0, expect.any(String), 'video-b', 'exercise-1']);
    expect(runAsync).toHaveBeenNthCalledWith(2, expect.stringContaining('sort_order'), [1, expect.any(String), 'video-a', 'exercise-1']);
    expect(runAsync).toHaveBeenNthCalledWith(3, expect.stringContaining('sort_order'), [2, expect.any(String), 'video-c', 'exercise-1']);
  });
});

describe('saveVideo', () => {
  it('rejects saving the same video twice for the same exercise', async () => {
    const db = { getFirstAsync: vi.fn(async () => ({ id: 'existing-row' })) } as unknown as SQLiteDatabase;
    await expect(saveVideo(db, { exerciseId: 'exercise-1', videoId: 'abc', title: 'Test', channelName: null, thumbnailUrl: null, youtubeUrl: 'https://youtube.com/watch?v=abc' }))
      .rejects.toThrow('already saved');
  });
});
