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

<div class="tweet-page">
  <nav class="tweet-page-nav" aria-label="Post navigation">
    <button type="button" class="nav-button" on:click={goBackToFeed} aria-label="Back to timeline" title="Back">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z" />
      </svg>
    </button>

    <div class="nav-pair">
      <button type="button" class="nav-button" on:click={goToPrevious} disabled={!previousSlug} aria-label="Previous post" title="Previous">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
      </button>
      <button type="button" class="nav-button" on:click={goToNext} disabled={!nextSlug} aria-label="Next post" title="Next">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
      </button>
    </div>
  </nav>

  <main>
    <article class="tweet-card">
      <h1 class="visually-hidden">{tweet.title}</h1>
      <UserTweetDisplay {tweet} clickable={false} />
    </article>
  </main>
</div>

<style>
  /* One tweet floating as a card near the top of the page. */
  .tweet-page {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px 16px 64px;
  }

  .tweet-page-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .nav-pair {
    display: flex;
    gap: 4px;
  }

  .nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .nav-button:hover:not(:disabled) {
    background-color: var(--hover-bg);
    color: var(--text-primary);
  }

  .nav-button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .nav-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .nav-button svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .tweet-card {
    overflow: hidden;
    border: 1px solid var(--border-color);
    border-radius: 16px;
    background-color: var(--bg-primary);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.06),
      0 12px 32px rgba(0, 0, 0, 0.12);
  }

  :global(:root:not([data-theme='light'])) .tweet-card {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  @media (max-width: 500px) {
    .tweet-page {
      padding: 16px 8px 48px;
    }
  }
</style>
