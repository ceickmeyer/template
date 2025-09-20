<!-- src/lib/components/FeedNavigation.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let tweets: any[] = [];
  export let searchTerm: string = '';
  
  const dispatch = createEventDispatcher<{
    search: { searchTerm: string };
    sort: { sortOrder: 'newest' | 'oldest' | 'shuffle' };
    themeToggle: { theme: 'dark' | 'light' };
  }>();
  
  let sortOrder: 'newest' | 'oldest' | 'shuffle' = 'newest';
  let theme: 'dark' | 'light' = 'dark';
  let isSearchExpanded = false;
  let searchInput: HTMLInputElement;
  let isMobile = false;
  
  // Check if we're on mobile
  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 640;
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Load saved preferences
    loadPreferences();
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });
  
  function loadPreferences() {
    if (typeof window === 'undefined') return;
    
    const savedSortOrder = localStorage.getItem('feed-sort-order') as 'newest' | 'oldest' | 'shuffle';
    const savedTheme = localStorage.getItem('feed-theme') as 'dark' | 'light';
    
    if (savedSortOrder) {
      sortOrder = savedSortOrder;
    }
    
    if (savedTheme) {
      theme = savedTheme;
    }
  }
  
  function savePreferences() {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('feed-sort-order', sortOrder);
    localStorage.setItem('feed-theme', theme);
  }
  
  function handleSortToggle() {
    if (sortOrder === 'newest') {
      sortOrder = 'oldest';
    } else if (sortOrder === 'oldest') {
      sortOrder = 'shuffle';
    } else {
      sortOrder = 'newest';
    }
    
    savePreferences();
    dispatch('sort', { sortOrder });
  }
  
  function handleThemeToggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    savePreferences();
    dispatch('themeToggle', { theme });
  }
  
  function handleSearchInput() {
    dispatch('search', { searchTerm });
  }
  
  function handleSearchExpand() {
    if (isMobile && !isSearchExpanded) {
      isSearchExpanded = true;
      setTimeout(() => {
        searchInput?.focus();
      }, 100);
    }
  }
  
  function handleSearchCollapse() {
    if (isMobile && isSearchExpanded && !searchTerm) {
      isSearchExpanded = false;
    }
  }
  
  function clearSearch() {
    searchTerm = '';
    handleSearchInput();
    if (isMobile) {
      isSearchExpanded = false;
    }
  }
  
  // Get filtered tweet count for display
  $: filteredCount = tweets.length; // When searching, tweets array contains all search results
  
  $: showSearchResults = searchTerm.length > 0;
</script>

<div class="feed-nav-container">
  <div class="feed-nav-inner">
    
    <!-- Left side: Theme and Sort controls -->
    <div class="feed-nav-controls">
      <!-- Theme Toggle -->
      <button
        type="button"
        class="feed-nav-button"
        on:click={handleThemeToggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {#if theme === 'dark'}
          <!-- Sun icon for light mode -->
          <svg class="feed-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        {:else}
          <!-- Moon icon for dark mode -->
          <svg class="feed-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        {/if}
      </button>
      
      <!-- Sort Toggle -->
      <button
        type="button"
        class="feed-nav-button"
        on:click={handleSortToggle}
        title={sortOrder === 'shuffle' ? 'Shuffle mode - click for chronological' : sortOrder === 'newest' ? 'Newest first - click for oldest first' : 'Oldest first - click for shuffle'}
      >
        {#if sortOrder === 'shuffle'}
          <!-- Shuffle icon -->
          <svg class="feed-nav-icon" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
          </svg>
        {:else}
          <!-- Circle with arrow indicating chronological direction -->
          <svg class="feed-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            {#if sortOrder === 'newest'}
              <!-- Up arrow for newest first -->
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14l4-4 4 4"/>
            {:else}
              <!-- Down arrow for oldest first -->
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 10l-4 4-4-4"/>
            {/if}
          </svg>
        {/if}
      </button>
    </div>
    
    <!-- Right side: Search -->
    <div class="feed-nav-search">
      {#if isMobile}
        <!-- Mobile: Collapsible search -->
        {#if isSearchExpanded}
          <div class="feed-search-expanded">
            <input
              bind:this={searchInput}
              bind:value={searchTerm}
              type="text"
              placeholder="Search tweets..."
              class="feed-search-input"
              on:input={handleSearchInput}
              on:blur={handleSearchCollapse}
            />
            {#if searchTerm}
              <button
                type="button"
                class="feed-search-clear"
                on:click={clearSearch}
              >
                <svg class="feed-nav-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
        {:else}
          <button
            type="button"
            class="feed-nav-button"
            on:click={handleSearchExpand}
            title="Search tweets"
          >
            <svg class="feed-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        {/if}
      {:else}
        <!-- Desktop: Always visible search -->
        <div class="feed-search-container">
          <div class="feed-search-wrapper">
            <svg class="feed-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              bind:value={searchTerm}
              type="text"
              placeholder="Search tweets..."
              class="feed-search-input"
              on:input={handleSearchInput}
            />
            {#if searchTerm}
              <button
                type="button"
                class="feed-search-clear"
                on:click={clearSearch}
              >
                <svg class="feed-nav-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Search results indicator -->
  {#if showSearchResults}
    <div class="feed-search-results">
      <div class="feed-search-results-inner">
        <span class="feed-search-results-text">
          Found {filteredCount} tweets matching "{searchTerm}"
        </span>
        <button
          type="button"
          class="feed-search-results-clear"
          on:click={clearSearch}
        >
          Clear search
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .feed-nav-container {
    border-bottom: 1px solid var(--border-color);
    background-color: var(--nav-bg);
    backdrop-filter: blur(12px);
  }
  
  .feed-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    min-height: 44px;
  }
  
  .feed-nav-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .feed-nav-search {
    display: flex;
    align-items: center;
  }
  
  .feed-nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background-color: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }
  
  .feed-nav-button:hover {
    background-color: rgba(29, 155, 240, 0.1);
    color: rgb(29, 155, 240);
  }
  
  .feed-nav-icon {
    width: 20px;
    height: 20px;
  }
  
  .feed-nav-icon-small {
    width: 16px;
    height: 16px;
  }
  
  /* Desktop search */
  .feed-search-container {
    width: 240px;
  }
  
  .feed-search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .feed-search-icon {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
    pointer-events: none;
    z-index: 1;
  }
  
  .feed-search-input {
    width: 100%;
    height: 36px;
    padding: 0 36px 0 36px;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    background-color: var(--search-bg);
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: all 0.2s ease;
  }
  
  .feed-search-input::placeholder {
    color: var(--text-secondary);
  }
  
  .feed-search-input:focus {
    border-color: rgb(29, 155, 240);
    background-color: var(--search-bg-focus);
  }
  
  .feed-search-clear {
    position: absolute;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background-color: rgb(29, 155, 240);
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }
  
  .feed-search-clear:hover {
    background-color: rgb(26, 140, 216);
  }
  
  /* Mobile search */
  .feed-search-expanded {
    position: fixed;
    top: 53px;
    left: 0;
    right: 0;
    z-index: 1001;
    padding: 8px 16px;
    background-color: var(--nav-bg-mobile);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .feed-search-expanded .feed-search-input {
    flex: 1;
    border-radius: 20px;
    height: 40px;
    padding: 0 40px 0 16px;
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .feed-search-expanded .feed-search-clear {
    position: absolute;
    right: 24px;
  }
  
  /* Search results indicator */
  .feed-search-results {
    border-bottom: 1px solid var(--border-color);
    background-color: rgba(29, 155, 240, 0.1);
  }
  
  .feed-search-results-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
  }
  
  .feed-search-results-text {
    font-size: 13px;
    color: rgb(29, 155, 240);
    font-weight: 500;
  }
  
  .feed-search-results-clear {
    border: none;
    background: none;
    color: rgb(29, 155, 240);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 12px;
    transition: background-color 0.2s ease;
  }
  
  .feed-search-results-clear:hover {
    background-color: rgba(29, 155, 240, 0.1);
  }
  
  /* Responsive adjustments */
  @media (max-width: 639px) {
    .feed-nav-inner {
      padding: 6px 12px;
    }
    
    .feed-nav-button {
      width: 32px;
      height: 32px;
    }
    
    .feed-nav-icon {
      width: 18px;
      height: 18px;
    }
  }
  
  /* Focus styles for accessibility */
  .feed-nav-button:focus-visible,
  .feed-search-clear:focus-visible,
  .feed-search-results-clear:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: 2px;
  }
  
  .feed-search-input:focus-visible {
    outline: 2px solid rgb(29, 155, 240);
    outline-offset: -2px;
  }
</style>