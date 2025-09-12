// src/routes/[slug]/+page.server.js
import { supabase } from '$lib/supabase.js';
import { TweetMarkdownParser } from '$lib/utils/markdownParser.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const { slug } = params;

  try {
    const { data: tweet, error: fetchError } = await supabase
      .from('tweets')
      .select('*')
      .eq('slug', slug)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw error(404, 'Tweet not found');
      }
      throw error(500, 'Failed to load tweet');
    }

    // Parse tweet data server-side
    const parseResult = TweetMarkdownParser.parse(tweet.markdown_content);
    const parsedTweetData = parseResult.success ? parseResult.data : null;

    // Get all tweets for navigation
    const { data: allTweets, error: allTweetsError } = await supabase
      .from('tweets')
      .select('id, slug, title, created_at')
      .order('created_at', { ascending: false });

    if (allTweetsError) {
      console.error('Error loading all tweets:', allTweetsError);
    }

    const currentIndex = allTweets ? allTweets.findIndex(t => t.slug === tweet.slug) : -1;

    return {
      tweet,
      parsedTweetData,
      allTweets: allTweets || [],
      currentIndex
    };

  } catch (err) {
    console.error('Server load error:', err);
    throw error(500, 'Failed to load tweet');
  }
}