<!-- src/routes/admin/tweets/[slug]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import type { StoredTweet } from '$lib/types/tweet';

  let tweet: StoredTweet | null = null;
  let loading = true;
  let errorMessage = '';
  let copied = '';

  // Reload when navigating between tweets without leaving the route.
  $: loadTweet($page.params.slug ?? '');

  async function loadTweet(slug: string) {
    loading = true;
    errorMessage = '';

    const { data, error } = await supabase.from('tweets').select('*').eq('slug', slug).single();

    if (error) {
      tweet = null;
      errorMessage = error.code === 'PGRST116' ? 'Tweet not found' : 'Failed to load tweet';
      if (error.code !== 'PGRST116') console.error('Error loading tweet:', error);
    } else {
      tweet = data;
    }
    loading = false;
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      copied = label;
      setTimeout(() => (copied = ''), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }
</script>

<svelte:head>
  <title>{tweet ? tweet.title : 'Tweet'} — Museum of Twitter Admin</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
  {#if loading}
    <div class="py-12 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      <p class="mt-2 text-sm text-gray-600">Loading tweet…</p>
    </div>
  {:else if !tweet}
    <div class="rounded-md border border-red-200 bg-red-50 p-4">
      <p class="text-sm text-red-800">{errorMessage}</p>
      <a href="/admin/tweets" class="mt-3 inline-block text-sm text-red-700 hover:text-red-900">← Back to tweets</a>
    </div>
  {:else}
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <a href="/admin/tweets" class="text-sm text-blue-600 hover:text-blue-800">← All tweets</a>
        <h1 class="mt-1 truncate text-2xl font-bold">{tweet.title}</h1>
        <p class="mt-1 text-sm text-gray-500">Created {new Date(tweet.created_at).toLocaleDateString()}</p>
      </div>
      <a href="/admin/tweets/{tweet.slug}/edit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Edit
      </a>
    </div>

    <div class="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <UserTweetDisplay {tweet} clickable={false} />
    </div>

    <div class="mb-6 flex flex-wrap gap-2">
      <a
        href="/{tweet.slug}"
        target="_blank"
        rel="noopener"
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        Open public page ↗
      </a>
      <button
        type="button"
        on:click={() => copy(`${$page.url.origin}/${tweet?.slug}`, 'link')}
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {copied === 'link' ? 'Copied!' : 'Copy public link'}
      </button>
      <button
        type="button"
        on:click={() => copy(tweet?.markdown_content ?? '', 'markdown')}
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {copied === 'markdown' ? 'Copied!' : 'Copy markdown'}
      </button>
    </div>

    <details class="rounded-lg border border-gray-200 bg-white p-4">
      <summary class="cursor-pointer text-sm font-medium text-gray-700">Raw markdown</summary>
      <pre class="mt-3 overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-xs whitespace-pre-wrap">{tweet.markdown_content}</pre>
    </details>
  {/if}
</div>
