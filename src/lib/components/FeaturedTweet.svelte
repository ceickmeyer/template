<!-- src/lib/components/FeaturedTweet.svelte -->
<script lang="ts">
  import UserTweetDisplay from './UserTweetDisplay.svelte';
  
  export let tweet: any;
</script>

{#if tweet}
  <div class="featured-tweet-container">
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
    margin-top: 4px;
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
    
    background: linear-gradient(180deg, 
      rgba(255, 255, 255, 0.02) 0%, 
      rgba(0, 0, 0, 0) 100%
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

  /* Ensure the inner tweet display has proper styling */
  .featured-tweet-content :global(.tweet-container) {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(8px);
    border: none;
  }

  .featured-tweet-content :global(.tweet-container:hover) {
    background: rgba(0, 0, 0, 0.98);
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
</style>