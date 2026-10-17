// src/lib/server/feed.ts
// Feed queries for the public homepage, run on the server so the browser
// never needs the Supabase client (or its round-trips) on public pages.
import { supabase } from '$lib/supabase.js';
import { TWEET_COLUMNS } from '$lib/utils/featuredTweet.js';
import type { StoredTweet } from '$lib/types/tweet';

export type SortOrder = 'newest' | 'oldest' | 'shuffle';
export type FeedTweet = Pick<StoredTweet, 'id' | 'slug' | 'title' | 'markdown_content' | 'created_at'>;

export const TWEETS_PER_PAGE = 20;

// Public pages are cached by Vercel's CDN for a minute and then served stale
// while one request refreshes them, so most visits never hit the function or
// the database. Edits show up within about a minute.
export const PUBLIC_CACHE = { 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400' };

// Builds a PostgREST `ilike` value safe to embed in an .or() filter: LIKE
// wildcards (% _) and backslashes are escaped so they match literally, then
// the pattern is double-quoted so commas/parentheses/dots in the search
// can't break the filter syntax.
function ilikePattern(term: string) {
  const likeEscaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const quoted = likeEscaped.replace(/[\\"]/g, (ch) => `\\${ch}`);
  return `"%${quoted}%"`;
}

/**
 * One page of the feed. Searches and shuffle return everything (shuffle
 * order is applied in the browser so a cached response isn't a fixed order);
 * newest/oldest paginate by created_at, leaving out the featured tweet.
 */
export async function fetchTweets({
  sort = 'newest',
  search = '',
  cursor = null,
  excludeId = null
}: {
  sort?: SortOrder;
  search?: string;
  cursor?: string | null;
  excludeId?: string | null;
}): Promise<{ tweets: FeedTweet[]; hasMore: boolean }> {
  let query = supabase
    .from('tweets')
    .select(TWEET_COLUMNS)
    .order('created_at', { ascending: sort === 'oldest' });

  const paginated = !search && sort !== 'shuffle';

  if (search) {
    const pattern = ilikePattern(search);
    query = query.or(`markdown_content.ilike.${pattern},title.ilike.${pattern}`);
  } else {
    if (excludeId) query = query.neq('id', excludeId);
    if (paginated) {
      query = query.limit(TWEETS_PER_PAGE);
      if (cursor) query = sort === 'oldest' ? query.gt('created_at', cursor) : query.lt('created_at', cursor);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const tweets = (data ?? []) as FeedTweet[];
  return { tweets, hasMore: paginated && tweets.length === TWEETS_PER_PAGE };
}
