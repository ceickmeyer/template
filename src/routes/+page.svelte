<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import FeaturedTweet from '$lib/components/FeaturedTweet.svelte';
  import FeedNavigation from '$lib/components/FeedNavigation.svelte';
  import { getCurrentFeaturedTweet, checkAndRotateDaily, initializeFeaturedTweet } from '$lib/utils/featuredTweet.js';
  
  type SortOrder = 'newest' | 'oldest' | 'shuffle';

  let tweets: any[] = [];
  let featuredTweet: any = null;
  let loading = true;
  let loadingMore = false;
  let hasMore = true;
  let error = '';
  // created_at of the last loaded tweet — the pagination cursor.
  let cursor: string | null = null;
  // Bumped on every fresh (non-append) load; responses from an older load
  // are dropped so a slow earlier search can't overwrite a newer one.
  let loadGeneration = 0;

  let searchTerm = '';
  let sortOrder: SortOrder = 'newest';

  const TWEETS_PER_PAGE = 20;
  const SORT_STORAGE_KEY = 'feed-sort-order';

  onMount(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      if (saved === 'newest' || saved === 'oldest' || saved === 'shuffle') sortOrder = saved;
    } catch {
      // storage unavailable — keep the default
    }

    (async () => {
      await loadFeaturedTweet();
      await loadTweets();
    })();

    return setupInfiniteScroll();
  });

  async function loadFeaturedTweet() {
    try {
      // Check if we need to rotate daily
      await checkAndRotateDaily();
      
      // Get current featured tweet
      featuredTweet = await getCurrentFeaturedTweet();
      
      // If no featured tweet exists, initialize the system
      if (!featuredTweet) {
        featuredTweet = await initializeFeaturedTweet();
      }
    } catch (err) {
      console.error('Error loading featured tweet:', err);
      // Don't show error to user, just continue without featured tweet
    }
  }

  // Builds a PostgREST `ilike` value safe to embed in an .or() filter: LIKE
  // wildcards (% _) and backslashes are escaped so they match literally,
  // then the pattern is double-quoted so commas/parentheses/dots in the
  // search can't break the filter syntax — searching "hello, world" used to
  // error out because the raw text was pasted straight into the filter.
  function ilikePattern(term: string) {
    const likeEscaped = term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const quoted = likeEscaped.replace(/[\\"]/g, (ch) => `\\${ch}`);
    return `"%${quoted}%"`;
  }

  function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  async function loadTweets(append = false) {
    const searchQuery = searchTerm;
    const sort = sortOrder;
    const generation = append ? loadGeneration : ++loadGeneration;

    if (append) {
      loadingMore = true;
    } else {
      loading = true;
      error = '';
      cursor = null;
    }

    try {
      let query = supabase
        .from('tweets')
        .select('*')
        .order('created_at', { ascending: sort === 'oldest' });

      if (searchQuery) {
        // Searches return every match and include the featured tweet.
        const pattern = ilikePattern(searchQuery);
        query = query.or(`markdown_content.ilike.${pattern},title.ilike.${pattern}`);
      } else {
        if (featuredTweet) query = query.neq('id', featuredTweet.id);

        if (sort !== 'shuffle') {
          query = query.limit(TWEETS_PER_PAGE);
          if (append && cursor) {
            query = sort === 'oldest' ? query.gt('created_at', cursor) : query.lt('created_at', cursor);
          }
        }
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (generation !== loadGeneration) return; // superseded by a newer load

      let page = data ?? [];
      const paginated = !searchQuery && sort !== 'shuffle';
      if (sort === 'shuffle' && !searchQuery) page = shuffle(page);

      tweets = append ? [...tweets, ...page] : page;
      hasMore = paginated && page.length === TWEETS_PER_PAGE;
      if (paginated && page.length > 0) cursor = page[page.length - 1].created_at;
    } catch (err) {
      if (generation !== loadGeneration) return;
      console.error('Error fetching tweets:', err);
      error = 'Failed to load tweets';
    } finally {
      if (generation === loadGeneration) {
        loading = false;
        loadingMore = false;
      }
    }
  }

  function setupInfiniteScroll() {
    function handleScroll() {
      // Both chronological orders paginate; search and shuffle load everything at once.
      if (loading || loadingMore || !hasMore || searchTerm || sortOrder === 'shuffle') return;

      const scrollPercentage = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPercentage >= 0.9) loadTweets(true);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }

  function handleSearch(event: CustomEvent<{ searchTerm: string }>) {
    if (event.detail.searchTerm === searchTerm) return;
    searchTerm = event.detail.searchTerm;
    loadTweets();
  }

  function handleSort(event: CustomEvent<{ sortOrder: SortOrder }>) {
    sortOrder = event.detail.sortOrder;
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortOrder);
    } catch {
      // storage unavailable — sort still applies for this visit
    }
    loadTweets();
  }

  // Show featured tweet only when not searching
  $: showFeaturedTweet = !searchTerm && featuredTweet;

  // For FeedNavigation component - when searching, show actual count from database
  $: allTweetsForNav = searchTerm ? tweets : (featuredTweet ? [featuredTweet, ...tweets] : tweets);
</script>

<svelte:head>
  <title>Museum of Twitter</title>
  <meta name="description" content="Latest tweets and discussions" />
</svelte:head>

<!-- Twitter-style layout -->
<div class="twitter-feed">
  <!-- Header - Twitter style -->
  <div class="twitter-header">
    <div class="twitter-header-inner">
      <h1 class="twitter-title">Museum of Twitter</h1>
      <a
        href="https://www.tiktok.com/@thejakechristie"
        class="twitter-admin-link tiktok-link"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok: @thejakechristie"
      >
        <svg class="tiktok-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      </a>
    </div>
  </div>

  <!-- Feed Navigation -->
  <FeedNavigation
    tweets={allTweetsForNav}
    {sortOrder}
    on:search={handleSearch}
    on:sort={handleSort}
  />

  <!-- Feed Timeline -->
  <div class="twitter-timeline">
    {#if loading && tweets.length === 0}
      <div class="twitter-loading">
        <div class="twitter-spinner"></div>
      </div>
    {:else if error && tweets.length === 0}
      <div class="twitter-error">
        <div class="twitter-error-content">
          <h2 class="twitter-error-title">Something went wrong</h2>
          <p class="twitter-error-text">{error}</p>
          <button
            type="button"
            on:click={() => loadTweets()}
            class="twitter-retry-btn"
          >
            Try again
          </button>
        </div>
      </div>
    {:else if tweets.length === 0 && !showFeaturedTweet}
      <div class="twitter-empty">
        <div class="twitter-empty-content">
          {#if searchTerm}
            <h2 class="twitter-empty-title">No tweets found</h2>
            <p class="twitter-empty-text">Try searching for something else.</p>
          {:else}
            <h2 class="twitter-empty-title">Nothing here yet</h2>
            <p class="twitter-empty-text">No tweets have been archived yet.</p>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Featured Tweet (appears only when not searching) -->
      {#if showFeaturedTweet}
        <FeaturedTweet tweet={featuredTweet} />
      {/if}

      <!-- Regular Tweet Articles -->
      {#each tweets as tweet (tweet.id)}
        <article class="twitter-tweet-article">
          <UserTweetDisplay {tweet} clickable={true} />
        </article>
      {/each}

      <!-- Load more states (chronological browsing only; search and shuffle load everything) -->
      {#if !searchTerm && sortOrder !== 'shuffle'}
        {#if loadingMore}
          <div class="twitter-loading-more">
            <div class="twitter-spinner"></div>
          </div>
        {:else if !hasMore && (tweets.length > 0 || showFeaturedTweet)}
          <div class="twitter-end">
            <div class="twitter-end-content">
              <p class="twitter-end-text">You're all caught up</p>
              <p class="twitter-end-subtext">You've seen all new posts</p>
            </div>
          </div>
        {/if}
      {:else if searchTerm && tweets.length > 0}
        <!-- Search results end indicator -->
        <div class="twitter-end">
          <div class="twitter-end-content">
            <p class="twitter-end-text">End of search results</p>
            <p class="twitter-end-subtext">Found {tweets.length} matching tweets</p>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* Main feed container */
  .twitter-feed {
    max-width: 600px;
    min-height: 100vh;
    margin: 0 auto;
    background-color: var(--bg-primary);
    border-left: 1px solid var(--border-color);
    border-right: 1px solid var(--border-color);
    position: relative;
    transition: background-color 0.2s ease;
  }

  /* Header */
  .twitter-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background-color: var(--nav-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
  }

  .twitter-header-inner {
    padding: 0 16px;
    height: 53px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .twitter-title {
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
    color: var(--text-primary);
    margin: 0;
  }

  .twitter-admin-link {
    color: rgb(29, 155, 240);
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 9999px;
    transition: background-color 0.2s ease;
  }

  .twitter-admin-link:hover {
    background-color: rgba(29, 155, 240, 0.1);
  }

  /* Timeline */
  .twitter-timeline {
    min-height: calc(100vh - 53px);
  }

  /* Tweet Article */
  .twitter-tweet-article {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    position: relative;
    min-height: 0;
    padding: 0;
    margin: 0;
    background-color: transparent;
  }

  .twitter-tweet-article:hover {
    background-color: var(--hover-bg);
  }

  /* Loading states */
  .twitter-loading,
  .twitter-loading-more {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    min-height: 100px;
  }

  .twitter-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--border-color);
    border-top: 2px solid rgb(29, 155, 240);
    border-radius: 50%;
    animation: twitter-spin 1s linear infinite;
  }

  @keyframes twitter-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error state */
  .twitter-error {
    padding: 32px 16px;
    text-align: center;
  }

  .twitter-error-content {
    max-width: 320px;
    margin: 0 auto;
  }

  .twitter-error-title {
    font-size: 31px;
    font-weight: 800;
    line-height: 36px;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .twitter-error-text {
    font-size: 15px;
    line-height: 20px;
    color: var(--text-secondary);
    margin: 0 0 28px 0;
  }

  .twitter-retry-btn {
    background-color: rgb(29, 155, 240);
    border: 1px solid rgba(0, 0, 0, 0);
    border-radius: 9999px;
    color: rgb(255, 255, 255);
    cursor: pointer;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    padding: 8px 24px;
    transition: all 0.2s ease-in-out;
  }

  .twitter-retry-btn:hover {
    background-color: rgb(26, 140, 216);
  }

  /* Empty state */
  .twitter-empty {
    padding: 32px 16px;
    text-align: center;
  }

  .twitter-empty-content {
    max-width: 320px;
    margin: 0 auto;
  }

  .twitter-empty-title {
    font-size: 31px;
    font-weight: 800;
    line-height: 36px;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .twitter-empty-text {
    font-size: 15px;
    line-height: 20px;
    color: var(--text-secondary);
    margin: 0 0 20px 0;
  }

  /* End of feed */
  .twitter-end {
    padding: 32px 16px;
    text-align: center;
  }

  .twitter-end-content {
    max-width: 320px;
    margin: 0 auto;
  }

  .twitter-end-text {
    font-size: 20px;
    font-weight: 700;
    line-height: 24px;
    color: var(--text-primary);
    margin: 0 0 4px 0;
  }

  .twitter-end-subtext {
    font-size: 15px;
    line-height: 20px;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Responsive design */
  @media (max-width: 688px) {
    .twitter-feed {
      border-left: none;
      border-right: none;
    }
    
    .twitter-header-inner {
      padding: 0 12px;
    }
  }

  /* Focus and accessibility */
  .twitter-tweet-article:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: -2px;
  }

  .twitter-retry-btn:focus-visible,
  .twitter-admin-link:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: 2px;
  }

  .tiktok-link {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tiktok-icon {
    flex-shrink: 0;
  }
</style>