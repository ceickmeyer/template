<!-- src/lib/components/UserTweetDisplay.svelte -->
<script lang="ts">
  import { TweetMarkdownParser, formatLikes } from '$lib/utils/markdownParser.js';
  import { parseTwitterText, decodeHtmlEntities } from '$lib/utils/twitterTextParser.js';
  import { goto } from '$app/navigation';
  import { portal } from '$lib/actions/portal';
  import TweetAvatar from './TweetAvatar.svelte';
  import TweetMedia from './TweetMedia.svelte';
  import MediaLightbox from './MediaLightbox.svelte';

  export let tweet: { markdown_content: string; slug?: string; title?: string };
  export let clickable: boolean = true;

  $: parseResult = TweetMarkdownParser.parse(tweet.markdown_content);
  $: parsedTweet = parseResult.success ? parseResult.data : null;
  $: metrics = parsedTweet?.likes ? formatLikes(parsedTweet.likes) : { comments: 0, retweets: 0, likes: 0 };

  let lightboxUrls: string[] = [];
  let lightboxIndex = 0;

  function openLightbox(urls: string[], index: number) {
    lightboxUrls = urls;
    lightboxIndex = Math.max(0, index);
  }

  function closeLightbox() {
    lightboxUrls = [];
  }

  function formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }

  function text(value: string | undefined) {
    return decodeHtmlEntities(value ?? '');
  }

  function handleTweetClick(event: MouseEvent | KeyboardEvent) {
    if (!clickable || !tweet.slug) return;

    const target = event.target as HTMLElement;
    // Links, buttons and media handle their own clicks.
    if (target.closest('a, button, video, .tweet-metrics')) return;
    // Selecting text shouldn't also navigate away.
    if (event instanceof MouseEvent && window.getSelection()?.toString()) return;

    goto(`/${tweet.slug}`);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.target === event.currentTarget) handleTweetClick(event);
  }

  let toastMessage = '';
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  async function handleShare(event: MouseEvent) {
    event.stopPropagation();
    if (!tweet.slug) return;

    try {
      await navigator.clipboard.writeText(`https://www.museumoftwitter.com/${tweet.slug}`);
      showToast('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showToast("Couldn't copy link");
    }
  }

  function showToast(message: string) {
    toastMessage = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastMessage = ''), 2500);
  }

  const ICONS = {
    reply:
      'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z',
    retweet:
      'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z',
    like:
      'M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
    share:
      'M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z'
  };
</script>

{#if !parseResult.success}
  <div class="tweet-error">
    <p class="tweet-error-text">Parse error: {parseResult.error}</p>
  </div>
{:else if parsedTweet}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="tweet-container"
    class:tweet-clickable={clickable}
    on:click={handleTweetClick}
    on:keydown={handleKeydown}
    role={clickable ? 'link' : 'article'}
    tabindex={clickable ? 0 : undefined}
  >
    <div class="tweet-header-row">
      <TweetAvatar filename={parsedTweet.avatar} name={text(parsedTweet.name)} size={40} />
      <div class="tweet-author-info">
        <div class="tweet-name">{text(parsedTweet.name)}</div>
        <div class="tweet-handle">{parsedTweet.handle}</div>
      </div>
    </div>

    {#if parsedTweet.replyingTo}
      <div class="tweet-replying-to">
        Replying to <span class="twitter-highlight">{parsedTweet.replyingTo}</span>
      </div>
    {/if}

    <div class="tweet-body">{@html parseTwitterText(parsedTweet.body)}</div>

    {#if parsedTweet.media?.length}
      <TweetMedia media={parsedTweet.media} onOpen={openLightbox} />
    {/if}

    {#if parsedTweet.quote}
      <div class="tweet-quote">
        {#if parsedTweet.quote.unavailable}
          <p class="tweet-quote-unavailable">{text(parsedTweet.quote.unavailable)}</p>
        {:else}
          <div class="tweet-quote-header">
            <TweetAvatar filename={parsedTweet.quote.avatar} name={text(parsedTweet.quote.name)} size={20} />
            <span class="tweet-quote-name">{text(parsedTweet.quote.name)}</span>
            <span class="tweet-muted">{parsedTweet.quote.handle}</span>
            {#if parsedTweet.quote.time}
              <span class="tweet-muted" aria-hidden="true">·</span>
              <span class="tweet-muted">{parsedTweet.quote.time}</span>
            {/if}
          </div>
          <div class="tweet-quote-body">{@html parseTwitterText(parsedTweet.quote.body)}</div>
          {#if parsedTweet.quote.media?.length}
            <TweetMedia media={parsedTweet.quote.media} size="quote" onOpen={openLightbox} />
          {/if}
        {/if}
      </div>
    {/if}

    {#if parsedTweet.time}
      <div class="tweet-time">{parsedTweet.time}</div>
    {/if}

    <div class="tweet-metrics" class:tweet-metrics-bordered={!clickable}>
      <span class="tweet-metric" title="Replies">
        <svg class="tweet-metric-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.reply} /></svg>
        <span>{formatNumber(metrics.comments)}</span>
      </span>
      <span class="tweet-metric tweet-metric-retweet" title="Reposts">
        <svg class="tweet-metric-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.retweet} /></svg>
        <span>{formatNumber(metrics.retweets)}</span>
      </span>
      <span class="tweet-metric tweet-metric-like" title="Likes">
        <svg class="tweet-metric-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.like} /></svg>
        <span>{formatNumber(metrics.likes)}</span>
      </span>
      {#if tweet.slug}
        <button type="button" class="tweet-metric tweet-share" on:click={handleShare} aria-label="Copy link to tweet" title="Copy link">
          <svg class="tweet-metric-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.share} /></svg>
        </button>
      {/if}
    </div>

    {#if parsedTweet.replies?.length}
      <div class="tweet-replies">
        {#each parsedTweet.replies as reply}
          <div class="tweet-reply">
            <div class="tweet-reply-gutter">
              <TweetAvatar filename={reply.avatar} name={text(reply.name)} size={32} />
              <div class="tweet-reply-line"></div>
            </div>
            <div class="tweet-reply-content">
              <div class="tweet-reply-header">
                <span class="tweet-reply-name">{text(reply.name)}</span>
                <span class="tweet-muted">{reply.handle}</span>
                {#if reply.time}
                  <span class="tweet-muted" aria-hidden="true">·</span>
                  <span class="tweet-muted">{reply.time}</span>
                {/if}
              </div>
              {#if reply.unavailable}
                <p class="tweet-quote-unavailable">{text(reply.unavailable)}</p>
              {:else}
                <div class="tweet-reply-body">{@html parseTwitterText(reply.body)}</div>
                {#if reply.media?.length}
                  <TweetMedia media={reply.media} size="reply" onOpen={openLightbox} />
                {/if}
                {#if reply.likes}
                  {@const rm = formatLikes(reply.likes)}
                  <div class="tweet-reply-metrics">
                    <span class="tweet-metric"><svg class="tweet-metric-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.reply} /></svg>{formatNumber(rm.comments)}</span>
                    <span class="tweet-metric"><svg class="tweet-metric-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.retweet} /></svg>{formatNumber(rm.retweets)}</span>
                    <span class="tweet-metric"><svg class="tweet-metric-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.like} /></svg>{formatNumber(rm.likes)}</span>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

{#if toastMessage}
  <div class="tweet-toast" use:portal role="status">{toastMessage}</div>
{/if}

{#if lightboxUrls.length > 0}
  <MediaLightbox urls={lightboxUrls} index={lightboxIndex} onClose={closeLightbox} />
{/if}

<style>
  .tweet-container {
    padding: 12px 16px;
    color: var(--tweet-body-color);
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  .tweet-clickable {
    cursor: pointer;
  }

  .tweet-clickable:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .tweet-header-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tweet-author-info {
    min-width: 0;
  }

  .tweet-name {
    font-size: 15px;
    font-weight: 700;
    line-height: 20px;
    color: var(--tweet-name-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tweet-handle,
  .tweet-muted {
    font-size: 15px;
    line-height: 20px;
    color: var(--tweet-handle-color);
  }

  .tweet-replying-to {
    margin-top: 8px;
    font-size: 15px;
    line-height: 20px;
    color: var(--tweet-handle-color);
  }

  .tweet-body {
    margin-top: 12px;
    font-size: 17px;
    line-height: 24px;
    color: var(--tweet-body-color);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* Quote card */
  .tweet-quote {
    margin-top: 12px;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 16px;
  }

  .tweet-quote-header {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    font-size: 15px;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
  }

  .tweet-quote-header :global(.avatar) {
    margin-right: 4px;
  }

  .tweet-quote-name {
    font-weight: 700;
    color: var(--tweet-name-color);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tweet-quote-body {
    margin-top: 4px;
    font-size: 15px;
    line-height: 20px;
    color: var(--tweet-body-color);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .tweet-quote-unavailable {
    margin: 0;
    font-size: 15px;
    color: var(--tweet-handle-color);
  }

  .tweet-time {
    margin-top: 16px;
    font-size: 15px;
    line-height: 20px;
    color: var(--tweet-time-color);
  }

  /* Metrics */
  .tweet-metrics {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 425px;
    margin-top: 12px;
  }

  .tweet-metrics-bordered {
    max-width: none;
    padding: 12px 4px;
    border-top: 1px solid var(--border-color);
  }

  .tweet-metric {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    line-height: 16px;
    color: var(--tweet-metrics-color);
  }

  .tweet-metric-icon {
    width: 18px;
    height: 18px;
    fill: currentColor;
    flex-shrink: 0;
  }

  .tweet-share {
    padding: 6px;
    margin: -6px;
    border: none;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .tweet-share:hover {
    background-color: rgba(29, 155, 240, 0.1);
    color: var(--accent);
  }

  .tweet-share:focus-visible {
    outline: 2px solid var(--accent);
  }

  /* Replies */
  .tweet-replies {
    margin-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .tweet-reply {
    display: flex;
    gap: 12px;
    padding-top: 12px;
  }

  .tweet-reply-gutter {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .tweet-reply-line {
    flex: 1;
    width: 2px;
    margin-top: 4px;
    background-color: var(--border-color);
  }

  .tweet-reply:last-child .tweet-reply-line {
    display: none;
  }

  .tweet-reply-content {
    flex: 1;
    min-width: 0;
    padding-bottom: 12px;
  }

  .tweet-reply-header {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    overflow: hidden;
  }

  .tweet-reply-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--tweet-name-color);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tweet-reply-body {
    margin-top: 2px;
    font-size: 15px;
    line-height: 20px;
    color: var(--tweet-body-color);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .tweet-reply-metrics {
    display: flex;
    gap: 32px;
    margin-top: 8px;
  }

  .tweet-reply-metrics .tweet-metric-icon {
    width: 16px;
    height: 16px;
  }

  /* Error */
  .tweet-error {
    margin: 12px 16px;
    padding: 12px 16px;
    background-color: rgba(244, 33, 46, 0.1);
    border: 1px solid rgba(244, 33, 46, 0.3);
    border-radius: 8px;
  }

  .tweet-error-text {
    margin: 0;
    font-size: 14px;
    color: rgb(244, 33, 46);
  }

  /* Toast (portaled to <body>) */
  .tweet-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    padding: 12px 16px;
    border-radius: 8px;
    background-color: var(--accent);
    color: white;
    font-size: 15px;
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* Rendered via {@html}, so only reachable with :global */
  .tweet-container :global(.twitter-highlight),
  .twitter-highlight {
    color: var(--accent);
  }

  .tweet-container :global(.twitter-link) {
    color: var(--accent);
    text-decoration: none;
  }

  .tweet-container :global(.twitter-link:hover) {
    text-decoration: underline;
  }
</style>
