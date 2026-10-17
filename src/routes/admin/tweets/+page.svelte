<!-- src/routes/admin/tweets/+page.svelte -->
<script lang="ts">
  import { supabase } from '$lib/supabase.js';
  import { onMount } from 'svelte';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import type { StoredTweet } from '$lib/types/tweet';

  let tweets: StoredTweet[] = [];
  let loading = true;
  let error = '';
  let searchTerm = '';
  let sortBy: 'newest' | 'oldest' | 'title' = 'newest';

  onMount(loadTweets);

  async function loadTweets() {
    loading = true;
    error = '';
    try {
      const column = sortBy === 'title' ? 'title' : 'created_at';
      const { data, error: fetchError } = await supabase
        .from('tweets')
        .select('*')
        .order(column, { ascending: sortBy !== 'newest' });

      if (fetchError) throw fetchError;
      tweets = data || [];
    } catch (err) {
      console.error('Error fetching tweets:', err);
      error = 'Failed to load tweets';
    } finally {
      loading = false;
    }
  }

  $: term = searchTerm.trim().toLowerCase();
  $: filteredTweets = term
    ? tweets.filter(
        (tweet) => tweet.title.toLowerCase().includes(term) || tweet.markdown_content.toLowerCase().includes(term)
      )
    : tweets;
</script>

<svelte:head>
  <title>Tweets — Museum of Twitter Admin</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
  <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Tweets</h1>
      {#if !loading && !error}
        <p class="mt-1 text-sm text-gray-500">{tweets.length} archived</p>
      {/if}
    </div>
    <div class="flex gap-2">
      <a href="/admin/parse" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Import from X
      </a>
      <a href="/admin/create" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Write markdown
      </a>
    </div>
  </div>

  {#if tweets.length > 0}
    <div class="mb-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row">
      <div class="flex-1">
        <label for="search" class="mb-1 block text-sm font-medium text-gray-700">Search</label>
        <input
          id="search"
          type="search"
          bind:value={searchTerm}
          placeholder="Title or content…"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div class="sm:w-48">
        <label for="sort" class="mb-1 block text-sm font-medium text-gray-700">Sort by</label>
        <select
          id="sort"
          bind:value={sortBy}
          on:change={loadTweets}
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
    </div>
    {#if term}
      <p class="-mt-3 mb-4 text-sm text-gray-600">
        Showing {filteredTweets.length} of {tweets.length}
        <button type="button" on:click={() => (searchTerm = '')} class="ml-2 text-blue-600 hover:text-blue-800">Clear</button>
      </p>
    {/if}
  {/if}

  {#if loading}
    <div class="py-12 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      <p class="mt-2 text-sm text-gray-600">Loading tweets…</p>
    </div>
  {:else if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-4">
      <p class="text-sm text-red-800">{error}</p>
      <button type="button" on:click={loadTweets} class="mt-2 text-sm text-red-700 underline hover:text-red-900">Try again</button>
    </div>
  {:else if tweets.length === 0}
    <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h2 class="text-sm font-medium">No tweets yet</h2>
      <p class="mt-1 text-sm text-gray-500">Import one from X or write one in markdown to get started.</p>
    </div>
  {:else if filteredTweets.length === 0}
    <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h2 class="text-sm font-medium">No matches</h2>
      <p class="mt-1 text-sm text-gray-500">
        Nothing matches "{searchTerm}".
        <button type="button" on:click={() => (searchTerm = '')} class="text-blue-600 hover:text-blue-800">Clear search</button>
      </p>
    </div>
  {:else}
    <ul class="space-y-4">
      {#each filteredTweets as tweet (tweet.id)}
        <li class="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div class="flex items-center justify-between gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div class="min-w-0">
              <h2 class="truncate text-sm font-medium">{tweet.title}</h2>
              <p class="text-xs text-gray-500">
                {new Date(tweet.created_at).toLocaleDateString()} ·
                <code class="rounded bg-gray-200 px-1">{tweet.slug}</code>
              </p>
            </div>
            <div class="flex shrink-0 gap-2">
              <a
                href="/{tweet.slug}"
                target="_blank"
                rel="noopener"
                class="rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                Public ↗
              </a>
              <a href="/admin/tweets/{tweet.slug}" class="rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">
                Details
              </a>
              <a href="/admin/tweets/{tweet.slug}/edit" class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">
                Edit
              </a>
            </div>
          </div>
          <UserTweetDisplay {tweet} clickable={false} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
