// src/lib/utils/featuredTweet.js
import { supabase } from '$lib/supabase.js';

// The tweet columns any page actually renders — not the unused parsed_json etc.
export const TWEET_COLUMNS = 'id, slug, title, markdown_content, created_at';

/** @typedef {import('$lib/types/tweet').StoredTweet} StoredTweet */

// `tweets (...)` joins through a foreign key, so it's one row — the
// untyped client infers an array.
/** @param {unknown} joined @returns {StoredTweet | null} */
const asTweet = (joined) => /** @type {StoredTweet | null} */ (joined ?? null);

/**
 * Get the current featured tweet
 * @returns {Promise<StoredTweet | null>}
 */
export async function getCurrentFeaturedTweet() {
  try {
    // Newest row rather than .single(): two rotations at once can briefly
    // leave two rows, and .single() erroring on that rotated yet again.
    const { data, error } = await supabase
      .from('current_featured_tweet')
      .select(`tweets (${TWEET_COLUMNS})`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return asTweet(data?.tweets);
  } catch (error) {
    console.error('Error getting current featured tweet:', error);
    return null;
  }
}

/**
 * Ids of tweets that haven't been featured recently (last 30 days)
 */
export async function getUnfeaturedTweets() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentlyFeatured, error: historyError } = await supabase
      .from('featured_tweet_history')
      .select('tweet_id')
      .gte('featured_date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (historyError) throw historyError;

    const excludeIds = recentlyFeatured?.map(item => item.tweet_id) || [];

    let query = supabase.from('tweets').select('id');

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: unfeaturedTweets, error } = await query;

    if (error) throw error;

    // If no unfeatured tweets, reset history and return all tweets
    if (!unfeaturedTweets || unfeaturedTweets.length === 0) {
      console.log('No unfeatured tweets found, resetting history...');
      await resetFeaturedHistory();
      
      const { data: allTweets, error: allError } = await supabase.from('tweets').select('id');

      if (allError) throw allError;
      return allTweets || [];
    }

    return unfeaturedTweets;
  } catch (error) {
    console.error('Error getting unfeatured tweets:', error);
    return [];
  }
}

/**
 * Reset featured tweet history (when all tweets have been featured)
 */
export async function resetFeaturedHistory() {
  try {
    const { error } = await supabase
      .from('featured_tweet_history')
      .delete()
      .neq('tweet_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) throw error;
    console.log('Featured tweet history reset');
  } catch (error) {
    console.error('Error resetting featured history:', error);
  }
}

/**
 * Rotate to a new featured tweet (automatic daily rotation)
 * @returns {Promise<StoredTweet | null>}
 */
export async function rotateFeaturedTweet() {
  try {
    const unfeaturedTweets = await getUnfeaturedTweets();
    
    if (unfeaturedTweets.length === 0) {
      console.log('No tweets available for featuring');
      return null;
    }

    // Select random unfeatured tweet
    const randomIndex = Math.floor(Math.random() * unfeaturedTweets.length);
    const selectedTweet = unfeaturedTweets[randomIndex];

    return await setFeaturedTweet(selectedTweet.id);
  } catch (error) {
    console.error('Error rotating featured tweet:', error);
    return null;
  }
}

/**
 * Manually set a tweet as featured
 * @param {string} tweetId
 * @returns {Promise<StoredTweet | null>}
 */
export async function setFeaturedTweet(tweetId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Start transaction-like operations
    // 1. Add to history
    const { error: historyError } = await supabase
      .from('featured_tweet_history')
      .upsert({
        tweet_id: tweetId,
        featured_date: today
      }, {
        onConflict: 'tweet_id,featured_date'
      });

    if (historyError) throw historyError;

    // 2. Update current featured tweet (delete old, insert new)
    const { error: deleteError } = await supabase
      .from('current_featured_tweet')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('current_featured_tweet')
      .insert({
        tweet_id: tweetId,
        featured_since: today
      });

    if (insertError) throw insertError;

    // 3. Get the updated featured tweet
    const featuredTweet = await getCurrentFeaturedTweet();
    
    console.log('Featured tweet updated:', featuredTweet?.title);
    return featuredTweet;
  } catch (error) {
    console.error('Error setting featured tweet:', error);
    return null;
  }
}

/**
 * Today's featured tweet, rotating first if the current one is from an
 * earlier day (or there is none). One query when no rotation is due.
 * Runs on the server when the homepage renders.
 * @returns {Promise<StoredTweet | null>}
 */
export async function getTodaysFeaturedTweet() {
  try {
    const { data, error } = await supabase
      .from('current_featured_tweet')
      .select(`featured_since, tweets (${TWEET_COLUMNS})`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const current = asTweet(data?.tweets);
    if (current && data?.featured_since >= today) return current;

    return (await rotateFeaturedTweet()) ?? current;
  } catch (error) {
    console.error("Error loading today's featured tweet:", error);
    return null;
  }
}
