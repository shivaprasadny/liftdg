import type { YouTubeOEmbedResult } from '@/types/exerciseVideo';

/** Keyless oEmbed lookup — no API key needed; used by "Add YouTube Link." */
export async function fetchYouTubeOEmbed(videoId: string): Promise<YouTubeOEmbedResult | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json() as { title?: string; author_name?: string; thumbnail_url?: string };
    if (!data.title) return null;
    return { title: data.title, authorName: data.author_name ?? 'Unknown channel', thumbnailUrl: data.thumbnail_url ?? '' };
  } catch { return null; }
}
