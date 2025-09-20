<!-- src/lib/components/FeaturedTweet.svelte -->
<script lang="ts">
  import UserTweetDisplay from './UserTweetDisplay.svelte';
  
  export let tweet: any;
</script>

{#if tweet}
  <div class="featured-tweet-container">
    <!-- Featured Tweet Label -->
    <div class="featured-tweet-label">Featured Tweet</div>
    
    <!-- Tweet Content with Rainbow Glow -->
    <div class="featured-tweet-content">
      <UserTweetDisplay {tweet} clickable={true} />
    </div>
  </div>
{/if}

<style>
  .featured-tweet-container {
    position: relative;
    margin-bottom: 16px;
    margin-top: 16px; /* Increased to accommodate the label */
  }

  /* Featured Tweet label at the top center */
  .featured-tweet-label {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Featured Tweet label at the top center */
  .featured-tweet-label {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .featured-badge-container {
    padding: 0 16px 8px 16px;
  }

  .featured-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: linear-gradient(135deg, rgb(255, 212, 0), rgb(255, 193, 7));
    color: rgb(0, 0, 0);
    border-radius: 16px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(255, 212, 0, 0.3);
  }

  .featured-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .featured-text {
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  .featured-tweet-content {
    position: relative;
    border-radius: 5px;
    overflow: hidden;
    
    /* Rainbow glow using multiple layered shadows */
    box-shadow: 
      0 0 6px rgba(255, 0, 128, 0.8),
      0 0 6px rgba(128, 255, 0, 0.6),
      0 0 6px rgba(0, 128, 255, 0.6),
      0 0 6px rgba(255, 128, 0, 0.6),
      0 0 6px rgba(255, 0, 255, 0.4),
      0 4px 20px rgba(0, 0, 0, 0.1);
    
    /* Updated background gradient to use theme variables */
    background: linear-gradient(180deg, 
      var(--featured-bg) 0%, 
      var(--featured-bg) 100%
    );
    
    transition: all 0.3s ease;
  }

  .featured-tweet-content:hover {
    box-shadow: 
      0 0 8px rgba(255, 0, 128, 1.0),
      0 0 8px rgba(128, 255, 0, 0.8),
      0 0 8px rgba(0, 128, 255, 0.8),
      0 0 8px rgba(255, 128, 0, 0.8),
      0 0 8px rgba(255, 0, 255, 0.6),
      0 6px 25px rgba(0, 0, 0, 0.15);
    
    transform: translateY(-1px);
  }

  /* Ensure the inner tweet display has proper styling with theme variables */
  .featured-tweet-content :global(.tweet-container) {
    background: var(--featured-bg);
    backdrop-filter: blur(8px);
    border: none;
    transition: background-color 0.2s ease;
  }

  .featured-tweet-content :global(.tweet-container:hover) {
    background: var(--featured-bg);
    filter: brightness(1.05);
  }

  /* Apply theme colors to all text elements within featured tweet */
  .featured-tweet-content :global(.tweet-name),
  .featured-tweet-content :global(.tweet-author-name) {
    color: var(--tweet-name-color) !important;
  }

  .featured-tweet-content :global(.tweet-handle),
  .featured-tweet-content :global(.tweet-author-handle) {
    color: var(--tweet-handle-color) !important;
  }

  .featured-tweet-content :global(.tweet-body),
  .featured-tweet-content :global(.tweet-content),
  .featured-tweet-content :global(.tweet-text) {
    color: var(--tweet-body-color) !important;
  }

  .featured-tweet-content :global(.tweet-time),
  .featured-tweet-content :global(.tweet-timestamp) {
    color: var(--tweet-time-color) !important;
  }

  .featured-tweet-content :global(.tweet-metrics),
  .featured-tweet-content :global(.tweet-stats) {
    color: var(--tweet-metrics-color) !important;
  }

  /* Quote tweet styling within featured tweet */
  .featured-tweet-content :global(.quote-tweet),
  .featured-tweet-content :global(.quoted-tweet) {
    background-color: var(--bg-secondary) !important;
    border-color: var(--border-color) !important;
  }

  /* Reply tweet styling within featured tweet */
  .featured-tweet-content :global(.reply-tweet),
  .featured-tweet-content :global(.thread-tweet) {
    background-color: var(--featured-bg) !important;
    border-color: var(--border-color) !important;
  }

  /* Responsive adjustments */
  @media (max-width: 688px) {
    .featured-badge-container {
      padding: 0 12px 6px 12px;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .featured-tweet-content {
      transition: none;
    }
    
    .featured-tweet-content:hover {
      transform: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .featured-badge {
      background: rgb(255, 255, 255);
      color: rgb(0, 0, 0);
      border: 2px solid rgb(255, 212, 0);
    }
    
    .featured-tweet-content {
      border: 2px solid rgb(255, 212, 0);
      box-shadow: none;
    }
  }

  /* Dark/Light theme specific adjustments */
  @media (prefers-color-scheme: light) {
    .featured-tweet-content:hover {
      box-shadow: 
        0 0 8px rgba(255, 0, 128, 1.0),
        0 0 8px rgba(128, 255, 0, 0.8),
        0 0 8px rgba(0, 128, 255, 0.8),
        0 0 8px rgba(255, 128, 0, 0.8),
        0 0 8px rgba(255, 0, 255, 0.6),
        0 6px 25px rgba(0, 0, 0, 0.25); /* Slightly stronger shadow for light mode */
    }
  }
</style>