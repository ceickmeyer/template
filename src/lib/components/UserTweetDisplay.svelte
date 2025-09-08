<!-- src/lib/components/UserTweetDisplay.svelte -->
<script lang="ts">
  import { TweetMarkdownParser, formatLikes } from '$lib/utils/markdownParser.js';
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  
  export let tweet: any;
  export let clickable: boolean = true;
  
  $: parseResult = TweetMarkdownParser.parse(tweet.markdown_content);
  $: parsedTweet = parseResult.success ? parseResult.data : null;
  $: metrics = parsedTweet?.likes ? formatLikes(parsedTweet.likes) : { comments: 0, retweets: 0, likes: 0 };
  
  let lightboxImage: string | null = null;
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
    if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.closest('.tweet-media') || target.closest('.tweet-metrics')) {
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
  <div 
    class="tweet-container {clickable ? 'tweet-clickable' : ''}"
    on:click={handleTweetClick}
    on:keydown={(e) => e.key === 'Enter' && handleTweetClick(e)}
    role={clickable ? 'button' : 'article'}
    tabindex={clickable ? 0 : undefined}
  >
    <!-- Avatar and Name/Handle Row -->
    <div class="tweet-header-row">
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
      
      <!-- Name and Handle -->
      <div class="tweet-author-info">
        <h3 class="tweet-name">
          {parsedTweet.name}
        </h3>
        <div class="tweet-handle">
          {parsedTweet.handle}
        </div>
      </div>
    </div>
    
    <!-- Content aligned with avatar left edge -->
    <div class="tweet-content-aligned">
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
                  <button
                    type="button"
                    class="tweet-media-button"
                    on:click={(e) => handleMediaClick(e, getMediaUrl(mediaFile))}
                  >
                    <img
                      src={getMediaUrl(mediaFile)}
                      alt="Tweet media"
                      class="tweet-media tweet-image"
                      loading="lazy"
                    />
                  </button>
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
              <!-- Quote Author Info -->
              <div class="tweet-quote-author-info">
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
                          <button
                            type="button"
                            class="tweet-media-button"
                            on:click={(e) => handleMediaClick(e, getMediaUrl(mediaFile))}
                          >
                            <img
                              src={getMediaUrl(mediaFile)}
                              alt="Quote media"
                              class="tweet-quote-media tweet-quote-image"
                              loading="lazy"
                            />
                          </button>
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
      
      <!-- Time -->
      {#if parsedTweet.time}
        <div class="tweet-time">
          {parsedTweet.time}
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
                <!-- Reply Author Info -->
                <div class="tweet-reply-author-info">
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
                            <button
                              type="button"
                              class="tweet-media-button"
                              on:click={(e) => handleMediaClick(e, getMediaUrl(mediaFile))}
                            >
                              <img
                                src={getMediaUrl(mediaFile)}
                                alt="Reply media"
                                class="tweet-reply-media tweet-reply-image"
                                loading="lazy"
                              />
                            </button>
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
  </div>
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
    tabindex="-1"
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
  /* Tweet Container */
  .tweet-container {
    padding: 12px 16px;
    color: rgb(231, 233, 234);
    font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  
  .tweet-clickable {
    cursor: pointer;
  }
  
  /* Header Row - Avatar and Name/Handle */
  .tweet-header-row {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }
  
  /* Avatar */
  .tweet-avatar-container {
    flex-shrink: 0;
  }
  
  .tweet-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
  
  .tweet-avatar-image {
    object-fit: cover;
  }
  
  .tweet-avatar-initials {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: white;
    font-size: 14px;
  }
  
  /* Avatar color classes */
  .tweet-avatar-red { background-color: rgb(239, 68, 68); }
  .tweet-avatar-blue { background-color: rgb(59, 130, 246); }
  .tweet-avatar-green { background-color: rgb(16, 185, 129); }
  .tweet-avatar-yellow { background-color: rgb(245, 158, 11); }
  .tweet-avatar-purple { background-color: rgb(139, 92, 246); }
  .tweet-avatar-pink { background-color: rgb(236, 72, 153); }
  .tweet-avatar-indigo { background-color: rgb(99, 102, 241); }
  .tweet-avatar-teal { background-color: rgb(20, 184, 166); }
  
  /* Author Info (Name and Handle on separate lines) */
  .tweet-author-info {
    flex: 1;
    min-width: 0;
  }
  
  .tweet-name {
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    color: rgb(231, 233, 234);
    margin: 0 0 2px 0;
  }
  
  .tweet-handle {
    font-size: 15px;
    line-height: 20px;
    color: rgb(113, 118, 123);
    margin: 0;
  }
  
  /* Content aligned with avatar left edge */
  .tweet-content-aligned {
    /* This container aligns all content with the avatar's left edge */
  }
  
  /* Tweet Body */
  .tweet-body {
    font-size: 15px;
    line-height: 20px;
    color: rgb(231, 233, 234);
    white-space: pre-wrap;
    margin: 12px 0;
  }
  
  /* Time */
  .tweet-time {
    font-size: 15px;
    line-height: 20px;
    color: rgb(113, 118, 123);
    margin: 12px 0 16px 0;
  }
  
  /* Media Styles */
  .tweet-media-container {
    margin: 12px 0;
  }
  
  .tweet-media-grid {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgb(47, 51, 54);
  }
  
  .tweet-media-grid-single {
    display: grid;
    grid-template-columns: 1fr;
  }
  
  .tweet-media-grid-multiple {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
  }
  
  .tweet-media {
    width: 100%;
    height: 288px;
    object-fit: cover;
    cursor: pointer;
    display: block;
  }
  
  .tweet-video {
    cursor: default;
  }
  
  /* Media Button Wrapper */
  .tweet-media-button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: block;
    width: 100%;
    height: 100%;
  }
  
  .tweet-media-button img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  
  /* Quote Tweet Styles */
  .tweet-quote-container {
    border: 1px solid rgb(47, 51, 54);
    border-radius: 16px;
    padding: 12px;
    margin: 12px 0;
  }
  
  .tweet-quote-content {
    display: flex;
    gap: 8px;
  }
  
  .tweet-quote-avatar {
    width: 20px;
    height: 20px;
  }
  
  .tweet-quote-author-info {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }
  
  .tweet-quote-name {
    font-weight: 700;
    font-size: 13px;
    color: rgb(231, 233, 234);
  }
  
  .tweet-quote-handle {
    color: rgb(113, 118, 123);
    font-size: 13px;
  }
  
  .tweet-quote-time-separator {
    color: rgb(113, 118, 123);
  }
  
  .tweet-quote-time {
    color: rgb(113, 118, 123);
    font-size: 13px;
  }
  
  .tweet-quote-body {
    white-space: pre-wrap;
    line-height: 16px;
    font-size: 13px;
    color: rgb(231, 233, 234);
    margin-bottom: 8px;
  }
  
  .tweet-quote-media {
    height: 120px;
  }
  
  /* Reply Styles */
  .tweet-replies {
    margin-top: 12px;
  }
  
  .tweet-reply {
    position: relative;
    display: flex;
    margin-top: 12px;
  }
  
  .tweet-reply-line {
    width: 2px;
    background-color: rgb(47, 51, 54);
    margin-right: 10px;
    margin-left: 19px;
  }
  
  .tweet-reply-content {
    flex: 1;
    display: flex;
    gap: 12px;
  }
  
  .tweet-reply-avatar {
    width: 32px;
    height: 32px;
  }
  
  .tweet-reply-author-info {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }
  
  .tweet-reply-name {
    font-weight: 700;
    font-size: 14px;
    color: rgb(231, 233, 234);
  }
  
  .tweet-reply-handle {
    color: rgb(113, 118, 123);
    font-size: 14px;
  }
  
  .tweet-reply-body {
    white-space: pre-wrap;
    line-height: 18px;
    font-size: 14px;
    color: rgb(231, 233, 234);
    margin-bottom: 8px;
  }
  
  .tweet-reply-media {
    height: 150px;
  }
  
  /* Metrics Styles */
  .tweet-metrics {
    display: flex;
    gap: 20px;
    margin-top: 12px;
  }
  
  .tweet-metric {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgb(113, 118, 123);
    cursor: pointer;
    transition: color 0.2s ease;
    padding: 8px;
    margin: -8px;
    border-radius: 20px;
    transition: background-color 0.2s ease;
  }
  
  .tweet-metric:hover {
    background-color: rgba(29, 155, 240, 0.1);
  }
  
  .tweet-metric:hover .tweet-metric-icon,
  .tweet-metric:hover .tweet-metric-count {
    color: rgb(29, 155, 240);
  }
  
  .tweet-metric-icon {
    width: 18px;
    height: 18px;
    transition: color 0.2s ease;
  }
  
  .tweet-metric-count {
    font-size: 13px;
    transition: color 0.2s ease;
  }
  
  /* Lightbox Styles */
  .tweet-lightbox {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .tweet-lightbox-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }
  
  .tweet-lightbox-close {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: background-color 0.2s ease;
  }
  
  .tweet-lightbox-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .tweet-lightbox-close-icon {
    width: 24px;
    height: 24px;
  }
  
  .tweet-lightbox-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  
  /* Error Styles */
  .tweet-error {
    padding: 16px;
    background-color: rgba(244, 33, 46, 0.1);
    border: 1px solid rgba(244, 33, 46, 0.3);
    border-radius: 8px;
  }
  
  .tweet-error-text {
    color: rgb(244, 33, 46);
    font-size: 14px;
    margin: 0;
  }
</style>