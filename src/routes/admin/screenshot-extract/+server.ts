// src/routes/admin/screenshot-extract/+server.ts
//
// Admin-only: reads a tweet screenshot with Claude and returns the text
// fields and avatar/media boxes (see $lib/server/screenshotExtract).
import { error, json } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
// Dynamic, not static: a missing key then fails this request with a clear
// message instead of failing the whole build (as the Supabase vars did).
import { env } from '$env/dynamic/private';
import { extractTweetFromScreenshot } from '$lib/server/screenshotExtract';
import type { RequestHandler } from './$types';

export const config = { maxDuration: 60 };

const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

// The API's per-image limit is 5 MB; base64 is ~4/3 of that. The page
// downscales screenshots well below this before sending.
const MAX_BASE64_LENGTH = 6_800_000;

export const POST: RequestHandler = async ({ request, locals }) => {
  const { session } = await locals.safeGetSession();
  if (!session) throw error(401, 'Not authenticated');

  if (!env.ANTHROPIC_API_KEY) {
    throw error(500, 'ANTHROPIC_API_KEY is not set on the server.');
  }

  const body = await request.json().catch(() => null);
  const { data, mediaType, width, height } = body ?? {};
  if (
    typeof data !== 'string' ||
    data.length === 0 ||
    data.length > MAX_BASE64_LENGTH ||
    !MEDIA_TYPES.includes(mediaType) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw error(400, 'Expected { data: base64 image, mediaType, width, height }');
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  try {
    const result = await extractTweetFromScreenshot(client, { data, mediaType: mediaType as MediaType, width, height });
    return json(result);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw error(502, 'The Anthropic API key was rejected.');
    if (err instanceof Anthropic.RateLimitError) throw error(429, 'Rate limited by the Anthropic API — try again in a moment.');
    if (err instanceof Anthropic.APIError) throw error(502, `Anthropic API error ${err.status}: ${err.message}`);
    console.error('Screenshot extraction failed:', err);
    throw error(502, err instanceof Error ? err.message : 'Screenshot extraction failed');
  }
};
