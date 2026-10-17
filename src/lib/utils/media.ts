// src/lib/utils/media.ts
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { TweetData } from './markdownParser';

// Built by hand (same URL supabase.storage.getPublicUrl() returns) so the
// public pages don't have to ship the whole Supabase client just for this.
const MEDIA_BASE = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/tweet-media/`;

export function getMediaUrl(filename: string): string {
  // Local crops not uploaded yet (the screenshot importer's live preview).
  if (filename.startsWith('blob:')) return filename;
  return MEDIA_BASE + encodeURI(filename);
}

// Uploaded videos keep a real extension (downloadImage picks it from the
// response MIME type); "-video-" is the marker /admin/parse adds to the
// filename of a captured tweet video.
export function isVideo(filename: string): boolean {
  return /\.(mp4|mov|webm|m4v)$/i.test(filename) || filename.includes('-video-');
}

/**
 * The media a link preview shows: the first item in the main post, then
 * thread replies, then the quoted tweet. `video` is set when that first
 * item is a video; `image` is the first still image anywhere.
 */
export function previewMedia(tweet: TweetData): { video: string | null; image: string | null } {
  const all = [tweet, ...(tweet.replies ?? []), ...(tweet.quote ? [tweet.quote] : [])].flatMap((post) => post.media ?? []);
  return {
    video: all[0] && isVideo(all[0]) ? all[0] : null,
    image: all.find((file) => !isVideo(file)) ?? null
  };
}
