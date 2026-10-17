<!-- src/routes/admin/tweets/[slug]/edit/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { TweetMarkdownParser } from '$lib/utils/markdownParser.js';
  import { deleteTweet } from '$lib/utils/tweetAdmin';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';
  import type { StoredTweet } from '$lib/types/tweet';

  let tweet: StoredTweet | null = null;
  let loading = true;
  let title = '';
  let markdownContent = '';
  let savedTitle = '';
  let savedMarkdown = '';
  let isSubmitting = false;
  let errorMessage = '';
  let successMessage = '';
  let showDeleteConfirm = false;
  let isDeleting = false;
  let showPreview = true;
  let draftReady = false;

  $: draftKey = tweet ? `tweet-draft-${tweet.id}` : '';
  $: parseResult = markdownContent.trim() ? TweetMarkdownParser.parse(markdownContent) : null;
  $: hasUnsavedChanges = !!tweet && (markdownContent !== savedMarkdown || title !== savedTitle);
  $: busy = isSubmitting || isDeleting;

  onMount(async () => {
    await loadTweet();
    if (!tweet) return;

    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        const differs = draft.markdownContent !== savedMarkdown || draft.title !== savedTitle;
        if (differs && confirm('Found unsaved changes from a previous edit. Load the draft?')) {
          title = draft.title ?? title;
          markdownContent = draft.markdownContent ?? markdownContent;
        } else if (!differs) {
          localStorage.removeItem(draftKey);
        }
      }
    } catch (err) {
      console.warn('Failed to load draft:', err);
    }
    draftReady = true;
  });

  async function loadTweet() {
    loading = true;
    errorMessage = '';

    try {
      const { data, error } = await supabase.from('tweets').select('*').eq('slug', $page.params.slug).single();

      if (error) {
        errorMessage = error.code === 'PGRST116' ? 'Tweet not found' : 'Failed to load tweet';
        if (error.code !== 'PGRST116') console.error('Error loading tweet:', error);
        return;
      }

      tweet = data;
      title = savedTitle = data.title;
      markdownContent = savedMarkdown = data.markdown_content;
    } finally {
      loading = false;
    }
  }

  // Only autosave real edits — writing a "draft" identical to the saved
  // tweet on load just triggers a pointless prompt next time.
  $: if (draftReady && draftKey && hasUnsavedChanges) {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title, markdownContent, timestamp: Date.now() }));
    } catch {
      // storage unavailable — editing still works, just without drafts
    }
  }

  async function handleSave() {
    if (!tweet) return;
    if (!title.trim() || !markdownContent.trim()) {
      errorMessage = 'Please fill in title and content';
      return;
    }
    const result = TweetMarkdownParser.parse(markdownContent);
    if (!result.success) {
      errorMessage = result.error || 'Invalid markdown format';
      return;
    }

    isSubmitting = true;
    errorMessage = '';
    successMessage = '';

    try {
      // The slug is deliberately left alone: it's the tweet's public URL,
      // and regenerating it on edit (as this used to) broke every link
      // already shared via the copy-link button.
      const { error } = await supabase
        .from('tweets')
        .update({ title: title.trim(), markdown_content: markdownContent.trim() })
        .eq('id', tweet.id);

      if (error) throw error;

      title = savedTitle = title.trim();
      markdownContent = savedMarkdown = markdownContent.trim();
      tweet = { ...tweet, title: savedTitle, markdown_content: savedMarkdown };
      localStorage.removeItem(draftKey);
      successMessage = 'Saved.';
    } catch (error) {
      console.error('Save error:', error);
      errorMessage = error instanceof Error ? error.message : 'Failed to update tweet';
    } finally {
      isSubmitting = false;
    }
  }

  function resetChanges() {
    title = savedTitle;
    markdownContent = savedMarkdown;
    localStorage.removeItem(draftKey);
  }

  async function handleDelete() {
    if (!tweet) return;
    if (!showDeleteConfirm) {
      showDeleteConfirm = true;
      return;
    }

    isDeleting = true;
    errorMessage = '';

    try {
      // Deletes the saved tweet's media, not whatever is in the editor.
      await deleteTweet({ id: tweet.id, markdown_content: savedMarkdown });
      localStorage.removeItem(draftKey);
      await goto('/admin/tweets');
    } catch (error) {
      console.error('Delete error:', error);
      errorMessage = 'Failed to delete tweet: ' + (error instanceof Error ? error.message : String(error));
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  $: if (successMessage) setTimeout(() => (successMessage = ''), 3000);
</script>

<svelte:head>
  <title>{tweet ? `Edit: ${tweet.title}` : 'Edit tweet'} — Museum of Twitter Admin</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
  {#if loading}
    <div class="py-12 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      <p class="mt-2 text-sm text-gray-600">Loading tweet…</p>
    </div>
  {:else if !tweet}
    <div class="rounded-md border border-red-200 bg-red-50 p-4">
      <p class="text-sm text-red-800">{errorMessage}</p>
      <a href="/admin/tweets" class="mt-3 inline-block text-sm text-red-700 hover:text-red-900">← Back to tweets</a>
    </div>
  {:else}
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <a href="/admin/tweets" class="text-sm text-blue-600 hover:text-blue-800">← All tweets</a>
        <h1 class="mt-1 text-2xl font-bold">Edit tweet</h1>
        <p class="mt-1 text-sm text-gray-500">
          Created {new Date(tweet.created_at).toLocaleDateString()} ·
          <a href="/{tweet.slug}" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-800">/{tweet.slug} ↗</a>
          {#if hasUnsavedChanges}
            <span class="font-medium text-orange-600">· Unsaved changes</span>
          {/if}
        </p>
      </div>
      <button
        type="button"
        on:click={() => (showPreview = !showPreview)}
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {showPreview ? 'Hide preview' : 'Show preview'}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-6 {showPreview ? 'lg:grid-cols-2' : ''}">
      <form on:submit|preventDefault={handleSave} class="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label for="title" class="mb-1 block text-sm font-medium text-gray-700">Title (admin only)</label>
          <input
            id="title"
            type="text"
            bind:value={title}
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={busy}
          />
        </div>

        <div>
          <label for="content" class="mb-1 block text-sm font-medium text-gray-700">Tweet markdown</label>
          <textarea
            id="content"
            bind:value={markdownContent}
            rows="20"
            class="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={busy}
          ></textarea>
          {#if parseResult && !parseResult.success}
            <p class="mt-1 text-sm text-red-700">{parseResult.error}</p>
          {:else}
            <p class="mt-1 text-xs text-gray-500">Unsaved edits are kept as a local draft until you save or reset.</p>
          {/if}
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex gap-2">
            <button
              type="submit"
              disabled={busy || !hasUnsavedChanges || !!(parseResult && !parseResult.success)}
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              on:click={resetChanges}
              disabled={busy || !hasUnsavedChanges}
              class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Reset
            </button>
          </div>

          {#if showDeleteConfirm}
            <div class="flex items-center gap-2">
              <span class="text-sm text-red-700">Delete this tweet and its media?</span>
              <button
                type="button"
                on:click={handleDelete}
                disabled={isDeleting}
                class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                on:click={() => (showDeleteConfirm = false)}
                disabled={isDeleting}
                class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          {:else}
            <button
              type="button"
              on:click={handleDelete}
              disabled={busy}
              class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete tweet
            </button>
          {/if}
        </div>

        {#if errorMessage}
          <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
        {/if}
        {#if successMessage}
          <div class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{successMessage}</div>
        {/if}
      </form>

      {#if showPreview}
        <div>
          <h2 class="mb-2 text-sm font-medium text-gray-700">Preview</h2>
          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <UserTweetDisplay tweet={{ ...tweet, title, markdown_content: markdownContent }} clickable={false} />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
