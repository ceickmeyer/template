<!-- src/lib/components/MediaLightbox.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { portal } from '$lib/actions/portal';

  export let urls: string[] = [];
  export let index = 0;
  export let onClose: () => void;

  $: current = urls[index];
  $: hasMany = urls.length > 1;

  function prev() {
    index = (index - 1 + urls.length) % urls.length;
  }

  function next() {
    index = (index + 1) % urls.length;
  }

  // On the window rather than the overlay div: the overlay never has focus,
  // so a keydown handler on it (as before) never received Escape.
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
    else if (event.key === 'ArrowLeft' && hasMany) prev();
    else if (event.key === 'ArrowRight' && hasMany) next();
  }

  function handleBackdropClick(event: MouseEvent) {
    event.stopPropagation();
    if (event.target === event.currentTarget) onClose();
  }

  onMount(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="lightbox" use:portal on:click={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Image viewer" tabindex="-1">
  <button type="button" class="lightbox-close" on:click|stopPropagation={onClose} aria-label="Close image">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
  </button>

  {#if hasMany}
    <button type="button" class="lightbox-nav lightbox-prev" on:click|stopPropagation={prev} aria-label="Previous image">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
    </button>
    <button type="button" class="lightbox-nav lightbox-next" on:click|stopPropagation={next} aria-label="Next image">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
    </button>
  {/if}

  {#if current}
    <img src={current} alt="Enlarged media" class="lightbox-image" />
  {/if}

  {#if hasMany}
    <div class="lightbox-counter">{index + 1} / {urls.length}</div>
  {/if}
</div>

<style>
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.9);
  }

  .lightbox-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
  }

  .lightbox-close,
  .lightbox-nav {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 8px;
    border: none;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.6);
    color: white;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .lightbox-close:hover,
  .lightbox-nav:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }

  .lightbox-close {
    top: 16px;
    left: 16px;
  }

  .lightbox-prev {
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
  }

  .lightbox-next {
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
  }

  .lightbox-counter {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 14px;
  }

  svg {
    width: 24px;
    height: 24px;
  }
</style>
