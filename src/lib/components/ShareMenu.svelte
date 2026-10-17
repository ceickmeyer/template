<!-- src/lib/components/ShareMenu.svelte -->
<!--
  Share button with a small menu: copy the tweet's link, or copy a PNG of
  the tweet (or whole thread) exactly as it's rendered on the page.
-->
<script lang="ts">
  import { portal } from '$lib/actions/portal';

  export let slug: string;
  // The element to render as an image (the tweet card).
  export let target: HTMLElement | undefined;
  export let onDone: (message: string) => void;

  let open = false;
  let busy = false;
  let button: HTMLButtonElement;
  let menuStyle = '';

  const MENU_HEIGHT = 96;
  const SHARE_ICON =
    'M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z';

  function toggle(event: MouseEvent) {
    event.stopPropagation();
    if (open) return close();
    // The menu is portaled to <body> (so a card's overflow: hidden can't clip
    // it), so it's positioned from the button's place on screen.
    // Opens below the button, or above it when it's near the bottom.
    const rect = button.getBoundingClientRect();
    const right = `right: ${window.innerWidth - rect.right}px;`;
    menuStyle =
      window.innerHeight - rect.bottom < MENU_HEIGHT + 12
        ? `${right} bottom: ${window.innerHeight - rect.top + 6}px;`
        : `${right} top: ${rect.bottom + 6}px;`;
    open = true;
  }

  function close() {
    open = false;
  }

  async function copyLink() {
    close();
    try {
      await navigator.clipboard.writeText(`https://www.museumoftwitter.com/${slug}`);
      onDone('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      onDone("Couldn't copy link");
    }
  }

  async function renderImage() {
    if (!target) throw new Error('Nothing to capture');
    // Loaded on first use: it's most of this component's weight and most
    // visitors never copy an image.
    const { domToBlob } = await import('modern-screenshot');
    return domToBlob(target, {
      scale: 2,
      // The card itself is transparent; use the page's current theme color.
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      // Leave the share button out of the picture.
      filter: (node) => !(node instanceof HTMLElement && node.hasAttribute('data-no-capture')),
      timeout: 15000
    });
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `${slug}.png` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyImage() {
    close();
    busy = true;
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        // The blob *promise* goes into ClipboardItem: Safari only allows a
        // clipboard write that starts synchronously inside the click.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderImage() })]);
        onDone('Image copied to clipboard!');
      } else {
        download(await renderImage());
        onDone('Image downloaded');
      }
    } catch (err) {
      console.error('Copy as image failed:', err);
      try {
        download(await renderImage());
        onDone("Couldn't copy the image — downloaded it instead");
      } catch {
        onDone("Couldn't create the image");
      }
    } finally {
      busy = false;
    }
  }

  function handleWindowClick(event: MouseEvent) {
    if (open && !button.contains(event.target as Node)) close();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      close();
      button.focus();
    }
  }
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleKeydown} on:scroll={close} on:resize={close} />

<button
  bind:this={button}
  type="button"
  class="share-button"
  class:busy
  data-no-capture
  on:click={toggle}
  aria-label="Share"
  aria-haspopup="menu"
  aria-expanded={open}
  title="Share"
  disabled={busy}
>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={SHARE_ICON} /></svg>
</button>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="share-menu"
    role="menu"
    tabindex="-1"
    use:portal
    style={menuStyle}
    on:click|stopPropagation
  >
    <button type="button" role="menuitem" on:click={copyLink}>Copy link</button>
    <button type="button" role="menuitem" on:click={copyImage}>Copy as image</button>
  </div>
{/if}

<style>
  .share-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    margin: -6px;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--tweet-metrics-color);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .share-button:hover,
  .share-button[aria-expanded='true'] {
    background-color: rgba(29, 155, 240, 0.1);
    color: var(--accent);
  }

  .share-button:focus-visible {
    outline: 2px solid var(--accent);
  }

  .share-button.busy {
    opacity: 0.5;
    cursor: progress;
  }

  svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  .share-menu {
    position: fixed;
    z-index: 1500;
    min-width: 180px;
    padding: 4px 0;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background-color: var(--bg-primary);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .share-menu button {
    display: block;
    width: 100%;
    padding: 10px 16px;
    border: none;
    background: none;
    color: var(--text-primary);
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .share-menu button:hover,
  .share-menu button:focus-visible {
    background-color: var(--hover-bg);
    outline: none;
  }
</style>
