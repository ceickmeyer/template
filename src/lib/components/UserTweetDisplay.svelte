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
    
    goto(`/${tweet.slug}`);
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

  let showToast = false;
let toastMessage = '';

// Add this function to handle share button click
async function handleShare(event: MouseEvent) {
  event.stopPropagation();
  
  const shareUrl = `https://www.museumoftwitter.com/${tweet.slug}`;
  
  try {
    await navigator.clipboard.writeText(shareUrl);
    showShareToast('Link copied to clipboard!');
  } catch (err) {
    // Fail silently as requested
    console.error('Failed to copy to clipboard:', err);
  }
}

function showShareToast(message: string) {
  toastMessage = message;
  showToast = true;
  setTimeout(() => {
    showToast = false;
  }, 2500);
}


</script>

{#if parseResult && !parseResult.success}
  <div class="tweet-error">
    <p class="tweet-error-text">Parse Error: {parseResult.error}</p>
  </div>
{:else if parsedTweet}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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
<div class="tweet-metrics {clickable ? '' : 'tweet-metrics-with-border'}">
  <div class="tweet-metrics-container">
    <div class="tweet-metric tweet-metric-comments">
      <svg class="tweet-metric-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
      </svg>
      <span class="tweet-metric-count">{formatNumber(metrics.comments)}</span>
    </div>

    <div class="tweet-metric tweet-metric-retweets">
      <svg class="tweet-metric-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
      </svg>
      <span class="tweet-metric-count">{formatNumber(metrics.retweets)}</span>
    </div>

    <div class="tweet-metric tweet-metric-likes">
      <svg class="tweet-metric-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
      </svg>
      <span class="tweet-metric-count">{formatNumber(metrics.likes)}</span>
    </div>

    <!-- Empty spacer column -->
    <div class="tweet-metric-spacer"></div>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button 
  type="button"
  class="tweet-metric tweet-metric-share tweet-share-button"
  on:click={handleShare}
  title="Copy link to clipboard"
>
  <svg class="tweet-metric-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/>
  </svg>
</button>

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

{#if showToast}
  <div class="tweet-share-toast">
    <div class="tweet-share-toast-content">
      {toastMessage}
    </div>
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
font-family: 'TwitterChirp', 'Comic Sans MS', cursive;
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
    margin: 0 0 -2px 0;
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
    font-size: 16px;
    line-height: 24px;
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
    width: 40px;
    height: 40px;
  }
  
  .tweet-quote-author-info {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }
  
  .tweet-quote-name {
    font-weight: 700;
    font-size: 14px;
    color: rgb(231, 233, 234);
  }
  
  .tweet-quote-handle {
    color: rgb(113, 118, 123);
    font-size: 14px;
  }
  
  .tweet-quote-time-separator {
    color: rgb(113, 118, 123);
  }
  
  .tweet-quote-time {
    color: rgb(113, 118, 123);
    font-size: 14px;
  }
  
  .tweet-quote-body {
    white-space: pre-wrap;
    line-height: 20px;
    font-size: 15px;
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
  
.tweet-metrics {
  margin-top: 12px;
  /* Remove centering to align with tweet body */
}

.tweet-metrics-with-border {
    border-top: 1px solid rgb(47, 51, 54);
  border-bottom: 1px solid rgb(47, 51, 54);
  padding-top: 12px;
  padding-bottom: 12px;
}

.tweet-metrics-container {
  display: grid;
  grid-template-columns: auto auto auto 1fr auto;
  gap: 94px;
  align-items: center;
  /* This will align the metrics with the tweet body text */
}

.tweet-metric {
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
  flex-shrink: 0;
}

.tweet-metric-count {
  font-size: 13px;
  transition: color 0.2s ease;
  white-space: nowrap;
}

/* Spacer column - invisible but takes up space */
.tweet-metric-spacer {
  /* Empty spacer - no content, just takes up grid space */
}

/* Share button has no count, just icon */
.tweet-metric-share {
  justify-content: flex-end;
}

.tweet-metric-share .tweet-metric-icon {
  /* Share icon styling can be adjusted if needed */
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

  /* Share button styling */
.tweet-share-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s ease, color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tweet-share-button:hover {
  background-color: rgba(29, 155, 240, 0.1);
  color: rgb(29, 155, 240);
}

.tweet-share-button:active {
  background-color: rgba(29, 155, 240, 0.2);
  transform: scale(0.95);
}

/* Toast styling */
.tweet-share-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.tweet-share-toast-content {
  background-color: #1d9bf0;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 300px;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

</style>