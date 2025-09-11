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
  
  onMount(() => {
    loadTweets();
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
    
    // Return cleanup function
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }
</script>

<svelte:head>
  <title>Museum of Twitter</title>
  
  <meta name="description" content="Latest tweets and discussions" />
</svelte:head>

<!-- Twitter-style layout -->
<div class="twitter-feed">
  <!-- Header - Twitter style -->
  <div class="twitter-header">
    <div class="twitter-header-inner">
      <h1 class="twitter-title">Museum of Twitter</h1>
      <!-- Add admin link -->
      <a href="https://www.tiktok.com/@thejakechristie" class="twitter-admin-link">@thejakechristie</a>
    </div>
  </div>

  <!-- Feed Timeline -->
  <div class="twitter-timeline">
    {#if loading && tweets.length === 0}
      <div class="twitter-loading">
        <div class="twitter-spinner"></div>
      </div>
    {:else if error && tweets.length === 0}
      <div class="twitter-error">
        <div class="twitter-error-content">
          <h2 class="twitter-error-title">Something went wrong</h2>
          <p class="twitter-error-text">{error}</p>
          <button
            type="button"
            on:click={() => loadTweets()}
            class="twitter-retry-btn"
          >
            Try again
          </button>
        </div>
      </div>
    {:else if tweets.length === 0}
      <div class="twitter-empty">
        <div class="twitter-empty-content">
          <h2 class="twitter-empty-title">Welcome to your timeline!</h2>
          <p class="twitter-empty-text">When people you follow post, you'll see it here.</p>
          <div class="twitter-empty-actions">
            <a href="/admin/create" class="twitter-empty-btn">Create Tweet</a>
          </div>
        </div>
      </div>
    {:else}
      <!-- Tweet Articles -->
      {#each tweets as tweet (tweet.id)}
        <article class="twitter-tweet-article">
          <UserTweetDisplay {tweet} clickable={true} />
        </article>
      {/each}

      <!-- Load More States -->
      {#if loadingMore}
        <div class="twitter-loading-more">
          <div class="twitter-spinner"></div>
        </div>
      {:else if !hasMore && tweets.length > 0}
        <div class="twitter-end">
          <div class="twitter-end-content">
            <p class="twitter-end-text">You're all caught up</p>
            <p class="twitter-end-subtext">You've seen all new posts</p>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* Base Twitter styling */
  :global(body) {
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: rgb(0, 0, 0);
    color: rgb(231, 233, 234);
    font-size: 15px;
    line-height: 20px;
    margin: 0;
    padding: 0;
  }

  /* Main feed container */
  .twitter-feed {
    max-width: 600px;
    min-height: 100vh;
    margin: 0 auto;
    background-color: rgb(0, 0, 0);
    border-left: 1px solid rgb(47, 51, 54);
    border-right: 1px solid rgb(47, 51, 54);
    position: relative;
  }

  /* Header */
  .twitter-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgb(47, 51, 54);
  }

  .twitter-header-inner {
    padding: 0 16px;
    height: 53px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .twitter-title {
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
    color: rgb(231, 233, 234);
    margin: 0;
  }

  .twitter-admin-link {
    color: rgb(29, 155, 240);
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 9999px;
    transition: background-color 0.2s ease;
  }

  .twitter-admin-link:hover {
    background-color: rgba(29, 155, 240, 0.1);
  }

  /* Timeline */
  .twitter-timeline {
    min-height: calc(100vh - 53px);
  }

  /* Tweet Article */
  .twitter-tweet-article {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid rgb(47, 51, 54);
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    position: relative;
    min-height: 0;
    padding: 0;
    margin: 0;
    background-color: rgba(0, 0, 0, 0);
  }

  .twitter-tweet-article:hover {
    background-color: rgba(231, 233, 234, 0.03);
  }

  /* Loading states */
  .twitter-loading,
  .twitter-loading-more {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    min-height: 100px;
  }

  .twitter-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid rgb(47, 51, 54);
    border-top: 2px solid rgb(29, 155, 240);
    border-radius: 50%;
    animation: twitter-spin 1s linear infinite;
  }

  @keyframes twitter-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error state */
  .twitter-error {
    padding: 32px 16px;
    text-align: center;
  }

  .twitter-error-content {
    max-width: 320px;
    margin: 0 auto;
  }

  .twitter-error-title {
    font-size: 31px;
    font-weight: 800;
    line-height: 36px;
    color: rgb(231, 233, 234);
    margin: 0 0 8px 0;
  }

  .twitter-error-text {
    font-size: 15px;
    line-height: 20px;
    color: rgb(113, 118, 123);
    margin: 0 0 28px 0;
  }

  .twitter-retry-btn {
    background-color: rgb(29, 155, 240);
    border: 1px solid rgba(0, 0, 0, 0);
    border-radius: 9999px;
    color: rgb(255, 255, 255);
    cursor: pointer;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    padding: 8px 24px;
    transition: all 0.2s ease-in-out;
  }

  .twitter-retry-btn:hover {
    background-color: rgb(26, 140, 216);
  }

  /* Empty state */
  .twitter-empty {
    padding: 32px 16px;
    text-align: center;
  }

  .twitter-empty-content {
    max-width: 320px;
    margin: 0 auto;
  }

  .twitter-empty-title {
    font-size: 31px;
    font-weight: 800;
    line-height: 36px;
    color: rgb(231, 233, 234);
    margin: 0 0 8px 0;
  }

  .twitter-empty-text {
    font-size: 15px;
    line-height: 20px;
    color: rgb(113, 118, 123);
    margin: 0 0 20px 0;
  }

  .twitter-empty-actions {
    margin-top: 20px;
  }

  .twitter-empty-btn {
    background-color: rgb(29, 155, 240);
    border: 1px solid rgba(0, 0, 0, 0);
    border-radius: 9999px;
    color: rgb(255, 255, 255);
    text-decoration: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    padding: 8px 24px;
    transition: all 0.2s ease-in-out;
    display: inline-block;
  }

  .twitter-empty-btn:hover {
    background-color: rgb(26, 140, 216);
  }

  /* End of feed */
  .twitter-end {
    padding: 32px 16px;
    text-align: center;
  }

  .twitter-end-content {
    max-width: 320px;
    margin: 0 auto;
  }

  .twitter-end-text {
    font-size: 20px;
    font-weight: 700;
    line-height: 24px;
    color: rgb(231, 233, 234);
    margin: 0 0 4px 0;
  }

  .twitter-end-subtext {
    font-size: 15px;
    line-height: 20px;
    color: rgb(113, 118, 123);
    margin: 0;
  }

  /* Responsive design */
  @media (max-width: 688px) {
    .twitter-feed {
      border-left: none;
      border-right: none;
    }
    
    .twitter-header-inner {
      padding: 0 12px;
    }
  }

  /* Focus and accessibility */
  .twitter-tweet-article:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: -2px;
  }

  .twitter-retry-btn:focus-visible,
  .twitter-empty-btn:focus-visible,
  .twitter-admin-link:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: 2px;
  }

  /* Scrollbar styling for webkit browsers */
  :global(::-webkit-scrollbar) {
    width: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: rgb(22, 24, 28);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: rgb(62, 65, 68);
    border-radius: 3px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgb(82, 85, 88);
  }
</style>