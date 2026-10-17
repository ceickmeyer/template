// src/routes/og/[slug]/+server.ts
// The link-preview image (og:image) for a tweet with media.
//
// Chat apps decide the card layout from the image: Signal, for one, shows a
// roughly square image as a small thumbnail beside the text, and anything
// else full width on top (its rule: within 5% of square → thumbnail). X's
// own previews put the photo on top, so square photos are re-framed here as
// a 1200×630 card (the photo centred on a blurred copy of itself); other
// shapes are served as they are.
import sharp from 'sharp';
import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';
import { TweetMarkdownParser } from '$lib/utils/markdownParser.js';
import { getMediaUrl, previewMedia } from '$lib/utils/media';

const WIDTH = 1200;
const HEIGHT = 630;
// A little wider than Signal's 5% so near-square photos go on top too.
const SQUARE_TOLERANCE = 0.1;
// Crawlers fetch this once per link; keep it at the CDN for a week.
const CACHE = { 'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' };

export async function GET({ params, fetch }) {
  const { data: tweet } = await supabase.from('tweets').select('markdown_content').eq('slug', params.slug).maybeSingle();
  if (!tweet) error(404, 'Tweet not found');

  const parsed = TweetMarkdownParser.parse(tweet.markdown_content);
  const image = parsed.success && parsed.data ? previewMedia(parsed.data).image : null;
  if (!image) error(404, 'This tweet has no image');

  const res = await fetch(getMediaUrl(image));
  if (!res.ok) error(502, 'Image unavailable');
  const original = new Uint8Array(await res.arrayBuffer());

  const { width = 0, height = 0 } = await sharp(original).metadata();
  if (!width || !height || Math.abs(1 - width / height) >= SQUARE_TOLERANCE) {
    return new Response(original, {
      headers: { 'content-type': res.headers.get('content-type') ?? 'image/jpeg', ...CACHE }
    });
  }

  const backdrop = await sharp(original)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .blur(40)
    .modulate({ brightness: 0.5 })
    .toBuffer();
  const photo = await sharp(original).resize(HEIGHT, HEIGHT, { fit: 'inside' }).toBuffer();
  const card = await sharp(backdrop)
    .composite([{ input: photo, gravity: 'center' }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(card), { headers: { 'content-type': 'image/jpeg', ...CACHE } });
}
