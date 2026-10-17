<!-- src/lib/components/TweetMedia.svelte -->
<!--
  Twitter-style media grid: 1 item at its natural aspect ratio (capped
  height), 2 side by side, 3 as one tall + two stacked, 4 as a 2x2 grid —
  multi-item layouts fill a fixed 16:9 frame with cropped tiles. More than
  4 shows the first 4 with a "+N" overlay, since X itself never shows more.
-->
<script lang="ts">
  import { getMediaUrl, isVideo } from '$lib/utils/media';

  export let media: string[] = [];
  export let size: 'main' | 'quote' = 'main';
  // Called with the image URLs in this grid and the index of the clicked one.
  export let onOpen: ((urls: string[], index: number) => void) | undefined = undefined;

  const MAX_VISIBLE = 4;

  $: items = media.map(file => ({ file, url: getMediaUrl(file), video: isVideo(file) }));
  $: visible = items.slice(0, MAX_VISIBLE);
  $: hiddenCount = items.length - visible.length;
  $: imageUrls = items.filter(item => !item.video).map(item => item.url);

  function open(event: MouseEvent, url: string) {
    event.stopPropagation();
    onOpen?.(imageUrls, imageUrls.indexOf(url));
  }
</script>

{#if visible.length > 0}
  <div class="media-grid media-{size} count-{visible.length}">
    {#each visible as item, i (item.file)}
      <div class="media-item">
        {#if item.video}
          <!-- svelte-ignore a11y_media_has_caption -->
          <video
            src={item.url}
            controls
            playsinline
            preload="metadata"
            on:click={(e) => e.stopPropagation()}
          ></video>
        {:else}
          <button type="button" class="media-button" on:click={(e) => open(e, item.url)} aria-label="Open image">
            <img src={item.url} alt="" loading="lazy" />
          </button>
        {/if}

        {#if hiddenCount > 0 && i === visible.length - 1}
          <div class="media-more" aria-hidden="true">+{hiddenCount}</div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .media-grid {
    display: grid;
    gap: 2px;
    margin-top: 12px;
    border: var(--hairline) solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
  }

  .media-quote {
    margin-top: 8px;
    border-radius: 12px;
  }

  .count-2,
  .count-3,
  .count-4 {
    grid-template-columns: 1fr 1fr;
    aspect-ratio: 16 / 9;
  }

  .count-3,
  .count-4 {
    grid-template-rows: 1fr 1fr;
  }

  .count-3 .media-item:first-child {
    grid-row: span 2;
  }

  .media-item {
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background-color: var(--bg-secondary);
  }

  .media-button {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
  }

  img,
  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* A lone photo keeps its own shape like on X: up to 510px tall, and
     the frame shrinks to the photo's width instead of cropping it. */
  .count-1:has(img) {
    width: fit-content;
    max-width: 100%;
  }

  .count-1 img {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 510px;
  }

  .count-1 video {
    height: auto;
    max-height: 510px;
  }

  .count-1 video {
    background-color: black;
    object-fit: contain;
  }

  .media-quote.count-1 img,
  .media-quote.count-1 video {
    max-height: 300px;
  }

  .media-more {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 28px;
    font-weight: 700;
    pointer-events: none;
  }

  .media-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
</style>
