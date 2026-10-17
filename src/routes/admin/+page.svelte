<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { getCurrentFeaturedTweet } from '$lib/utils/featuredTweet.js';
  import type { StoredTweet } from '$lib/types/tweet';

  let total: number | null = null;
  let recent: Pick<StoredTweet, 'id' | 'title' | 'slug' | 'created_at'>[] = [];
  let featured: StoredTweet | null = null;

  onMount(async () => {
    const [{ count }, { data }, current] = await Promise.all([
      supabase.from('tweets').select('id', { count: 'exact', head: true }),
      supabase.from('tweets').select('id, title, slug, created_at').order('created_at', { ascending: false }).limit(5),
      getCurrentFeaturedTweet()
    ]);
    total = count;
    recent = data ?? [];
    featured = current;
  });

  const actions = [
    { href: '/admin/parse', title: 'Import from X', text: 'Paste a copied tweet (or the Tampermonkey archive JSON) and save it with its media.' },
    { href: '/admin/screenshot', title: 'Import from screenshot', text: 'Recreate a deleted tweet from a screenshot — Claude reads it, you fix anything it missed.' },
    { href: '/admin/create', title: 'Write markdown', text: 'Build a tweet by hand with the markdown format, quotes, threads and uploads.' },
    { href: '/admin/tweets', title: 'Manage tweets', text: 'Search, preview, edit and delete archived tweets.' },
    { href: '/admin/featured', title: 'Featured tweet', text: 'Pick which tweet is pinned at the top of the public feed.' }
  ];
</script>

<svelte:head>
  <title>Museum of Twitter Admin</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
  <h1 class="text-2xl font-bold">Dashboard</h1>
  <p class="mt-1 text-gray-600">
    {#if total === null}
      &nbsp;
    {:else}
      {total} tweet{total === 1 ? '' : 's'} archived{featured ? ` · featuring “${featured.title}”` : ''}
    {/if}
  </p>

  <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
    {#each actions as action}
      <a href={action.href} class="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
        <h2 class="font-semibold">{action.title}</h2>
        <p class="mt-1 text-sm text-gray-600">{action.text}</p>
      </a>
    {/each}
  </div>

  {#if recent.length > 0}
    <section class="mt-10">
      <h2 class="mb-3 text-sm font-medium text-gray-700">Recently added</h2>
      <ul class="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {#each recent as tweet (tweet.id)}
          <li class="flex items-center justify-between gap-4 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{tweet.title}</p>
              <p class="text-xs text-gray-500">{new Date(tweet.created_at).toLocaleDateString()}</p>
            </div>
            <a href="/admin/tweets/{tweet.slug}/edit" class="shrink-0 text-sm text-blue-600 hover:text-blue-800">Edit</a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
