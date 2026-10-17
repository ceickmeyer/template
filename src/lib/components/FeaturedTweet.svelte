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
    
    background-color: var(--featured-bg);

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

  @media (prefers-reduced-motion: reduce) {
    .featured-tweet-content {
      transition: none;
    }

    .featured-tweet-content:hover {
      transform: none;
    }
  }

  @media (prefers-contrast: high) {
    .featured-tweet-label {
      background: rgb(255, 255, 255);
      color: rgb(0, 0, 0);
      border: 2px solid rgb(255, 212, 0);
    }

    .featured-tweet-content {
      border: 2px solid rgb(255, 212, 0);
      box-shadow: none;
    }
  }
</style>