<!-- src/routes/[slug]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import { getMediaUrl, isVideo } from '$lib/utils/media';
  import { decodeHtmlEntities } from '$lib/utils/twitterTextParser.js';

  export let data;

  $: ({ tweet, parsedTweetData, previousSlug, nextSlug } = data);

  // Link-preview fields: plain decoded text, and only a still image (a
  // video file can't be an og:image).
  $: description = parsedTweetData ? decodeHtmlEntities(parsedTweetData.body) : tweet.title;
  $: previewTitle = parsedTweetData
    ? `${decodeHtmlEntities(parsedTweetData.name)} (${parsedTweetData.handle})`
    : tweet.title;
  $: previewImage = parsedTweetData?.media?.find((file: string) => !isVideo(file));
  $: ogImage = previewImage
    ? getMediaUrl(previewImage)
    : parsedTweetData?.avatar
      ? getMediaUrl(parsedTweetData.avatar)
      : null;

  function goToPrevious() {
    if (previousSlug) goto(`/${previousSlug}`);
  }

  function goToNext() {
    if (nextSlug) goto(`/${nextSlug}`);
  }

  function goBackToFeed() {
    goto('/');
  }
</script>

<svelte:head>
  <title>{tweet.title} / Museum of Twitter</title>
  <meta name="description" content={description} />
  <meta property="og:site_name" content="Museum of Twitter" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://www.museumoftwitter.com/{tweet.slug}" />
  <meta property="og:title" content={previewTitle} />
  <meta property="og:description" content={description} />
  <meta name="twitter:card" content={previewImage ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content={previewTitle} />
  <meta name="twitter:description" content={description} />
  {#if ogImage}
    <meta property="og:image" content={ogImage} />
    <meta name="twitter:image" content={ogImage} />
  {/if}
</svelte:head>

<div class="twitter-tweet-page">
  <header class="twitter-tweet-header">
    <div class="twitter-tweet-header-inner">
      <button
        type="button"
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
          type="button"
          class="twitter-nav-button twitter-prev-button"
          on:click={goToPrevious}
          disabled={!previousSlug}
          aria-label="Previous post"
        >
          <svg class="twitter-nav-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        
        <button
          type="button"
          class="twitter-nav-button twitter-next-button"
          on:click={goToNext}
          disabled={!nextSlug}
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
  .twitter-tweet-page {
    max-width: 600px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: var(--bg-primary);
    border-left: 1px solid var(--border-color);
    border-right: 1px solid var(--border-color);
    position: relative;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .twitter-tweet-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background-color: var(--nav-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.2s ease, border-color 0.2s ease;
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
    color: var(--text-primary);
    margin: 0;
    flex: 1;
    text-align: center;
    transition: color 0.2s ease;
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
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .twitter-nav-button:hover:not(:disabled) {
    background-color: var(--hover-bg);
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