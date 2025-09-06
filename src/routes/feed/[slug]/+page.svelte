<!-- src/routes/feed/[slug]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import { onMount } from 'svelte';

  let tweet = null;
  let loading = true;
  let errorMessage = '';
  let allTweets = [];
  let currentIndex = -1;

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
      goto(`/feed/${prevTweet.slug}`);
    }
  }

  function goToNext() {
    if (currentIndex < allTweets.length - 1) {
      const nextTweet = allTweets[currentIndex + 1];
      goto(`/feed/${nextTweet.slug}`);
    }
  }

  function goBackToFeed() {
    goto('/feed');
  }

  // Update when slug changes (for navigation)
  $: if (slug && tweet && tweet.slug !== slug) {
    loadTweet();
  }
</script>

<svelte:head>
  <title>{tweet ? `${tweet.title} - Tweet Feed` : 'Tweet'}</title>
  {#if tweet}
    <meta name="description" content={tweet.title} />
  {/if}
</svelte:head>

<div class="tweet-page-container">
  <!-- Header with Navigation -->
  <header class="tweet-page-header">
    <div class="tweet-page-header-content">
      <!-- Back Button -->
      <button 
        class="tweet-nav-button tweet-back-button"
        on:click={goBackToFeed}
        aria-label="Back to feed"
      >
        <svg class="tweet-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>

      <!-- Title -->
      <h1 class="tweet-page-title">Tweet</h1>

      <!-- Navigation Buttons -->
      <div class="tweet-page-nav">
        <button 
          class="tweet-nav-button tweet-prev-button"
          on:click={goToPrevious}
          disabled={currentIndex <= 0}
          aria-label="Previous tweet"
        >
          <svg class="tweet-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          class="tweet-nav-button tweet-next-button"
          on:click={goToNext}
          disabled={currentIndex >= allTweets.length - 1}
          aria-label="Next tweet"
        >
          <svg class="tweet-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Content -->
  <main class="tweet-page-main">
    {#if loading}
      <div class="tweet-page-loading">
        <div class="tweet-page-loading-spinner"></div>
        <p class="tweet-page-loading-text">Loading tweet...</p>
      </div>
    {:else if errorMessage}
      <div class="tweet-page-error">
        <div class="tweet-page-error-content">
          <h2 class="tweet-page-error-title">Tweet not found</h2>
          <p class="tweet-page-error-text">{errorMessage}</p>
          <button
            class="tweet-page-error-button"
            on:click={goBackToFeed}
          >
            Back to feed
          </button>
        </div>
      </div>
    {:else if tweet}
      <!-- Tweet Content -->
      <div class="tweet-page-content">
        <UserTweetDisplay {tweet} clickable={false} showFullContext={true} />
      </div>


    {/if}
  </main>
</div>

<style>
  /* Page Container */
  .tweet-page-container {
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: #ffffff;
  }

  /* Header Styles */
  .tweet-page-header {
    position: sticky;
    top: 0;
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e1e8ed;
    z-index: 10;
  }

  .tweet-page-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    gap: 16px;
  }

  .tweet-page-title {
    font-size: 20px;
    font-weight: bold;
    color: #0f1419;
    margin: 0;
    flex: 1;
    text-align: center;
  }

  /* Navigation Buttons */
  .tweet-nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background-color: transparent;
    color: #536471;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tweet-nav-button:hover:not(:disabled) {
    background-color: #f7f9fa;
    color: #0f1419;
  }

  .tweet-nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tweet-nav-icon {
    width: 20px;
    height: 20px;
  }

  .tweet-back-button {
    /* Back button specific styling */
  }

  .tweet-page-nav {
    display: flex;
    gap: 8px;
  }

  /* Main Content */
  .tweet-page-main {
    min-height: calc(100vh - 61px);
  }

  .tweet-page-content {
    padding: 16px;
  }

  /* Loading State */
  .tweet-page-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
  }

  .tweet-page-loading-spinner {
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

  .tweet-page-loading-text {
    margin-top: 16px;
    color: #536471;
    font-size: 15px;
  }

  /* Error State */
  .tweet-page-error {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
  }

  .tweet-page-error-content {
    text-align: center;
    max-width: 400px;
  }

  .tweet-page-error-title {
    font-size: 24px;
    font-weight: bold;
    color: #0f1419;
    margin: 0 0 12px 0;
  }

  .tweet-page-error-text {
    color: #536471;
    font-size: 15px;
    margin: 0 0 24px 0;
    line-height: 1.4;
  }

  .tweet-page-error-button {
    background-color: #1d9bf0;
    color: white;
    border: none;
    border-radius: 20px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .tweet-page-error-button:hover {
    background-color: #1a8cd8;
  }

  /* Info Section - Removed */

  /* Responsive Design */
  @media (max-width: 640px) {
    .tweet-page-container {
      max-width: 100%;
    }
    
    .tweet-page-header-content {
      padding: 8px 12px;
    }
    
    .tweet-page-content {
      padding: 12px;
    }
    
    .tweet-page-title {
      font-size: 18px;
    }
  }

  /* Focus styles for accessibility */
  .tweet-nav-button:focus {
    outline: 2px solid #1d9bf0;
    outline-offset: 2px;
  }

  .tweet-page-error-button:focus {
    outline: 2px solid #1d9bf0;
    outline-offset: 2px;
  }
</style>