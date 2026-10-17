// src/routes/admin/media-cleanup/+server.js
//
// Deletes media files: uploads from an abandoned /admin/parse paste, and the
// files of a deleted tweet. Runs through the
// session-bound server client (locals.supabase), so it acts as the logged-in
// admin rather than the public anon key — the tweet-media bucket's DELETE
// policy only allows authenticated users, so an anonymous visitor can't use
// this (or the anon key directly) to wipe archive media.
import { error, json } from '@sveltejs/kit';

// Top-level object names in the bucket only (uploads never use folders):
// no path separators, no traversal. Older manual uploads kept their original
// filenames (spaces etc.), so this doesn't restrict the character set.
/** @param {unknown} name */
const isUploadName = (name) =>
  typeof name === 'string' && name.length > 0 && name.length <= 255 && !/[\\/]/.test(name) && name !== '.' && name !== '..';

export async function POST({ request, locals }) {
  const { session } = await locals.safeGetSession();
  if (!session) {
    throw error(401, 'Not authenticated');
  }

  const body = await request.json().catch(() => null);
  const files = body?.files;
  if (!Array.isArray(files) || files.length === 0 || !files.every(isUploadName)) {
    throw error(400, 'Expected { files: string[] } of upload filenames');
  }

  const { data, error: removeError } = await locals.supabase.storage.from('tweet-media').remove(files);
  if (removeError) {
    throw error(500, removeError.message);
  }

  // Storage reports success even when RLS silently blocks the delete, so
  // surface how many objects were actually removed.
  return json({ requested: files.length, removed: data?.length ?? 0 });
}
