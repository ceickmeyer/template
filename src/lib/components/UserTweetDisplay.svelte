<!-- src/lib/components/UserTweetDisplay.svelte -->
<script lang="ts">
  import { TweetMarkdownParser, formatLikes } from '$lib/utils/markdownParser.js';
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  
  export let tweet;
  export let clickable = true;
  export let showFullContext = false;
  
  $: parseResult = TweetMarkdownParser.parse(tweet.markdown_content);
  $: parsedTweet = parseResult.success ? parseResult.data : null;
  $: metrics = parsedTweet?.likes ? formatLikes(parsedTweet.likes) : { comments: 0, retweets: 0, likes: 0 };
  
  let lightboxImage = null;
  let lightboxVisible = false;
  
  // Generate avatar from name initials
  function getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  
  // Generate consistent color from name
  function getAvatarColor(name: string): string {
    const colors = [
      'tweet-avatar-red', 'tweet-avatar-blue', 'tweet-avatar-green', 'tweet-avatar-yellow', 
      'tweet-avatar-purple', 'tweet-avatar-pink', 'tweet-avatar-indigo', 'tweet-avatar-teal'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
  
  // Get media/avatar URLs
  function getMediaUrl(filename: string): string {
    const { data } = supabase.storage.from('tweet-media').getPublicUrl(filename);
    return data.publicUrl;
  }
  
  // Format numbers (1000 -> 1K)
  function formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }

  // Handle tweet click
  function handleTweetClick(event: MouseEvent) {
    if (!clickable) return;
    
    // Don't navigate if clicking on media or interactive elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.closest('.tweet-media')) {
      return;
    }
    
    goto(`/feed/${tweet.slug}`);
  }

  // Handle media click for lightbox
  function handleMediaClick(event: MouseEvent, mediaUrl: string) {
    event.stopPropagation();
    lightboxImage = mediaUrl;
    lightboxVisible = true;
  }

  // Close lightbox
  function closeLightbox() {
    lightboxVisible = false;
    lightboxImage = null;
  }

  // Handle lightbox background click
  function handleLightboxClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeLightbox();
    }
  }
</script>

{#if parseResult && !parseResult.success}
  <div class="tweet-error">
    <p class="tweet-error-text">Parse Error: {parseResult.error}</p>
  </div>
{:else if parsedTweet}
  <article 
    class="tweet-container {clickable ? 'tweet-clickable' : ''}"
    on:click={handleTweetClick}
    role={clickable ? 'button' : 'article'}
    tabindex={clickable ? 0 : -1}
  >
    <!-- Main Tweet -->
    <div class="tweet-main">
      <!-- Avatar -->
      <div class="tweet-avatar-container">
        {#if parsedTweet.avatar}
          <img 
            src={getMediaUrl(parsedTweet.avatar)} 
            alt="{parsedTweet.name} avatar"
            class="tweet-avatar tweet-avatar-image"
            loading="lazy"
          />
        {:else}
          <div class="tweet-avatar tweet-avatar-initials {getAvatarColor(parsedTweet.name)}">
            {getInitials(parsedTweet.name)}
          </div>
        {/if}
      </div>
      
      <!-- Tweet Content -->
      <div class="tweet-content">
        <!-- Name and Handle -->
        <div class="tweet-header">
          <h3 class="tweet-name">
            {parsedTweet.name}
          </h3>
          <span class="tweet-handle">
            {parsedTweet.handle}
          </span>
          {#if parsedTweet.time}
            <span class="tweet-time-separator">·</span>
            <span class="tweet-time">
              {parsedTweet.time}
            </span>
          {/if}
        </div>
        
        <!-- Tweet Body -->
        <div class="tweet-body">
          {parsedTweet.body}
        </div>
        
        <!-- Main Tweet Media -->
        {#if parsedTweet.media && parsedTweet.media.length > 0}
          <div class="tweet-media-container">
            <div class="tweet-media-grid tweet-media-grid-{parsedTweet.media.length === 1 ? 'single' : 'multiple'}">
              {#each parsedTweet.media as mediaFile}
                <div class="tweet-media-item">
                  {#if mediaFile.endsWith('.mp4') || mediaFile.endsWith('.mov') || mediaFile.includes('video')}
                    <video
                      src={getMediaUrl(mediaFile)}
                      class="tweet-media tweet-video"
                      controls
                      preload="metadata"
                      on:click={(e) => e.stopPropagation()}
                    >
                      <track kind="captions">
                    </video>
                  {:else}
                    <img
                      src={getMediaUrl(mediaFile)}
                      alt="Tweet media"
                      class="tweet-media tweet-image"
                      loading="lazy"
                      on:click={(e) => handleMediaClick(e, getMediaUrl(mediaFile))}
                    />
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Quote Tweet -->
        {#if parsedTweet.quote}
          <div class="tweet-quote-container">
            <div class="tweet-quote-content">
              <!-- Quote Avatar -->
              <div class="tweet-quote-avatar-container">
                {#if parsedTweet.quote.avatar}
                  <img 
                    src={getMediaUrl(parsedTweet.quote.avatar)} 
                    alt="{parsedTweet.quote.name} avatar"
                    class="tweet-quote-avatar tweet-avatar-image"
                    loading="lazy"
                  />
                {:else}
                  <div class="tweet-quote-avatar tweet-avatar-initials {getAvatarColor(parsedTweet.quote.name)}">
                    {getInitials(parsedTweet.quote.name)}
                  </div>
                {/if}
              </div>
              
              <!-- Quote Content -->
              <div class="tweet-quote-body-container">
                <!-- Quote Header -->
                <div class="tweet-quote-header">
                  <span class="tweet-quote-name">
                    {parsedTweet.quote.name}
                  </span>
                  <span class="tweet-quote-handle">
                    {parsedTweet.quote.handle}
                  </span>
                  {#if parsedTweet.quote.time}
                    <span class="tweet-quote-time-separator">·</span>
                    <span class="tweet-quote-time">
                      {parsedTweet.quote.time}
                    </span>
                  {/if}
                </div>
                
                <!-- Quote Body -->
                <div class="tweet-quote-body">
                  {parsedTweet.quote.body}
                </div>
                
                <!-- Quote Media -->
                {#if parsedTweet.quote.media && parsedTweet.quote.media.length > 0}
                  <div class="tweet-quote-media-container">
                    <div class="tweet-quote-media-grid tweet-media-grid-{parsedTweet.quote.media.length === 1 ? 'single' : 'multiple'}">
                      {#each parsedTweet.quote.media as mediaFile}
                        <div class="tweet-quote-media-item">
                          {#if mediaFile.endsWith('.mp4') || mediaFile.endsWith('.mov') || mediaFile.includes('video')}
                            <video
                              src={getMediaUrl(mediaFile)}
                              class="tweet-quote-media tweet-quote-video"
                              controls
                              preload="metadata"
                              on:click={(e) => e.stopPropagation()}
                            >
                              <track kind="captions">
                            </video>
                          {:else}
                            <img
                              src={getMediaUrl(mediaFile)}
                              alt="Quote media"
                              class="tweet-quote-media tweet-quote-image"
                              loading="lazy"
                              on:click={(e) => handleMediaClick(e, getMediaUrl(mediaFile))}
                            />
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
        
        <!-- Tweet Metrics -->
        <div class="tweet-metrics">
          <div class="tweet-metric tweet-metric-comments">
            <svg class="tweet-metric-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span class="tweet-metric-count">{formatNumber(metrics.comments)}</span>
          </div>
          
          <div class="tweet-metric tweet-metric-retweets">
            <svg class="tweet-metric-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span class="tweet-metric-count">{formatNumber(metrics.retweets)}</span>
          </div>
          
          <div class="tweet-metric tweet-metric-likes">
            <svg class="tweet-metric-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="tweet-metric-count">{formatNumber(metrics.likes)}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Replies -->
    {#if parsedTweet.replies && parsedTweet.replies.length > 0}
      <div class="tweet-replies">
        {#each parsedTweet.replies as reply}
          <div class="tweet-reply">
            <div class="tweet-reply-line"></div>
            <div class="tweet-reply-content">
              <!-- Reply Avatar -->
              <div class="tweet-reply-avatar-container">
                {#if reply.avatar}
                  <img 
                    src={getMediaUrl(reply.avatar)} 
                    alt="{reply.name} avatar"
                    class="tweet-reply-avatar tweet-avatar-image"
                    loading="lazy"
                  />
                {:else}
                  <div class="tweet-reply-avatar tweet-avatar-initials {getAvatarColor(reply.name)}">
                    {getInitials(reply.name)}
                  </div>
                {/if}
              </div>
              
              <!-- Reply Content -->
              <div class="tweet-reply-body-container">
                <!-- Reply Header -->
                <div class="tweet-reply-header">
                  <span class="tweet-reply-name">
                    {reply.name}
                  </span>
                  <span class="tweet-reply-handle">
                    {reply.handle}
                  </span>
                  {#if reply.time}
                    <span class="tweet-reply-time-separator">·</span>
                    <span class="tweet-reply-time">
                      {reply.time}
                    </span>
                  {/if}
                </div>
                
                <!-- Reply Body -->
                <div class="tweet-reply-body">
                  {reply.body}
                </div>
                
                <!-- Reply Media -->
                {#if reply.media && reply.media.length > 0}
                  <div class="tweet-reply-media-container">
                    <div class="tweet-reply-media-grid tweet-media-grid-{reply.media.length === 1 ? 'single' : 'multiple'}">
                      {#each reply.media as mediaFile}
                        <div class="tweet-reply-media-item">
                          {#if mediaFile.endsWith('.mp4') || mediaFile.endsWith('.mov') || mediaFile.includes('video')}
                            <video
                              src={getMediaUrl(mediaFile)}
                              class="tweet-reply-media tweet-reply-video"
                              controls
                              preload="metadata"
                              on:click={(e) => e.stopPropagation()}
                            >
                              <track kind="captions">
                            </video>
                          {:else}
                            <img
                              src={getMediaUrl(mediaFile)}
                              alt="Reply media"
                              class="tweet-reply-media tweet-reply-image"
                              loading="lazy"
                              on:click={(e) => handleMediaClick(e, getMediaUrl(mediaFile))}
                            />
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
                
                <!-- Reply Metrics -->
                {#if reply.likes}
                  <div class="tweet-reply-metrics">
                    <span class="tweet-reply-metric">{formatNumber(formatLikes(reply.likes).comments)}</span>
                    <span class="tweet-reply-metric">{formatNumber(formatLikes(reply.likes).retweets)}</span>
                    <span class="tweet-reply-metric">{formatNumber(formatLikes(reply.likes).likes)}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </article>
{:else}
  <div class="tweet-error">
    <p class="tweet-error-text">Failed to parse tweet: {tweet.title}</p>
  </div>
{/if}

<!-- Lightbox Modal -->
{#if lightboxVisible && lightboxImage}
  <div 
    class="tweet-lightbox"
    on:click={handleLightboxClick}
    on:keydown={(e) => e.key === 'Escape' && closeLightbox()}
    role="dialog"
    aria-modal="true"
  >
    <div class="tweet-lightbox-content">
      <button 
        class="tweet-lightbox-close"
        on:click={closeLightbox}
        aria-label="Close image"
      >
        <svg class="tweet-lightbox-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img 
        src={lightboxImage} 
        alt="Enlarged media"
        class="tweet-lightbox-image"
      />
    </div>
  </div>
{/if}

<style>
  /* Base Tweet Styles - Placeholder CSS classes for Twitter-like styling */
  .tweet-container {
    /* Base tweet container styling */
  }
  
  .tweet-clickable {
    /* Clickable tweet styling */
    cursor: pointer;
  }
  
  .tweet-main {
    /* Main tweet layout */
    display: flex;
    gap: 12px;
  }
  
  .tweet-avatar-container {
    /* Avatar container */
    flex-shrink: 0;
  }
  
  .tweet-avatar {
    /* Base avatar styling */
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
  
  .tweet-avatar-image {
    /* Avatar image specific styling */
    object-fit: cover;
  }
  
  .tweet-avatar-initials {
    /* Avatar initials specific styling */
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    font-size: 14px;
  }
  
  /* Avatar color classes */
  .tweet-avatar-red { background-color: #ef4444; }
  .tweet-avatar-blue { background-color: #3b82f6; }
  .tweet-avatar-green { background-color: #10b981; }
  .tweet-avatar-yellow { background-color: #f59e0b; }
  .tweet-avatar-purple { background-color: #8b5cf6; }
  .tweet-avatar-pink { background-color: #ec4899; }
  .tweet-avatar-indigo { background-color: #6366f1; }
  .tweet-avatar-teal { background-color: #14b8a6; }
  
  .tweet-content {
    /* Tweet content area */
    flex: 1;
    min-width: 0;
  }
  
  .tweet-header {
    /* Tweet header with name, handle, time */
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  
  .tweet-name {
    /* Tweet author name */
    font-weight: bold;
    font-size: 15px;
  }
  
  .tweet-handle {
    /* Tweet author handle */
    color: #6b7280;
    font-size: 15px;
  }
  
  .tweet-time-separator {
    /* Time separator dot */
    color: #6b7280;
  }
  
  .tweet-time {
    /* Tweet timestamp */
    color: #6b7280;
    font-size: 15px;
  }
  
  .tweet-body {
    /* Tweet body text */
    white-space: pre-wrap;
    line-height: 1.3;
    font-size: 15px;
    margin-bottom: 12px;
  }
  
  /* Media Styles */
  .tweet-media-container {
    /* Media container */
    margin-bottom: 12px;
  }
  
  .tweet-media-grid {
    /* Media grid layout */
    border-radius: 16px;
    overflow: hidden;
  }
  
  .tweet-media-grid-single {
    /* Single media item grid */
    display: grid;
    grid-template-columns: 1fr;
  }
  
  .tweet-media-grid-multiple {
    /* Multiple media items grid */
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
  }
  
  .tweet-media {
    /* Base media styling */
    width: 100%;
    height: 200px;
    object-fit: cover;
    cursor: pointer;
  }
  
  .tweet-image {
    /* Image specific styling */
  }
  
  .tweet-video {
    /* Video specific styling */
    cursor: default;
  }
  
  /* Quote Tweet Styles */
  .tweet-quote-container {
    /* Quote tweet container */
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .tweet-quote-content {
    /* Quote tweet content layout */
    display: flex;
    gap: 8px;
  }
  
  .tweet-quote-avatar {
    /* Quote avatar sizing */
    width: 20px;
    height: 20px;
  }
  
  .tweet-quote-header {
    /* Quote header styling */
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }
  
  .tweet-quote-name {
    /* Quote author name */
    font-weight: bold;
    font-size: 13px;
  }
  
  .tweet-quote-handle {
    /* Quote author handle */
    color: #6b7280;
    font-size: 13px;
  }
  
  .tweet-quote-body {
    /* Quote body text */
    white-space: pre-wrap;
    line-height: 1.3;
    font-size: 13px;
    margin-bottom: 8px;
  }
  
  .tweet-quote-media {
    /* Quote media sizing */
    height: 120px;
  }
  
  /* Reply Styles */
  .tweet-replies {
    /* Replies container */
    margin-top: 12px;
  }
  
  .tweet-reply {
    /* Individual reply container */
    position: relative;
    display: flex;
    margin-top: 12px;
  }
  
  .tweet-reply-line {
    /* Reply connection line */
    width: 2px;
    background-color: #e5e7eb;
    margin-right: 10px;
    margin-left: 19px;
  }
  
  .tweet-reply-content {
    /* Reply content layout */
    flex: 1;
    display: flex;
    gap: 12px;
  }
  
  .tweet-reply-avatar {
    /* Reply avatar sizing */
    width: 32px;
    height: 32px;
  }
  
  .tweet-reply-header {
    /* Reply header styling */
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }
  
  .tweet-reply-name {
    /* Reply author name */
    font-weight: bold;
    font-size: 14px;
  }
  
  .tweet-reply-handle {
    /* Reply author handle */
    color: #6b7280;
    font-size: 14px;
  }
  
  .tweet-reply-body {
    /* Reply body text */
    white-space: pre-wrap;
    line-height: 1.3;
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .tweet-reply-media {
    /* Reply media sizing */
    height: 150px;
  }
  
  /* Metrics Styles */
  .tweet-metrics {
    /* Metrics container */
    display: flex;
    gap: 24px;
    margin-top: 8px;
  }
  
  .tweet-metric {
    /* Individual metric styling */
    display: flex;
    align-items: center;
    gap: 4px;
    color: #6b7280;
    cursor: pointer;
  }
  
  .tweet-metric-icon {
    /* Metric icon sizing */
    width: 16px;
    height: 16px;
  }
  
  .tweet-metric-count {
    /* Metric count text */
    font-size: 13px;
  }
  
  /* Lightbox Styles */
  .tweet-lightbox {
    /* Lightbox overlay */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  
  .tweet-lightbox-content {
    /* Lightbox content container */
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }
  
  .tweet-lightbox-close {
    /* Lightbox close button */
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
  }
  
  .tweet-lightbox-close-icon {
    /* Close button icon */
    width: 24px;
    height: 24px;
  }
  
  .tweet-lightbox-image {
    /* Lightbox image */
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  /* Error Styles */
  .tweet-error {
    /* Error container */
    padding: 16px;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
  }
  
  .tweet-error-text {
    /* Error text */
    color: #dc2626;
    font-size: 14px;
  }
</style>