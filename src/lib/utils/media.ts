// src/lib/utils/media.ts
import { supabase } from '$lib/supabase.js';

export function getMediaUrl(filename: string): string {
  return supabase.storage.from('tweet-media').getPublicUrl(filename).data.publicUrl;
}

// Uploaded videos keep a real extension (downloadImage picks it from the
// response MIME type); "-video-" is the marker /admin/parse adds to the
// filename of a captured tweet video.
export function isVideo(filename: string): boolean {
  return /\.(mp4|mov|webm|m4v)$/i.test(filename) || filename.includes('-video-');
}
