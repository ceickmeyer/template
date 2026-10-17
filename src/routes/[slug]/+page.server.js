// src/routes/[slug]/+page.server.js
import { supabase } from '$lib/supabase.js';
import { TweetMarkdownParser } from '$lib/utils/markdownParser.js';
import { error, isHttpError } from '@sveltejs/kit';
import { TWEET_COLUMNS } from '$lib/utils/featuredTweet.js';
import { PUBLIC_CACHE } from '$lib/server/feed';

export async function load({ params, setHeaders }) {
  try {
    const { data: tweet, error: fetchError } = await supabase
      .from('tweets')
      .select(TWEET_COLUMNS)
      .eq('slug', params.slug)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw error(404, 'Tweet not found');
      }
      throw error(500, 'Failed to load tweet');
    }

    const parseResult = TweetMarkdownParser.parse(tweet.markdown_content);
    const parsedTweetData = parseResult.success ? parseResult.data : null;

    // Just the two neighbours (feed order is newest first, so "previous" is
    // the next-newer tweet) instead of fetching every tweet on every view.
    const [newer, older] = await Promise.all([
      supabase
        .from('tweets')
        .select('slug')
        .gt('created_at', tweet.created_at)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('tweets')
        .select('slug')
        .lt('created_at', tweet.created_at)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    setHeaders(PUBLIC_CACHE);
    return {
      tweet,
      parsedTweetData,
      previousSlug: newer.data?.slug ?? null,
      nextSlug: older.data?.slug ?? null
    };
  } catch (err) {
    if (isHttpError(err)) throw err;
    console.error('Server load error:', err);
    throw error(500, 'Failed to load tweet');
  }
}
