<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import FeaturedTweet from '$lib/components/FeaturedTweet.svelte';
  import FeedNavigation from '$lib/components/FeedNavigation.svelte';
  import { getCurrentFeaturedTweet, checkAndRotateDaily, initializeFeaturedTweet } from '$lib/utils/featuredTweet.js';
  
  let tweets = [];
  let featuredTweet = null;
  let loading = true;
  let loadingMore = false;
  let hasMore = true;
  let error = '';
  let lastTweetId = null;
  
  // FeedNavigation state
  let searchTerm = '';
  let sortOrder: 'newest' | 'oldest' | 'shuffle' = 'newest';
  let shuffledTweets = [];
  let theme: 'dark' | 'light' = 'dark';
  
  const TWEETS_PER_PAGE = 20;
  
  onMount(async () => {
    // Load saved theme preference
    loadThemePreference();
    
    // Initialize featured tweet system and check for daily rotation
    await loadFeaturedTweet();
    await loadTweets();
    setupInfiniteScroll();
  });

  function loadThemePreference() {
    if (typeof window === 'undefined') return;
    
    const savedTheme = localStorage.getItem('feed-theme') as 'dark' | 'light';
    if (savedTheme) {
      theme = savedTheme;
      applyTheme(theme);
    }
  }

  function applyTheme(newTheme: 'dark' | 'light') {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    if (newTheme === 'light') {
      // Light theme
      root.style.setProperty('--bg-primary', 'rgb(255, 255, 255)');
      root.style.setProperty('--bg-secondary', 'rgb(247, 249, 249)');
      root.style.setProperty('--text-primary', 'rgb(15, 20, 25)');
      root.style.setProperty('--text-secondary', 'rgb(83, 100, 113)');
      root.style.setProperty('--border-color', 'rgb(207, 217, 222)');
      root.style.setProperty('--hover-bg', 'rgba(15, 20, 25, 0.03)');
      
      // Navigation specific
      root.style.setProperty('--nav-bg', 'rgba(255, 255, 255, 0.85)');
      root.style.setProperty('--nav-bg-mobile', 'rgba(255, 255, 255, 0.95)');
      root.style.setProperty('--search-bg', 'rgba(247, 249, 249, 0.5)');
      root.style.setProperty('--search-bg-focus', 'rgba(247, 249, 249, 0.8)');
      
      // Featured tweet
      root.style.setProperty('--featured-bg', 'rgb(255, 255, 255)');
      root.style.setProperty('--featured-border', 'rgb(207, 217, 222)');
      
      // Tweet content
      root.style.setProperty('--tweet-name-color', 'rgb(15, 20, 25)');
      root.style.setProperty('--tweet-handle-color', 'rgb(83, 100, 113)');
      root.style.setProperty('--tweet-body-color', 'rgb(15, 20, 25)');
      root.style.setProperty('--tweet-time-color', 'rgb(83, 100, 113)');
      root.style.setProperty('--tweet-metrics-color', 'rgb(83, 100, 113)');
    } else {
      // Dark theme (default)
      root.style.setProperty('--bg-primary', 'rgb(0, 0, 0)');
      root.style.setProperty('--bg-secondary', 'rgb(22, 24, 28)');
      root.style.setProperty('--text-primary', 'rgb(231, 233, 234)');
      root.style.setProperty('--text-secondary', 'rgb(113, 118, 123)');
      root.style.setProperty('--border-color', 'rgb(47, 51, 54)');
      root.style.setProperty('--hover-bg', 'rgba(231, 233, 234, 0.03)');
      
      // Navigation specific
      root.style.setProperty('--nav-bg', 'rgba(0, 0, 0, 0.85)');
      root.style.setProperty('--nav-bg-mobile', 'rgba(0, 0, 0, 0.95)');
      root.style.setProperty('--search-bg', 'rgba(0, 0, 0, 0.5)');
      root.style.setProperty('--search-bg-focus', 'rgba(0, 0, 0, 0.8)');
      
      // Featured tweet
      root.style.setProperty('--featured-bg', 'rgb(0, 0, 0)');
      root.style.setProperty('--featured-border', 'rgb(47, 51, 54)');
      
      // Tweet content
      root.style.setProperty('--tweet-name-color', 'rgb(231, 233, 234)');
      root.style.setProperty('--tweet-handle-color', 'rgb(113, 118, 123)');
      root.style.setProperty('--tweet-body-color', 'rgb(231, 233, 234)');
      root.style.setProperty('--tweet-time-color', 'rgb(113, 118, 123)');
      root.style.setProperty('--tweet-metrics-color', 'rgb(113, 118, 123)');
    }
  }

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

  async function loadTweets(append = false, searchQuery = '', sortOverride = '') {
    if (append) {
      loadingMore = true;
    } else {
      loading = true;
    }
    
    try {
      let query = supabase
        .from('tweets')
        .select('*');

      // Determine sort order - use override if provided, otherwise use current sortOrder
      const currentSort = sortOverride || sortOrder;
      
      // Apply sorting at database level
      if (currentSort === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (currentSort === 'shuffle') {
        // For shuffle, we'll get all tweets and shuffle client-side
        query = query.order('created_at', { ascending: false });
      } else {
        // newest (default)
        query = query.order('created_at', { ascending: false });
      }

      // If searching, search across content and don't apply normal restrictions
      if (searchQuery) {
        query = query.or(`markdown_content.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
        // Don't limit results for search - we want all matches
        // Don't exclude featured tweet from search results
      } else {
        // Normal browsing: apply pagination limit and exclude featured tweet
        if (currentSort !== 'shuffle') {
          query = query.limit(TWEETS_PER_PAGE);
        }
        
        if (featuredTweet) {
          query = query.neq('id', featuredTweet.id);
        }
        
        // For pagination, load tweets relative to the last one
        if (append && lastTweetId && currentSort !== 'shuffle') {
          const { data: lastTweet } = await supabase
            .from('tweets')
            .select('created_at')
            .eq('id', lastTweetId)
            .single();
          
          if (lastTweet) {
            if (currentSort === 'oldest') {
              query = query.gt('created_at', lastTweet.created_at);
            } else {
              query = query.lt('created_at', lastTweet.created_at);
            }
          }
        }
      }

      const { data, error: fetchError } = await query;

      console.log('Loaded tweets with sort:', currentSort, 'Count:', data?.length); // Debug log

      if (fetchError) {
        console.error('Search error:', fetchError);
        throw fetchError;
      }

      let processedData = data || [];
      
      // Handle shuffle after getting all data
      if (currentSort === 'shuffle' && !searchQuery) {
        processedData = [...processedData].sort(() => Math.random() - 0.5);
        // For shuffle, load all tweets at once, no pagination
        hasMore = false;
        lastTweetId = null;
      }

      if (append && !searchQuery && currentSort !== 'shuffle') {
        tweets = [...tweets, ...processedData];
      } else {
        tweets = processedData;
      }

      // Check if we have more tweets to load (only for non-search, non-shuffle)
      if (!searchQuery && currentSort !== 'shuffle') {
        hasMore = (processedData?.length || 0) === TWEETS_PER_PAGE;
        
        // Update lastTweetId for pagination
        if (processedData && processedData.length > 0) {
          lastTweetId = processedData[processedData.length - 1].id;
        }
      } else {
        // For search or shuffle, we loaded all results
        hasMore = false;
        if (searchQuery || currentSort === 'shuffle') {
          lastTweetId = null;
        }
      }

      // Generate shuffled version when tweets are loaded (only for non-search, non-shuffle)
      if (!searchQuery && currentSort !== 'shuffle') {
        generateShuffledTweets();
      }

    } catch (err) {
      console.error('Error fetching tweets:', err);
      error = 'Failed to load tweets';
    } finally {
      loading = false;
      loadingMore = false;
    }
  }

  function generateShuffledTweets() {
    // Create a shuffled copy of tweets
    shuffledTweets = [...tweets].sort(() => Math.random() - 0.5);
  }

  function setupInfiniteScroll() {
    function handleScroll() {
      // Only enable infinite scroll when not searching and using newest sort
      if (loadingMore || !hasMore || searchTerm || sortOrder !== 'newest') return;
      
      const scrollPercentage = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      
      if (scrollPercentage >= 0.9) {
        loadTweets(true, ''); // Empty string for no search
      }
    }

    window.addEventListener('scroll', handleScroll);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }

  // FeedNavigation event handlers
  function handleSearch(event: CustomEvent<{ searchTerm: string }>) {
    const newSearchTerm = event.detail.searchTerm;
    const wasSearching = searchTerm.length > 0;
    const isNowSearching = newSearchTerm.length > 0;
    
    searchTerm = newSearchTerm;
    
    // Always reload when search term changes
    if (isNowSearching) {
      console.log('Searching for:', searchTerm); // Debug log
      loadTweets(false, searchTerm);
    } else if (wasSearching && !isNowSearching) {
      // Cleared search - reload normal feed
      console.log('Clearing search, loading normal feed'); // Debug log
      lastTweetId = null;
      hasMore = true;
      loadTweets(false, '');
    }
  }

  function handleSort(event: CustomEvent<{ sortOrder: 'newest' | 'oldest' | 'shuffle' }>) {
    const newSortOrder = event.detail.sortOrder;
    sortOrder = newSortOrder;
    
    console.log('Sort changed to:', sortOrder); // Debug log
    
    // Reset pagination state
    lastTweetId = null;
    hasMore = true;
    
    // Reload tweets with new sort order
    if (searchTerm) {
      // If currently searching, maintain search but apply new sort
      loadTweets(false, searchTerm, sortOrder);
    } else {
      // Normal browsing with new sort
      loadTweets(false, '', sortOrder);
    }
  }

  function handleThemeToggle(event: CustomEvent<{ theme: 'dark' | 'light' }>) {
    theme = event.detail.theme;
    applyTheme(theme);
  }

  // Computed display tweets - now that sorting is done at DB level, just return tweets
  $: displayTweets = tweets; // Database handles all sorting now

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
<div class="twitter-feed" class:light-theme={theme === 'light'}>
  <!-- Header - Twitter style -->
  <div class="twitter-header">
    <div class="twitter-header-inner">
      <h1 class="twitter-title">Museum of Twitter</h1>
      <!-- Add admin link -->
      <a href="https://www.tiktok.com/@thejakechristie" class="twitter-admin-link tiktok-link">
        <svg class="tiktok-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      </a>
    </div>
  </div>

  <!-- Feed Navigation -->
  <FeedNavigation 
    tweets={allTweetsForNav}
    bind:searchTerm
    on:search={handleSearch}
    on:sort={handleSort}
    on:themeToggle={handleThemeToggle}
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
    {:else if displayTweets.length === 0 && !showFeaturedTweet}
      <div class="twitter-empty">
        <div class="twitter-empty-content">
          {#if searchTerm}
            <h2 class="twitter-empty-title">No tweets found</h2>
            <p class="twitter-empty-text">Try searching for something else.</p>
          {:else}
            <h2 class="twitter-empty-title">Welcome to your timeline!</h2>
            <p class="twitter-empty-text">When people you follow post, you'll see it here.</p>
            <div class="twitter-empty-actions">
              <a href="/admin/create" class="twitter-empty-btn">Create Tweet</a>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Featured Tweet (appears only when not searching) -->
      {#if showFeaturedTweet}
        <FeaturedTweet tweet={featuredTweet} />
      {/if}

      <!-- Regular Tweet Articles -->
      {#each displayTweets as tweet (tweet.id)}
        <article class="twitter-tweet-article">
          <UserTweetDisplay {tweet} clickable={true} />
        </article>
      {/each}

      <!-- Load More States (only show for newest chronological, non-search) -->
      {#if !searchTerm && sortOrder === 'newest'}
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
      {:else if searchTerm && displayTweets.length > 0}
        <!-- Search results end indicator -->
        <div class="twitter-end">
          <div class="twitter-end-content">
            <p class="twitter-end-text">End of search results</p>
            <p class="twitter-end-subtext">Found {displayTweets.length} matching tweets</p>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* CSS Custom Properties for theming */
  :global(:root) {
    --bg-primary: rgb(0, 0, 0);
    --bg-secondary: rgb(22, 24, 28);
    --text-primary: rgb(231, 233, 234);
    --text-secondary: rgb(113, 118, 123);
    --border-color: rgb(47, 51, 54);
    --hover-bg: rgba(231, 233, 234, 0.03);
    
    /* Navigation specific */
    --nav-bg: rgba(0, 0, 0, 0.85);
    --nav-bg-mobile: rgba(0, 0, 0, 0.95);
    --search-bg: rgba(0, 0, 0, 0.5);
    --search-bg-focus: rgba(0, 0, 0, 0.8);
    
    /* Featured tweet */
    --featured-bg: rgb(0, 0, 0);
    --featured-border: rgb(47, 51, 54);
    
    /* Tweet content */
    --tweet-name-color: rgb(231, 233, 234);
    --tweet-handle-color: rgb(113, 118, 123);
    --tweet-body-color: rgb(231, 233, 234);
    --tweet-time-color: rgb(113, 118, 123);
    --tweet-metrics-color: rgb(113, 118, 123);
  }

  /* Base Twitter styling */
  :global(body) {
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-size: 15px;
    line-height: 20px;
    margin: 0;
    padding: 0;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

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

  .twitter-empty-actions {
    margin-top: 20px;
  }

  .twitter-empty-btn {
    background-color: rgb(29, 155, 240);
    border: 1px solid rgba(0, 0, 0, 0);
    border-radius: 9999px;
    color: rgb(255, 255, 255);
    text-decoration: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    padding: 8px 24px;
    transition: all 0.2s ease-in-out;
    display: inline-block;
  }

  .twitter-empty-btn:hover {
    background-color: rgb(26, 140, 216);
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

  /* Light theme overrides for header - removed since we're using CSS variables now */

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
  .twitter-empty-btn:focus-visible,
  .twitter-admin-link:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: 2px;
  }

  /* Scrollbar styling for webkit browsers */
  :global(::-webkit-scrollbar) {
    width: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: var(--bg-secondary);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: rgb(62, 65, 68);
    border-radius: 3px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgb(82, 85, 88);
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