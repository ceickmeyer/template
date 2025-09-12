<!-- src/routes/tweets/+page.svelte -->
<script lang="ts">
  import { supabase } from '$lib/supabase.js';
  import { onMount } from 'svelte';
  import TweetDisplay from '$lib/components/TweetDisplay.svelte';

  let tweets = [];
  let loading = true;
  let error = '';
  let searchTerm = '';
  let sortBy = 'newest'; // newest, oldest, title

  onMount(async () => {
    await loadTweets();
  });

  async function loadTweets() {
    loading = true;
    try {
      let query = supabase
        .from('tweets')
        .select('*');

      // Apply sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'title') {
        query = query.order('title', { ascending: true });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      tweets = data || [];
    } catch (err) {
      console.error('Error fetching tweets:', err);
      error = 'Failed to load tweets';
    } finally {
      loading = false;
    }
  }

  // Filter tweets based on search term
  $: filteredTweets = tweets.filter(tweet => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tweet.title.toLowerCase().includes(term) ||
      tweet.markdown_content.toLowerCase().includes(term)
    );
  });

  // Reload when sort changes
  $: if (sortBy) {
    loadTweets();
  }
</script>

<svelte:head>
  <title>Admin Tweet Feed</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto">
    


    <!-- Search and Filters -->
    {#if tweets.length > 0}
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
              Search tweets
            </label>
            <input
              id="search"
              type="text"
              bind:value={searchTerm}
              placeholder="Search by title or content..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <!-- Sort -->
          <div class="sm:w-48">
            <label for="sort" class="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              id="sort"
              bind:value={sortBy}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>
        
        {#if searchTerm}
          <div class="mt-2 text-sm text-gray-600">
            Showing {filteredTweets.length} of {tweets.length} tweets
            <button
              type="button"
              on:click={() => searchTerm = ''}
              class="ml-2 text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Loading State -->
    {#if loading}
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600">Loading tweets...</p>
      </div>

    <!-- Error State -->
    {:else if error}
      <div class="rounded-md bg-red-50 p-4">
        <p class="text-sm text-red-800">{error}</p>
        <button
          type="button"
          on:click={loadTweets}
          class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>

    <!-- Empty State -->
    {:else if tweets.length === 0}
      <div class="text-center bg-white rounded-lg shadow p-8">
        <h3 class="mt-2 text-sm font-medium text-gray-900">No tweets yet</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating your first tweet archive.</p>
        <div class="mt-6 flex justify-center space-x-3">
          <a
            href="/"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Tweet
          </a>
          <a
            href="admin/parse"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Parse from Clipboard
          </a>
        </div>
      </div>

    <!-- No Search Results -->
    {:else if filteredTweets.length === 0}
      <div class="text-center bg-white rounded-lg shadow p-8">
        <h3 class="mt-2 text-sm font-medium text-gray-900">No tweets found</h3>
        <p class="mt-1 text-sm text-gray-500">
          Try adjusting your search terms or 
          <button
            type="button"
            on:click={() => searchTerm = ''}
            class="text-blue-600 hover:text-blue-800"
          >
            clear the search
          </button>
        </p>
      </div>

    <!-- Tweet List -->
    {:else}
      <div class="space-y-6">
        {#each filteredTweets as tweet (tweet.id)}
          <div class="bg-white rounded-lg shadow overflow-hidden">
            
            <!-- Tweet Header with Admin Controls -->
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <h2 class="text-sm font-medium text-gray-900 truncate">
                    {tweet.title}
                  </h2>
                  <p class="text-xs text-gray-500">
                    Created: {new Date(tweet.created_at).toLocaleDateString()}
                    • Slug: <code class="text-xs bg-gray-200 px-1 rounded">{tweet.slug}</code>
                  </p>
                </div>
                
                <!-- Admin Action Buttons -->
                <div class="flex items-center space-x-2">
                  <a
                    href="/admin/tweets/{tweet.slug}"
                    class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                    title="View tweet"
                  >
                    View
                  </a>
                  <a
                    href="/admin/tweets/{tweet.slug}/edit"
                    class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded hover:bg-yellow-200"
                    title="Edit tweet"
                  >
                    Edit
                  </a>
                </div>
              </div>
            </div>
            
            <!-- Tweet Content -->
            <div class="p-4">
              <TweetDisplay {tweet} />
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Pagination info -->
      <div class="mt-8 text-center text-sm text-gray-500">
        {#if searchTerm}
          Showing {filteredTweets.length} of {tweets.length} tweets matching "{searchTerm}"
        {:else}
          Showing all {tweets.length} tweets
        {/if}
      </div>
    {/if}
  </div>
</div>