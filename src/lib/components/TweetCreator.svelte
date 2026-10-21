<!-- src/lib/components/TweetCreator.svelte -->
<script lang="ts">
  import { supabase } from '$lib/supabase.js';
  import { findDuplicate } from '$lib/utils/duplicates';
  import { TweetMarkdownParser, generateSlug, type ParseResult } from '$lib/utils/markdownParser.js';
  import { downloadImage } from '$lib/utils/twitterClipboardParser.js';
  import { deleteMediaFiles } from '$lib/utils/tweetAdmin';
  import UserTweetDisplay from './UserTweetDisplay.svelte';

  let title = '';
  let markdownContent = '';
  let mediaUrl = '';
  let avatarUrl = '';
  let isSubmitting = false;
  let isUploading = false;
  let errorMessage = '';
  // Slug of a found duplicate the admin chose to save past (see save).
  let allowDuplicateOf = '';
  let successMessage = '';
  // Uploaded for this draft but not yet saved in a tweet.
  let uploadedFiles: string[] = [];

  $: parseResult = (markdownContent.trim() ? TweetMarkdownParser.parse(markdownContent) : null) as ParseResult | null;
  $: busy = isSubmitting || isUploading;

  function errorText(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  // Storage object names: keep it to safe characters (original filenames
  // used to go in verbatim, spaces and all).
  function safeName(name: string) {
    const cleaned = name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '');
    return cleaned.slice(-80) || 'file';
  }

  // Ranges of [quote]…[/quote] and [reply]…[/reply] blocks, so main-tweet
  // tags are found/inserted outside them.
  function nestedRanges(text: string) {
    return [...text.matchAll(/\[(quote|reply)\][\s\S]*?\[\/\1\]/gi)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
  }

  function findMainTag(text: string, tag: string) {
    const ranges = nestedRanges(text);
    for (const match of text.matchAll(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi'))) {
      const start = match.index ?? 0;
      if (!ranges.some(([a, b]) => start >= a && start < b)) return match;
    }
    return null;
  }

  function appendTag(tag: string) {
    markdownContent = markdownContent.trim() ? `${markdownContent.trim()}\n${tag}` : tag;
  }

  // The parser only reads the first [media] tag, so additional uploads have
  // to join the existing list — each upload used to add its own tag, and
  // every file after the first was silently ignored.
  function addMedia(fileName: string) {
    const existing = findMainTag(markdownContent, 'media');
    if (!existing) return appendTag(`[media]${fileName}[/media]`);

    const list = existing[1].trim();
    const start = existing.index ?? 0;
    markdownContent =
      markdownContent.slice(0, start) +
      `[media]${list ? `${list},` : ''}${fileName}[/media]` +
      markdownContent.slice(start + existing[0].length);
  }

  function setAvatar(fileName: string) {
    const existing = findMainTag(markdownContent, 'avatar');
    if (!existing) return appendTag(`[avatar]${fileName}[/avatar]`);

    const start = existing.index ?? 0;
    markdownContent =
      markdownContent.slice(0, start) + `[avatar]${fileName}[/avatar]` + markdownContent.slice(start + existing[0].length);
  }

  // Square-crops to 400px (displayed at 40px, but enough for retina and the
  // og:image fallback). Falls back to the original if the image can't be
  // decoded — the old version never resolved in that case and hung the upload.
  function resizeImageToSquare(file: File): Promise<File> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      const done = (result: File) => {
        URL.revokeObjectURL(url);
        resolve(result);
      };

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const target = Math.min(size, 400);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = target;
        canvas.getContext('2d')?.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, target, target);
        canvas.toBlob(
          (blob) => done(blob ? new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' }) : file),
          'image/jpeg',
          0.9
        );
      };
      img.onerror = () => done(file);
      img.src = url;
    });
  }

  async function uploadFiles(files: File[], isAvatar = false) {
    isUploading = true;
    errorMessage = '';
    try {
      for (const file of files) {
        try {
          const processed = isAvatar && file.type.startsWith('image/') ? await resizeImageToSquare(file) : file;
          const fileName = `${isAvatar ? 'avatar' : 'media'}-${Date.now()}-${safeName(processed.name)}`;

          const { error } = await supabase.storage.from('tweet-media').upload(fileName, processed);
          if (error) throw error;

          uploadedFiles = [...uploadedFiles, fileName];
          if (isAvatar) setAvatar(fileName);
          else addMedia(fileName);
        } catch (error) {
          console.error('Upload error:', error);
          errorMessage = `Failed to upload ${file.name}: ${errorText(error)}`;
        }
      }
    } finally {
      isUploading = false;
    }
  }

  async function handleFileInput(event: Event, isAvatar = false) {
    const input = event.currentTarget as HTMLInputElement;
    if (!input.files?.length) return;
    await uploadFiles(Array.from(input.files), isAvatar);
    input.value = '';
  }

  async function handlePaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);

    if (files.length > 0) {
      event.preventDefault();
      await uploadFiles(files);
      if (!errorMessage) successMessage = `Pasted ${files.length} image(s) from the clipboard.`;
    }
  }

  // X's media hosts don't allow cross-origin fetches, so those go through
  // the same /admin/media-proxy the importer uses.
  async function fetchRemote(url: string): Promise<File> {
    const host = new URL(url).hostname;
    if (host.endsWith('twimg.com')) return downloadImage(url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const blob = await response.blob();
    const extension = (blob.type.split('/')[1] || 'bin').replace(/[^\w]/g, '');
    return new File([blob], `url-${Date.now()}.${extension}`, { type: blob.type });
  }

  async function handleUrlUpload(isAvatar: boolean) {
    const url = (isAvatar ? avatarUrl : mediaUrl).trim();
    if (!url) return;

    try {
      const file = await fetchRemote(url);
      const allowed = isAvatar ? file.type.startsWith('image/') : /^(image|video)\//.test(file.type);
      if (!allowed) throw new Error(isAvatar ? 'URL must point to an image' : 'URL must point to an image or video');

      await uploadFiles([file], isAvatar);
      if (isAvatar) avatarUrl = '';
      else mediaUrl = '';
      if (!errorMessage) successMessage = isAvatar ? 'Avatar uploaded.' : 'Media uploaded.';
    } catch (error) {
      console.error('URL upload error:', error);
      errorMessage = `Failed to upload from URL: ${errorText(error)}. Some sites block downloads from other origins — download the file and upload it instead.`;
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !markdownContent.trim()) {
      errorMessage = 'Please fill in title and content';
      return;
    }
    const result = TweetMarkdownParser.parse(markdownContent);
    if (!result.success || !result.data) {
      errorMessage = result.error || 'Invalid markdown format';
      return;
    }

    isSubmitting = true;
    errorMessage = '';
    successMessage = '';

    try {
      // Same handle and (nearly) the same text as an archived tweet: stop
      // once and say so; pressing save again saves it anyway.
      const duplicate = await findDuplicate(markdownContent);
      if (duplicate && duplicate.slug !== allowDuplicateOf) {
        allowDuplicateOf = duplicate.slug;
        errorMessage = `Looks like a duplicate of “${duplicate.title}” (/${duplicate.slug}). Save again to keep both.`;
        return;
      }
      const { error } = await supabase.from('tweets').insert([
        { title: title.trim(), slug: generateSlug(result.data), markdown_content: markdownContent.trim() }
      ]);
      if (error) throw error;

      successMessage = 'Tweet created.';
      title = '';
      markdownContent = '';
      uploadedFiles = []; // now owned by the saved tweet
    } catch (error) {
      console.error('Create error:', error);
      errorMessage = errorText(error) || 'Failed to create tweet';
    } finally {
      isSubmitting = false;
    }
  }

  // Discards the draft, including uploads that never made it into a saved tweet.
  async function clearContent() {
    const files = uploadedFiles;
    markdownContent = '';
    title = '';
    uploadedFiles = [];
    errorMessage = '';
    try {
      await deleteMediaFiles(files);
    } catch (error) {
      console.error('Failed to clean up draft uploads:', error);
    }
  }

  // Replaces the editor content — prepending a sample to existing markdown
  // (as before) produced two tweets' worth of tags in one block.
  function loadSample(template: string, sampleTitle: string) {
    if (markdownContent.trim() && !confirm('Replace the current markdown with this sample?')) return;
    markdownContent = template;
    if (!title.trim()) title = sampleTitle;
  }

  const SAMPLES = [
    {
      label: 'Simple',
      title: 'iPhone Launch - Steve Jobs',
      template: `[name]Steve Jobs[/name]
[handle]@stevejobs[/handle]
[body]Just released the iPhone. Revolutionary device that will change everything.[/body]
[time]9:19 AM · Jan 9, 2007[/time]
[likes]1240,892,5830[/likes]`
    },
    {
      label: 'Quote',
      title: 'Mars Mission Discussion - Elon Musk',
      template: `[name]Elon Musk[/name]
[handle]@elonmusk[/handle]
[body]Thoughts on this Mars mission timeline?[/body]
[time]2:15 PM · Mar 15, 2024[/time]
[likes]2840,1456,8920[/likes]

[quote]
[name]NASA[/name]
[handle]@nasa[/handle]
[body]We're targeting 2030 for the first crewed mission to Mars.[/body]
[time]1:30 PM · Mar 15, 2024[/time]
[/quote]`
    },
    {
      label: 'Thread',
      title: 'Thread - Mark Zuckerberg',
      template: `[name]Mark Zuckerberg[/name]
[handle]@zuck[/handle]
[body]Some thoughts on the future of social media. Thread below 👇[/body]
[time]4:20 PM · Jun 12, 2024[/time]
[likes]1580,892,4320[/likes]

[reply]
[name]Mark Zuckerberg[/name]
[handle]@zuck[/handle]
[body]1/ It's about creating shared digital experiences.[/body]
[time]4:22 PM · Jun 12, 2024[/time]
[likes]456,234,1890[/likes]
[/reply]`
    },
    {
      label: 'Deleted quote',
      title: 'Quoting a deleted tweet',
      template: `[name]Someone[/name]
[handle]@someone[/handle]
[body]lol what happened to this[/body]
[likes]12,3,140[/likes]

[quote]
[unavailable]This Tweet is unavailable.[/unavailable]
[/quote]`
    }
  ];

  $: if (successMessage) setTimeout(() => (successMessage = ''), 5000);
</script>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
  <h1 class="mb-6 text-2xl font-bold">Write a tweet in markdown</h1>

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <form on:submit|preventDefault={handleSubmit} class="space-y-5">
      <div>
        <label for="title" class="mb-1 block text-sm font-medium text-gray-700">Title (admin only)</label>
        <input
          id="title"
          type="text"
          bind:value={title}
          placeholder="e.g. Steve Jobs iPhone launch"
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label for="content" class="block text-sm font-medium text-gray-700">Tweet markdown</label>
          <div class="flex flex-wrap gap-1">
            {#each SAMPLES as sample}
              <button
                type="button"
                on:click={() => loadSample(sample.template, sample.title)}
                class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                {sample.label}
              </button>
            {/each}
            <button
              type="button"
              on:click={clearContent}
              class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          id="content"
          bind:value={markdownContent}
          on:paste={handlePaste}
          placeholder="Start typing, load a sample, or paste an image…"
          rows="18"
          class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isSubmitting}
        ></textarea>
        {#if parseResult && !parseResult.success}
          <p class="mt-1 text-sm text-red-700">{parseResult.error}</p>
        {:else}
          <p class="mt-1 text-xs text-gray-500">Paste an image into the box to upload and attach it.</p>
        {/if}
      </div>

      <fieldset class="space-y-4 rounded-lg border border-gray-200 bg-white p-4" disabled={busy}>
        <legend class="px-1 text-sm font-medium text-gray-900">Media</legend>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="media-files" class="mb-1 block text-sm text-gray-700">Upload media</label>
            <input
              id="media-files"
              type="file"
              multiple
              accept="image/*,video/*"
              on:change={(e) => handleFileInput(e)}
              class="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <div>
            <label for="avatar-file" class="mb-1 block text-sm text-gray-700">Upload avatar</label>
            <input
              id="avatar-file"
              type="file"
              accept="image/*"
              on:change={(e) => handleFileInput(e, true)}
              class="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
        </div>

        <div>
          <label for="media-url" class="mb-1 block text-sm text-gray-700">Media from URL</label>
          <div class="flex gap-2">
            <input
              id="media-url"
              type="url"
              bind:value={mediaUrl}
              placeholder="https://pbs.twimg.com/media/…"
              class="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              on:click={() => handleUrlUpload(false)}
              disabled={!mediaUrl.trim()}
              class="rounded-md bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label for="avatar-url" class="mb-1 block text-sm text-gray-700">Avatar from URL</label>
          <div class="flex gap-2">
            <input
              id="avatar-url"
              type="url"
              bind:value={avatarUrl}
              placeholder="https://pbs.twimg.com/profile_images/…"
              class="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              on:click={() => handleUrlUpload(true)}
              disabled={!avatarUrl.trim()}
              class="rounded-md bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </div>

        {#if isUploading}
          <p class="text-sm text-gray-600">Uploading…</p>
        {/if}
        {#if uploadedFiles.length > 0}
          <p class="text-xs text-gray-500">Uploaded this session: {uploadedFiles.join(', ')}</p>
        {/if}
      </fieldset>

      {#if errorMessage}
        <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
      {/if}
      {#if successMessage}
        <div class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{successMessage}</div>
      {/if}

      <button
        type="submit"
        disabled={busy || !title.trim() || !parseResult?.success}
        class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Creating…' : 'Create tweet'}
      </button>
    </form>

    <div>
      <h2 class="mb-2 text-sm font-medium text-gray-700">Preview</h2>
      {#if parseResult?.success}
        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <UserTweetDisplay tweet={{ markdown_content: markdownContent }} clickable={false} />
        </div>
      {:else}
        <div class="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          {parseResult ? 'Fix the error on the left to see a preview.' : 'Start typing to see a preview.'}
        </div>
      {/if}

      <details class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <summary class="cursor-pointer font-medium">Markdown reference</summary>
        <ul class="mt-3 list-disc space-y-1 pl-5 text-xs">
          <li>Required: <code>[name]</code>, <code>[handle]</code>, <code>[body]</code></li>
          <li>Optional: <code>[avatar]</code>, <code>[media]a.jpg,b.mp4[/media]</code>, <code>[time]</code>, <code>[likes]replies,reposts,likes[/likes]</code>, <code>[replyingto]@handle[/replyingto]</code></li>
          <li>Quote tweet: wrap a tweet in <code>[quote]…[/quote]</code>; a deleted one is <code>[quote][unavailable]message[/unavailable][/quote]</code></li>
          <li>Thread: wrap each reply in <code>[reply]…[/reply]</code> (a tweet can have a quote or replies, not both)</li>
          <li>A missing <code>@</code> on handles, and missing time/likes, are filled in automatically</li>
        </ul>
      </details>
    </div>
  </div>
</div>
