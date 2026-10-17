// src/lib/utils/tweetAdmin.ts
import { supabase } from '$lib/supabase.js';
import { TweetMarkdownParser, type TweetData } from '$lib/utils/markdownParser';
import type { StoredTweet } from '$lib/types/tweet';

// Every storage file a tweet's markdown points at, including its quote and
// replies (the old delete only looked at the top-level avatar/media).
export function referencedMediaFiles(markdown: string): string[] {
  const result = TweetMarkdownParser.parse(markdown);
  if (!result.success || !result.data) return [];

  const files = new Set<string>();
  const visit = (tweet: TweetData | undefined) => {
    if (!tweet) return;
    if (tweet.avatar) files.add(tweet.avatar);
    tweet.media?.forEach((file) => files.add(file));
    visit(tweet.quote);
    tweet.replies?.forEach(visit);
  };
  visit(result.data);
  return [...files];
}

// Deletes storage files through /admin/media-cleanup, which acts with the
// logged-in admin's session — the tweet-media bucket's DELETE policy only
// allows authenticated users, so the browser's anon client can't do it.
export async function deleteMediaFiles(files: string[]): Promise<{ requested: number; removed: number }> {
  if (files.length === 0) return { requested: 0, removed: 0 };

  const response = await fetch('/admin/media-cleanup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ files })
  });
  if (!response.ok) throw new Error(`Media cleanup failed (${response.status}): ${await response.text()}`);
  return response.json();
}

export async function deleteTweet(tweet: Pick<StoredTweet, 'id' | 'markdown_content'>) {
  const files = referencedMediaFiles(tweet.markdown_content);

  // featured_tweet_history / current_featured_tweet reference tweets(id)
  // without ON DELETE CASCADE, so deleting a tweet that has ever been
  // featured fails on the foreign key unless these rows go first.
  for (const table of ['current_featured_tweet', 'featured_tweet_history']) {
    const { error } = await supabase.from(table).delete().eq('tweet_id', tweet.id);
    if (error) throw error;
  }

  const { error } = await supabase.from('tweets').delete().eq('id', tweet.id);
  if (error) throw error;

  // Media last, so a failed row delete never leaves a tweet pointing at
  // missing files. A cleanup failure here only leaves orphaned files.
  try {
    const { requested, removed } = await deleteMediaFiles(files);
    if (removed < requested) {
      console.warn(`Deleted ${removed} of ${requested} media files for tweet ${tweet.id}.`);
    }
  } catch (err) {
    console.error('Tweet deleted, but its media could not be removed:', err);
  }
}
