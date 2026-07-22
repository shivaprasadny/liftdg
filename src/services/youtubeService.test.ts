import { describe, expect, it } from 'vitest';

import {
  buildExerciseSearchQuery, buildYouTubeAppDeepLink, buildYouTubeEmbedUrl, buildYouTubeSearchUrl,
  buildYouTubeThumbnailUrl, buildYouTubeWatchUrl, extractYouTubeVideoId,
  isValidYouTubeUrl,
} from './youtubeService';

const VIDEO_ID = 'dQw4w9WgXcQ';

describe('extractYouTubeVideoId', () => {
  it('extracts the ID from a standard watch URL', () => expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID));
  it('extracts the ID from a watch URL with extra query params before v=', () => expect(extractYouTubeVideoId(`https://www.youtube.com/watch?list=PL123&v=${VIDEO_ID}`)).toBe(VIDEO_ID));
  it('extracts the ID from a shortened youtu.be URL', () => expect(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID));
  it('extracts the ID from a Shorts URL', () => expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID));
  it('extracts the ID from an embed URL', () => expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBe(VIDEO_ID));
  it('extracts the ID from a mobile (m.youtube.com) URL', () => expect(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID));
  it('trims surrounding whitespace before matching', () => expect(extractYouTubeVideoId(`  https://youtu.be/${VIDEO_ID}  `)).toBe(VIDEO_ID));
  it('returns null for a non-YouTube URL', () => expect(extractYouTubeVideoId('https://vimeo.com/12345')).toBeNull());
  it('returns null for an empty or garbage string', () => { expect(extractYouTubeVideoId('')).toBeNull(); expect(extractYouTubeVideoId('not a url')).toBeNull(); });
});

describe('isValidYouTubeUrl', () => {
  it('is true for a recognizable YouTube URL', () => expect(isValidYouTubeUrl(`https://youtu.be/${VIDEO_ID}`)).toBe(true));
  it('is false for anything else', () => expect(isValidYouTubeUrl('https://example.com/video')).toBe(false));
});

describe('URL builders', () => {
  it('builds a canonical watch URL', () => expect(buildYouTubeWatchUrl(VIDEO_ID)).toBe(`https://www.youtube.com/watch?v=${VIDEO_ID}`));
  it('builds an embed URL suitable for the IFrame player', () => expect(buildYouTubeEmbedUrl(VIDEO_ID)).toContain(`/embed/${VIDEO_ID}`));
  it('builds a thumbnail URL with no API key required', () => expect(buildYouTubeThumbnailUrl(VIDEO_ID)).toBe(`https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`));
  it('builds a YouTube app deep link', () => expect(buildYouTubeAppDeepLink(VIDEO_ID)).toContain(VIDEO_ID));
  it('builds a URL-encoded search URL', () => expect(buildYouTubeSearchUrl('Bench Press Proper Form')).toBe('https://www.youtube.com/results?search_query=Bench%20Press%20Proper%20Form'));
  it('builds the "{Exercise} Proper Form" search query', () => expect(buildExerciseSearchQuery('Bench Press')).toBe('Bench Press Proper Form'));
});
