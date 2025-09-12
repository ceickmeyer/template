<!-- src/routes/[slug]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';

  export let data;
  
  $: ({ tweet, parsedTweetData, allTweets, currentIndex } = data);

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
</script>

<svelte:head>
  <title>{tweet.title} / Museum of Twitter</title>
  
  <meta property="og:site_name" content="Museum of Twitter" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://www.museumoftwitter.com/{tweet.slug}" />
  
  {#if parsedTweetData}
    <meta name="description" content={parsedTweetData.body} />
    <meta property="og:title" content="{parsedTweetData.name} ({parsedTweetData.handle})" />
    <meta property="og:description" content="{parsedTweetData.body}" />
    <meta name="twitter:card" content={parsedTweetData.media?.length ? "summary_large_image" : "summary"} />
    <meta name="twitter:title" content="{parsedTweetData.name} ({parsedTweetData.handle})" />
    <meta name="twitter:description" content="{parsedTweetData.body}" />
    
    {#if parsedTweetData.media && parsedTweetData.media.length > 0}
      <meta property="og:image" content="https://yfjsgbekrbrhytucapha.supabase.co/storage/v1/object/public/tweet-media/{parsedTweetData.media[0]}" />
      <meta property="og:image:alt" content="Media from {parsedTweetData.name}'s tweet" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:image" content="https://yfjsgbekrbrhytucapha.supabase.co/storage/v1/object/public/tweet-media/{parsedTweetData.media[0]}" />
    {:else if parsedTweetData.avatar}
      <meta property="og:image" content="https://yfjsgbekrbrhytucapha.supabase.co/storage/v1/object/public/tweet-media/{parsedTweetData.avatar}" />
      <meta property="og:image:alt" content="{parsedTweetData.name}'s avatar" />
      <meta property="og:image:width" content="400" />
      <meta property="og:image:height" content="400" />
      <meta name="twitter:image" content="https://yfjsgbekrbrhytucapha.supabase.co/storage/v1/object/public/tweet-media/{parsedTweetData.avatar}" />
    {/if}
  {:else}
    <meta name="description" content="{tweet.title}" />
    <meta property="og:title" content="{tweet.title}" />
    <meta property="og:description" content="{tweet.title}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{tweet.title}" />
    <meta name="twitter:description" content="{tweet.title}" />
  {/if}
</svelte:head>

<div class="twitter-tweet-page">
  <header class="twitter-tweet-header">
    <div class="twitter-tweet-header-inner">
      <button 
        class="twitter-nav-button twitter-back-button"
        on:click={goBackToFeed}
        aria-label="Back to timeline"
      >
        <svg class="twitter-nav-icon" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/>
        </svg>
      </button>

      <h1 class="twitter-tweet-title">Post</h1>

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

  <main class="twitter-tweet-main">
    <article class="twitter-tweet-content">
      <UserTweetDisplay {tweet} clickable={false} />
    </article>
  </main>
</div>

<style>
  :global(body) {
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: rgb(0, 0, 0);
    color: rgb(231, 233, 234);
    font-size: 15px;
    line-height: 20px;
    margin: 0;
    padding: 0;
  }

  .twitter-tweet-page {
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: rgb(0, 0, 0);
    border-left: 1px solid rgb(47, 51, 54);
    border-right: 1px solid rgb(47, 51, 54);
    position: relative;
  }

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

  .twitter-tweet-main {
    min-height: calc(100vh - 53px);
  }

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

  .twitter-nav-button:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: 2px;
  }
</style>