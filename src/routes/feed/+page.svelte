<!-- src/routes/feed/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  
  let tweets = [];
  let loading = true;
  let loadingMore = false;
  let hasMore = true;
  let error = '';
  let lastTweetId = null;
  
  const TWEETS_PER_PAGE = 20;
  
  onMount(async () => {
    await loadTweets();
    setupInfiniteScroll();
  });

  async function loadTweets(append = false) {
    if (append) {
      loadingMore = true;
    } else {
      loading = true;
    }
    
    try {
      let query = supabase
        .from('tweets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(TWEETS_PER_PAGE);

      // For pagination, load tweets older than the last one
      if (append && lastTweetId) {
        const { data: lastTweet } = await supabase
          .from('tweets')
          .select('created_at')
          .eq('id', lastTweetId)
          .single();
        
        if (lastTweet) {
          query = query.lt('created_at', lastTweet.created_at);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (append) {
        tweets = [...tweets, ...(data || [])];
      } else {
        tweets = data || [];
      }

      // Check if we have more tweets to load
      hasMore = (data?.length || 0) === TWEETS_PER_PAGE;
      
      // Update lastTweetId for pagination
      if (data && data.length > 0) {
        lastTweetId = data[data.length - 1].id;
      }

    } catch (err) {
      console.error('Error fetching tweets:', err);
      error = 'Failed to load tweets';
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  function setupInfiniteScroll() {
    function handleScroll() {
      if (loadingMore || !hasMore) return;
      
      const scrollPercentage = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      
      if (scrollPercentage >= 0.9) {
        loadTweets(true);
      }
    }

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }
</script>

<svelte:head>
  <title>Tweet Feed</title>
  <meta name="description" content="Latest tweets and discussions" />
</svelte:head>

<div class="feed-container">
  <!-- Minimal Header -->
  <header class="feed-header">
    <div class="feed-header-content">
      <h1 class="feed-title">Feed</h1>
      <div class="feed-stats">
        {tweets.length} tweets
      </div>
    </div>
  </header>

  <!-- Feed Content -->
  <main class="feed-main">
    {#if loading && tweets.length === 0}
      <div class="feed-loading">
        <div class="feed-loading-spinner"></div>
        <p class="feed-loading-text">Loading tweets...</p>
      </div>
    {:else if error && tweets.length === 0}
      <div class="feed-error">
        <p class="feed-error-text">{error}</p>
        <button
          type="button"
          on:click={() => loadTweets()}
          class="feed-retry-button"
        >
          Try again
        </button>
      </div>
    {:else if tweets.length === 0}
      <div class="feed-empty">
        <h3 class="feed-empty-title">No tweets yet</h3>
        <p class="feed-empty-text">Be the first to share something interesting!</p>
      </div>
    {:else}
      <!-- Tweet List -->
      <div class="feed-tweets">
        {#each tweets as tweet (tweet.id)}
          <div class="feed-tweet-item">
            <UserTweetDisplay {tweet} clickable={true} />
          </div>
        {/each}
      </div>

      <!-- Loading More Indicator -->
      {#if loadingMore}
        <div class="feed-loading-more">
          <div class="feed-loading-spinner"></div>
          <p class="feed-loading-text">Loading more tweets...</p>
        </div>
      {:else if !hasMore && tweets.length > 0}
        <div class="feed-end">
          <p class="feed-end-text">You've reached the end of the feed</p>
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  /* Feed Container */
  .feed-container {
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: #ffffff;
  }

  /* Header Styles */
  .feed-header {
    position: sticky;
    top: 0;
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e1e8ed;
    z-index: 10;
  }

  .feed-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
  }

  .feed-title {
    font-size: 20px;
    font-weight: bold;
    color: #0f1419;
    margin: 0;
  }

  .feed-stats {
    font-size: 14px;
    color: #536471;
  }

  /* Main Content */
  .feed-main {
    min-height: calc(100vh - 73px);
  }

  /* Tweet List */
  .feed-tweets {
    /* Tweet list container */
  }

  .feed-tweet-item {
    border-bottom: 1px solid #e1e8ed;
    padding: 12px 16px;
    transition: background-color 0.2s ease;
  }

  .feed-tweet-item:hover {
    background-color: #f7f9fa;
  }

  .feed-tweet-item:last-child {
    border-bottom: none;
  }

  /* Loading States */
  .feed-loading,
  .feed-loading-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .feed-loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e1e8ed;
    border-top: 3px solid #1d9bf0;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .feed-loading-text {
    margin-top: 12px;
    color: #536471;
    font-size: 15px;
  }

  /* Error State */
  .feed-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .feed-error-text {
    color: #f4212e;
    font-size: 15px;
    margin-bottom: 16px;
  }

  .feed-retry-button {
    background-color: #1d9bf0;
    color: white;
    border: none;
    border-radius: 20px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .feed-retry-button:hover {
    background-color: #1a8cd8;
  }

  /* Empty State */
  .feed-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .feed-empty-title {
    font-size: 18px;
    font-weight: bold;
    color: #0f1419;
    margin: 0 0 8px 0;
  }

  .feed-empty-text {
    color: #536471;
    font-size: 15px;
    margin: 0;
  }

  /* End of Feed */
  .feed-end {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
  }

  .feed-end-text {
    color: #536471;
    font-size: 14px;
    margin: 0;
  }

  /* Responsive Design */
  @media (max-width: 640px) {
    .feed-container {
      max-width: 100%;
    }
    
    .feed-header-content {
      padding: 12px 16px;
    }
    
    .feed-tweet-item {
      padding: 12px;
    }
  }
</style>