import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { buildYouTubeAppDeepLink, buildYouTubeSearchUrl, buildYouTubeWatchUrl } from '@/services/youtubeService';

/** Tries the installed YouTube app first (deep link), falling back to the in-app browser. */
export async function openYouTubeVideoExternally(videoId: string): Promise<void> {
  const appUrl = buildYouTubeAppDeepLink(videoId);
  try {
    if (await Linking.canOpenURL(appUrl)) { await Linking.openURL(appUrl); return; }
  } catch { /* Fall through to the browser below. */ }
  await WebBrowser.openBrowserAsync(buildYouTubeWatchUrl(videoId));
}

/** Fallback for when no YouTube API key is configured: hands the query off to youtube.com's own search. */
export async function openYouTubeSearchExternally(query: string): Promise<void> {
  await WebBrowser.openBrowserAsync(buildYouTubeSearchUrl(query));
}
