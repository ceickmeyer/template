<!-- src/routes/tweets/[slug]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase.js';
  import TweetDisplay from '$lib/components/TweetDisplay.svelte';
  import { onMount } from 'svelte';

  let tweet = null;
  let loading = true;
  let errorMessage = '';

  // Get slug from URL
  $: slug = $page.params.slug;

  onMount(async () => {
    await loadTweet();
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
</script>

<svelte:head>
  <title>{tweet ? tweet.title : 'Tweet'}</title>
  {#if tweet}
    <meta name="description" content={tweet.title} />
  {/if}
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-2xl mx-auto">
    
    {#if loading}
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600">Loading tweet...</p>
      </div>
    {:else if errorMessage}
      <div class="text-center">
        <div class="rounded-md bg-red-50 p-4 mb-6">
          <p class="text-sm text-red-800">{errorMessage}</p>
        </div>
        <a
          href="/tweets"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          ← Back to All Tweets
        </a>
      </div>
    {:else if tweet}
      
      <!-- Navigation Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <a
            href="/tweets"
            class="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
          >
            ← Back to All Tweets
          </a>
          <h1 class="text-xl font-bold text-gray-900">{tweet.title}</h1>
          <p class="text-sm text-gray-500">
            Created: {new Date(tweet.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <div class="flex space-x-3">
          <a
            href="/tweets/{tweet.slug}/edit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Edit Tweet
          </a>
        </div>
      </div>

      <!-- Tweet Display -->
      <div class="mb-8">
        <TweetDisplay {tweet} />
      </div>

      <!-- Additional Actions -->
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-sm font-medium text-gray-900 mb-3">Actions</h3>
        <div class="flex space-x-3">
          <a
            href="/tweets/{tweet.slug}/edit"
            class="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Edit Tweet
          </a>
          
          <button
            type="button"
            on:click={() => navigator.clipboard?.writeText(tweet.markdown_content)}
            class="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Copy Markdown
          </button>
          
          <button
            type="button"
            on:click={() => navigator.clipboard?.writeText(window.location.href)}
            class="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Copy Link
          </button>
        </div>
      </div>

      <!-- Raw Markdown (Debug) -->
      <details class="mt-6 bg-gray-50 rounded-lg p-4">
        <summary class="text-sm font-medium text-gray-700 cursor-pointer">
          View Raw Markdown
        </summary>
        <pre class="mt-3 text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap font-mono">{tweet.markdown_content}</pre>
      </details>

    {/if}
  </div>
</div>