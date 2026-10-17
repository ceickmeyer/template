<!-- src/routes/admin/featured/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import FeaturedTweet from '$lib/components/FeaturedTweet.svelte';
  import { getCurrentFeaturedTweet, setFeaturedTweet, rotateFeaturedTweet } from '$lib/utils/featuredTweet.js';
  import type { StoredTweet } from '$lib/types/tweet';

  let tweets: StoredTweet[] = [];
  let featuredTweet: StoredTweet | null = null;
  let loading = true;
  // id of the tweet being featured, or 'random' for a rotation
  let updating: string | null = null;
  let successMessage = '';
  let errorMessage = '';
  let searchTerm = '';

  onMount(() => {
    loadTweets();
    loadFeaturedTweet();
  });

  async function loadTweets() {
    try {
      const { data, error } = await supabase.from('tweets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      tweets = data || [];
    } catch (error) {
      console.error('Error loading tweets:', error);
      errorMessage = 'Failed to load tweets';
    } finally {
      loading = false;
    }
  }

  async function loadFeaturedTweet() {
    featuredTweet = await getCurrentFeaturedTweet();
  }

  async function makeFeatured(tweetId: string) {
    updating = tweetId;
    errorMessage = '';
    successMessage = '';

    const result = await setFeaturedTweet(tweetId);
    if (result) {
      featuredTweet = result;
      successMessage = 'Tweet is now featured.';
    } else {
      errorMessage = 'Failed to set featured tweet';
    }
    updating = null;
  }

  async function rotateRandom() {
    updating = 'random';
    errorMessage = '';
    successMessage = '';

    const result = await rotateFeaturedTweet();
    if (result) {
      featuredTweet = result;
      successMessage = 'Rotated to a random tweet.';
    } else {
      errorMessage = 'Failed to rotate featured tweet';
    }
    updating = null;
  }

  $: term = searchTerm.trim().toLowerCase();
  $: filteredTweets = term
    ? tweets.filter((t) => t.title.toLowerCase().includes(term) || t.markdown_content.toLowerCase().includes(term))
    : tweets;

  $: if (successMessage) setTimeout(() => (successMessage = ''), 5000);
</script>

<svelte:head>
  <title>Featured tweet — Museum of Twitter Admin</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
  <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Featured tweet</h1>
      <p class="mt-1 text-sm text-gray-600">Shown at the top of the public feed. Rotates automatically once a day (UTC).</p>
    </div>
    <button
      type="button"
      on:click={rotateRandom}
      disabled={updating !== null}
      class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {updating === 'random' ? 'Rotating…' : 'Rotate to random'}
    </button>
  </div>

  {#if successMessage}
    <div class="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{successMessage}</div>
  {/if}
  {#if errorMessage}
    <div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
  {/if}

  <section class="mb-10">
    <h2 class="mb-3 text-sm font-medium text-gray-700">Currently featured</h2>
    {#if featuredTweet}
      <div class="rounded-lg border border-gray-200 bg-white px-3 pt-4 pb-1">
        <FeaturedTweet tweet={featuredTweet} />
      </div>
    {:else}
      <div class="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
        No featured tweet is set. Use “Rotate to random” or pick one below.
      </div>
    {/if}
  </section>

  <section>
    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
      <h2 class="text-sm font-medium text-gray-700">All tweets ({filteredTweets.length})</h2>
      <div class="w-full sm:w-64">
        <label for="search" class="sr-only">Search tweets</label>
        <input
          id="search"
          type="search"
          bind:value={searchTerm}
          placeholder="Search…"
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </div>

    {#if loading}
      <div class="py-12 text-center">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    {:else if filteredTweets.length === 0}
      <p class="py-8 text-center text-sm text-gray-500">No tweets found.</p>
    {:else}
      <ul class="space-y-4">
        {#each filteredTweets as tweet (tweet.id)}
          {@const isFeatured = tweet.id === featuredTweet?.id}
          <li class="overflow-hidden rounded-lg border bg-white {isFeatured ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'}">
            <div class="flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-medium">{tweet.title}</h3>
                <p class="text-xs text-gray-500">{new Date(tweet.created_at).toLocaleDateString()}</p>
              </div>
              {#if isFeatured}
                <span class="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Featured</span>
              {:else}
                <button
                  type="button"
                  on:click={() => makeFeatured(tweet.id)}
                  disabled={updating !== null}
                  class="shrink-0 rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {updating === tweet.id ? 'Setting…' : 'Make featured'}
                </button>
              {/if}
            </div>
            <UserTweetDisplay {tweet} clickable={false} />
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <details class="mt-8 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
    <summary class="cursor-pointer font-medium">How featuring works</summary>
    <ul class="mt-3 list-disc space-y-1 pl-5 text-xs">
      <li>The first public-feed visit each UTC day picks a new random featured tweet.</li>
      <li>A tweet isn't picked again for 30 days; once every tweet has been featured, that history resets.</li>
      <li>“Make featured” overrides today's pick immediately.</li>
      <li>The featured tweet is shown above the feed with a glowing border, and hidden while searching.</li>
    </ul>
  </details>
</div>
