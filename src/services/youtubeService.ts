const VIDEO_ID_PATTERNS = [
  /(?:youtube(?:-nocookie)?\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube(?:-nocookie)?\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube(?:-nocookie)?\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
];

/** Recognizes watch/share/shorts/embed URLs across youtube.com, youtu.be, m.youtube.com, and youtube-nocookie.com. */
export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(url: string): boolean { return extractYouTubeVideoId(url) !== null; }

export function buildYouTubeWatchUrl(videoId: string): string { return `https://www.youtube.com/watch?v=${videoId}`; }
/** `rel=0`/`modestbranding=1` keep the embedded player focused on this one video. */
export function buildYouTubeEmbedUrl(videoId: string): string { return `https://www.youtube.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0`; }
export function buildYouTubeThumbnailUrl(videoId: string): string { return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }
/** iOS/Android both resolve this scheme to the installed YouTube app; callers fall back to the web URL if it fails to open. */
export function buildYouTubeAppDeepLink(videoId: string): string { return `youtube://www.youtube.com/watch?v=${videoId}`; }
export function buildYouTubeSearchUrl(query: string): string { return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`; }
export function buildExerciseSearchQuery(exerciseName: string): string { return `${exerciseName} Proper Form`; }
