<!-- src/routes/admin/featured/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import FeaturedTweet from '$lib/components/FeaturedTweet.svelte';
  import { getCurrentFeaturedTweet, setFeaturedTweet, rotateFeaturedTweet } from '$lib/utils/featuredTweet.js';

  let tweets = [];
  let featuredTweet = null;
  let loading = true;
  let isUpdating = false;
  let successMessage = '';
  let errorMessage = '';
  let searchTerm = '';

  onMount(() => {
    loadTweets();
    loadFeaturedTweet();
  });

  async function loadTweets() {
    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('*')
        .order('created_at', { ascending: false });

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
    try {
      featuredTweet = await getCurrentFeaturedTweet();
    } catch (error) {
      console.error('Error loading featured tweet:', error);
    }
  }

  async function makeFeatured(tweetId: string) {
    isUpdating = true;
    errorMessage = '';
    successMessage = '';

    try {
      const result = await setFeaturedTweet(tweetId);
      if (result) {
        featuredTweet = result;
        successMessage = 'Tweet is now featured!';
      } else {
        throw new Error('Failed to set featured tweet');
      }
    } catch (error) {
      console.error('Error setting featured tweet:', error);
      errorMessage = 'Failed to set featured tweet';
    } finally {
      isUpdating = false;
    }
  }

  async function rotateRandom() {
    isUpdating = true;
    errorMessage = '';
    successMessage = '';

    try {
      const result = await rotateFeaturedTweet();
      if (result) {
        featuredTweet = result;
        successMessage = 'Rotated to a random unfeatured tweet!';
      } else {
        throw new Error('Failed to rotate featured tweet');
      }
    } catch (error) {
      console.error('Error rotating featured tweet:', error);
      errorMessage = 'Failed to rotate featured tweet';
    } finally {
      isUpdating = false;
    }
  }

  // Filter tweets based on search
  $: filteredTweets = tweets.filter(tweet => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tweet.title.toLowerCase().includes(term) ||
      tweet.markdown_content.toLowerCase().includes(term)
    );
  });

  // Clear messages after timeout
  $: if (successMessage) {
    setTimeout(() => successMessage = '', 5000);
  }
  $: if (errorMessage) {
    setTimeout(() => errorMessage = '', 5000);
  }
</script>

<svelte:head>
  <title>Featured Tweet Management - Admin</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Featured Tweet Management</h1>
    <p class="text-gray-600">
      Manage which tweet appears as featured on the main feed. Featured tweets rotate automatically daily at midnight EST.
    </p>
  </div>

  <!-- Current Featured Tweet -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900">Current Featured Tweet</h2>
      <button
        type="button"
        on:click={rotateRandom}
        disabled={isUpdating}
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {isUpdating ? 'Rotating...' : 'Rotate to Random'}
      </button>
    </div>

    {#if featuredTweet}
      <div class="bg-white rounded-lg shadow-lg p-6">
        <FeaturedTweet tweet={featuredTweet} />
      </div>
    {:else}
      <div class="bg-gray-50 rounded-lg p-6 text-center">
        <p class="text-gray-600 mb-4">No featured tweet currently set</p>
        <button
          type="button"
          on:click={rotateRandom}
          disabled={isUpdating}
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isUpdating ? 'Setting...' : 'Set Random Featured Tweet'}
        </button>
      </div>
    {/if}
  </div>

  <!-- Search -->
  <div class="mb-6">
    <div class="max-w-md">
      <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
        Search Tweets
      </label>
      <input
        id="search"
        type="text"
        bind:value={searchTerm}
        placeholder="Search by title or content..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <!-- Messages -->
  {#if successMessage}
    <div class="mb-6 rounded-md bg-green-50 p-4">
      <p class="text-sm text-green-800">{successMessage}</p>
    </div>
  {/if}

  {#if errorMessage}
    <div class="mb-6 rounded-md bg-red-50 p-4">
      <p class="text-sm text-red-800">{errorMessage}</p>
    </div>
  {/if}

  <!-- Tweet List -->
  {#if loading}
    <div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-sm text-gray-600">Loading tweets...</p>
    </div>
  {:else if filteredTweets.length === 0}
    <div class="text-center py-8">
      <p class="text-gray-500">No tweets found.</p>
    </div>
  {:else}
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">
        All Tweets ({filteredTweets.length})
      </h2>

      {#each filteredTweets as tweet (tweet.id)}
        <div class="bg-white rounded-lg shadow border {tweet.id === featuredTweet?.id ? 'border-yellow-300 bg-yellow-50' : ''}">
          <!-- Tweet Header -->
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div class="flex-1">
              <h3 class="text-sm font-medium text-gray-900 truncate">
                {tweet.title}
              </h3>
              <p class="text-xs text-gray-500 mt-1">
                Created: {new Date(tweet.created_at).toLocaleDateString()}
                • Slug: <code class="bg-gray-100 px-1 rounded">{tweet.slug}</code>
              </p>
            </div>

            <div class="flex items-center space-x-2 ml-4">
              {#if tweet.id === featuredTweet?.id}
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Currently Featured
                </span>
              {:else}
                <button
                  type="button"
                  on:click={() => makeFeatured(tweet.id)}
                  disabled={isUpdating}
                  class="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  {isUpdating ? 'Setting...' : 'Make Featured'}
                </button>
              {/if}

              <a
                href="/admin/tweets/{tweet.slug}"
                class="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
              >
                View
              </a>
            </div>
          </div>

          <!-- Tweet Content -->
          <div class="p-4">
            <UserTweetDisplay {tweet} clickable={false} />
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Instructions -->
  <div class="mt-8 bg-blue-50 p-4 rounded-lg">
    <h3 class="text-sm font-medium text-blue-900 mb-2">How Featured Tweets Work</h3>
    <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
      <li><strong>Automatic Rotation:</strong> Featured tweets change daily at midnight EST</li>
      <li><strong>Random Selection:</strong> The system picks unfeatured tweets randomly</li>
      <li><strong>Manual Override:</strong> Use "Make Featured" to set any tweet as today's featured tweet</li>
      <li><strong>History Tracking:</strong> Tweets won't be featured again for 30 days</li>
      <li><strong>Cycle Reset:</strong> When all tweets have been featured, the history resets automatically</li>
      <li><strong>Feed Position:</strong> Featured tweets appear at the top with a golden highlight</li>
    </ul>
  </div>
</div>