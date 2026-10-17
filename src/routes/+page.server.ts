// src/routes/+page.server.ts
import { error } from '@sveltejs/kit';
import { fetchTweets, PUBLIC_CACHE } from '$lib/server/feed';
import { getTodaysFeaturedTweet } from '$lib/utils/featuredTweet.js';

// The first page arrives with the HTML: no spinner, no client-side queries.
// Other sort orders, more pages and searches go through /api/tweets.
export async function load({ setHeaders }) {
  const featuredTweet = await getTodaysFeaturedTweet();
  try {
    const { tweets, hasMore } = await fetchTweets({ excludeId: featuredTweet?.id });
    setHeaders(PUBLIC_CACHE);
    return { featuredTweet, tweets, hasMore };
  } catch (err) {
    console.error('Error fetching tweets:', err);
    error(500, 'Failed to load tweets');
  }
}
