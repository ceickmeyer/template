<!-- src/routes/[slug]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import { TweetMarkdownParser } from '$lib/utils/markdownParser.js';
  import { onMount } from 'svelte';

  let tweet = null;
  let loading = true;
  let errorMessage = '';
  let allTweets = [];
  let currentIndex = -1;
  let showCopyNotification = false;
  let parsedTweetData = null;

$: if (tweet) {
  const parseResult = TweetMarkdownParser.parse(tweet.markdown_content);
  if (parseResult.success) {
    parsedTweetData = parseResult.data;
  }
}

  // Get slug from URL
  $: slug = $page.params.slug;

  onMount(async () => {
    await loadTweet();
    await loadAllTweets();
  });

  async function loadTweet() {
    loading = true;
    errorMessage = '';

    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          errorMessage = 'Tweet not found';
        } else {
          throw error;
        }
        return;
      }

      tweet = data;

    } catch (error) {
      console.error('Error loading tweet:', error);
      errorMessage = 'Failed to load tweet';
    } finally {
      loading = false;
    }
  }

  async function loadAllTweets() {
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('id, slug, title, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      allTweets = data || [];
      
      // Find current tweet index
      if (tweet) {
        currentIndex = allTweets.findIndex(t => t.slug === tweet.slug);
      }

    } catch (error) {
      console.error('Error loading all tweets:', error);
    }
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      const prevTweet = allTweets[currentIndex - 1];
      goto(`/${prevTweet.slug}`);
    }
  }

  function goToNext() {
    if (currentIndex < allTweets.length - 1) {
      const nextTweet = allTweets[currentIndex + 1];
      goto(`/${nextTweet.slug}`);
    }
  }

  function goBackToFeed() {
    goto('/');
  }



  // Update when slug changes (for navigation) - FIXED
  $: if (slug) {
    loadTweetAndUpdateIndex();
  }

  async function loadTweetAndUpdateIndex() {
    await loadTweet();
    // Update the current index after loading the new tweet
    if (tweet && allTweets.length > 0) {
      currentIndex = allTweets.findIndex(t => t.slug === tweet.slug);
    }
  }
</script>

<svelte:head>
  <title>{tweet ? `${tweet.title} / Museum of Twitter` : 'Post / Museum of Twitter'}</title>
  {#if tweet && parsedTweetData}
    <meta name="description" content={parsedTweetData.body} />
    
    <!-- Open Graph tags for Discord/social previews -->
    <meta property="og:title" content="{parsedTweetData.name} (@{parsedTweetData.handle})" />
    <meta property="og:description" content="{parsedTweetData.body}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="{$page.url}" />
    <meta property="og:site_name" content="Museum of Twitter" />
    
    {#if parsedTweetData.media && parsedTweetData.media.length > 0}
      <meta property="og:image" content="{parsedTweetData.media[0]}" />
      <meta property="og:image:alt" content="Media from {parsedTweetData.name}'s tweet" />
    {:else if parsedTweetData.avatar}
      <meta property="og:image" content="{parsedTweetData.avatar}" />
      <meta property="og:image:alt" content="{parsedTweetData.name}'s avatar" />
    {/if}
    
    <!-- Twitter Card tags (also used by Discord) -->
    <meta name="twitter:card" content={parsedTweetData.media?.length ? "summary_large_image" : "summary"} />
    <meta name="twitter:title" content="{parsedTweetData.name} (@{parsedTweetData.handle})" />
    <meta name="twitter:description" content="{parsedTweetData.body}" />
    
    {#if parsedTweetData.media && parsedTweetData.media.length > 0}
      <meta name="twitter:image" content="{parsedTweetData.media[0]}" />
    {:else if parsedTweetData.avatar}
      <meta name="twitter:image" content="{parsedTweetData.avatar}" />
    {/if}
  {/if}
</svelte:head>

<!-- Twitter-style single tweet page -->
<div class="twitter-tweet-page">
  <!-- Header with Navigation -->
  <header class="twitter-tweet-header">
    <div class="twitter-tweet-header-inner">
      <!-- Back Button -->
      <button 
        class="twitter-nav-button twitter-back-button"
        on:click={goBackToFeed}
        aria-label="Back to timeline"
      >
        <svg class="twitter-nav-icon" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/>
        </svg>
      </button>

      <!-- Title -->
      <h1 class="twitter-tweet-title">Post</h1>

      <!-- Navigation Buttons -->
      <div class="twitter-tweet-nav">
        <button 
          class="twitter-nav-button twitter-prev-button"
          on:click={goToPrevious}
          disabled={currentIndex <= 0}
          aria-label="Previous post"
        >
          <svg class="twitter-nav-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        
        <button 
          class="twitter-nav-button twitter-next-button"
          on:click={goToNext}
          disabled={currentIndex >= allTweets.length - 1}
          aria-label="Next post"
        >
          <svg class="twitter-nav-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>


      </div>
    </div>
  </header>

  <!-- Copy Notification -->
  {#if showCopyNotification}
    <div class="copy-notification">
      <div class="copy-notification-content">
        <svg class="copy-notification-icon" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L5.53 12.7a.996.996 0 10-1.41 1.41L9 19l10.88-10.88a.996.996 0 10-1.41-1.41L9 16.17z"/>
        </svg>
        Link copied to clipboard
      </div>
    </div>
  {/if}

  <!-- Content -->
  <main class="twitter-tweet-main">
    {#if loading}
      <div class="twitter-tweet-loading">
        <div class="twitter-spinner"></div>
      </div>
    {:else if errorMessage}
      <div class="twitter-tweet-error">
        <div class="twitter-tweet-error-content">
          <h2 class="twitter-tweet-error-title">Something went wrong</h2>
          <p class="twitter-tweet-error-text">{errorMessage}</p>
          <button
            class="twitter-retry-btn"
            on:click={goBackToFeed}
          >
            Back to timeline
          </button>
        </div>
      </div>
    {:else if tweet}
      <!-- Tweet Content -->
      <article class="twitter-tweet-content">
        <UserTweetDisplay {tweet} clickable={false} />
      </article>
    {/if}
  </main>
</div>

<style>
  /* Base Twitter styling - matches feed page */
  :global(body) {
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: rgb(0, 0, 0);
    color: rgb(231, 233, 234);
    font-size: 15px;
    line-height: 20px;
    margin: 0;
    padding: 0;
  }

  /* Page Container */
  .twitter-tweet-page {
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: rgb(0, 0, 0);
    border-left: 1px solid rgb(47, 51, 54);
    border-right: 1px solid rgb(47, 51, 54);
    position: relative;
  }

  /* Header */
  .twitter-tweet-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgb(47, 51, 54);
  }

  .twitter-tweet-header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 53px;
    gap: 16px;
  }

  .twitter-tweet-title {
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
    color: rgb(231, 233, 234);
    margin: 0;
    flex: 1;
    text-align: center;
  }

  /* Navigation Buttons */
  .twitter-nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background-color: transparent;
    color: rgb(231, 233, 234);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .twitter-nav-button:hover:not(:disabled) {
    background-color: rgba(231, 233, 234, 0.1);
  }

  .twitter-nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .twitter-nav-icon {
    width: 20px;
    height: 20px;
  }

  .twitter-tweet-nav {
    display: flex;
    gap: 8px;
  }

  /* Main Content */
  .twitter-tweet-main {
    min-height: calc(100vh - 53px);
  }

  .twitter-tweet-content {
    /* Tweet content container - no padding since UserTweetDisplay handles it */
  }

  /* Loading State */
  .twitter-tweet-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px 20px;
    min-height: 200px;
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

  /* Error State */
  .twitter-tweet-error {
    padding: 32px 16px;
    text-align: center;
  }

  .twitter-tweet-error-content {
    max-width: 320px;
    margin: 0 auto;
  }

  .twitter-tweet-error-title {
    font-size: 31px;
    font-weight: 800;
    line-height: 36px;
    color: rgb(231, 233, 234);
    margin: 0 0 8px 0;
  }

  .twitter-tweet-error-text {
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

  /* Responsive design */
  @media (max-width: 688px) {
    .twitter-tweet-page {
      border-left: none;
      border-right: none;
    }
    
    .twitter-tweet-header-inner {
      padding: 0 12px;
    }
    
    .twitter-tweet-title {
      font-size: 18px;
    }
  }

  /* Focus and accessibility */
  .twitter-nav-button:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: 2px;
  }

  .twitter-retry-btn:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: 2px;
  }
</style>