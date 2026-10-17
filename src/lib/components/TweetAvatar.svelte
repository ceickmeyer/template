<!-- src/lib/components/TweetAvatar.svelte -->
<script lang="ts">
  import { getMediaUrl } from '$lib/utils/media';

  export let filename: string | undefined = undefined;
  export let name = '';
  export let size = 40;

  // Falls back to initials if the stored avatar file is missing — a broken
  // <img> otherwise renders its alt text inline next to the name.
  let failed = false;
  $: if (filename) failed = false;

  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  $: initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => Array.from(part)[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  $: color = COLORS[Array.from(name).reduce((sum, ch) => sum + (ch.codePointAt(0) ?? 0), 0) % COLORS.length];
</script>

{#if filename && !failed}
  <img
    src={getMediaUrl(filename)}
    alt=""
    class="avatar"
    style="width: {size}px; height: {size}px;"
    loading="lazy"
    on:error={() => (failed = true)}
  />
{:else}
  <div
    class="avatar avatar-initials"
    style="width: {size}px; height: {size}px; background-color: {color}; font-size: {Math.round(size * 0.36)}px;"
    aria-hidden="true"
  >
    {initials}
  </div>
{/if}

<style>
  .avatar {
    display: block;
    flex-shrink: 0;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-initials {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
  }
</style>
