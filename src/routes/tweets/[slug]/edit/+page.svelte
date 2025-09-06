<!-- src/routes/tweets/[slug]/edit/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';
  import { parseMarkdown, generateSlug } from '$lib/utils/markdownParser.js';
  import TweetDisplay from '$lib/components/TweetDisplay.svelte';
  import { onMount } from 'svelte';

  let tweet = null;
  let loading = true;
  let title = '';
  let markdownContent = '';
  let originalMarkdown = '';
  let isSubmitting = false;
  let errorMessage = '';
  let successMessage = '';
  let showDeleteConfirm = false;
  let isDeleting = false;
  let showPreview = false;

  // Get slug from URL
  $: slug = $page.params.slug;

  onMount(async () => {
    await loadTweet();
  });

  async function loadTweet() {
    loading = true;
    errorMessage = '';

    try {
      const { data, error } = await supabase
        .from('tweets')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          errorMessage = 'Tweet not found';
        } else {
          throw error;
        }
        return;
      }

      tweet = data;
      title = tweet.title;
      markdownContent = tweet.markdown_content;
      originalMarkdown = tweet.markdown_content;

    } catch (error) {
      console.error('Error loading tweet:', error);
      errorMessage = 'Failed to load tweet';
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    if (!title.trim() || !markdownContent.trim()) {
      errorMessage = 'Please fill in title and content';
      return;
    }

    isSubmitting = true;
    errorMessage = '';
    successMessage = '';

    try {
      // Parse the markdown to validate it
      const parsedData = parseMarkdown(markdownContent);
      if (!parsedData) {
        throw new Error('Invalid markdown format');
      }

      // Check if slug needs to be updated (if content changed significantly)
      let newSlug = tweet.slug;
      if (markdownContent !== originalMarkdown) {
        // Only generate new slug if the body content changed significantly
        const originalParsed = parseMarkdown(originalMarkdown);
        if (originalParsed && originalParsed.body !== parsedData.body) {
          newSlug = generateSlug(parsedData);
        }
      }

      const { error } = await supabase
        .from('tweets')
        .update({
          title: title.trim(),
          slug: newSlug,
          markdown_content: markdownContent.trim()
        })
        .eq('id', tweet.id);

      if (error) throw error;

      successMessage = 'Tweet updated successfully!';
      originalMarkdown = markdownContent;
      
      // If slug changed, redirect to new URL
      if (newSlug !== tweet.slug) {
        setTimeout(() => {
          goto(`/tweets/${newSlug}/edit`);
        }, 1000);
      }

    } catch (error) {
      console.error('Error:', error);
      errorMessage = error.message || 'Failed to update tweet';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete() {
    if (!showDeleteConfirm) {
      showDeleteConfirm = true;
      return;
    }

    isDeleting = true;
    errorMessage = '';

    try {
      // Delete associated media files first
      const parsedData = parseMarkdown(markdownContent);
      if (parsedData) {
        const filesToDelete = [];
        
        if (parsedData.avatar) {
          filesToDelete.push(parsedData.avatar);
        }
        
        if (parsedData.media) {
          filesToDelete.push(...parsedData.media);
        }

        // Delete files from storage (don't fail if some files don't exist)
        for (const filename of filesToDelete) {
          try {
            await supabase.storage
              .from('tweet-media')
              .remove([filename]);
          } catch (error) {
            console.warn('Failed to delete file:', filename, error);
          }
        }
      }

      // Delete the tweet record
      const { error } = await supabase
        .from('tweets')
        .delete()
        .eq('id', tweet.id);

      if (error) throw error;

      // Redirect to tweets list
      goto('/tweets');

    } catch (error) {
      console.error('Delete error:', error);
      errorMessage = 'Failed to delete tweet: ' + error.message;
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  function togglePreview() {
    showPreview = !showPreview;
  }

  // Auto-save draft to localStorage
  $: if (typeof window !== 'undefined' && markdownContent && tweet) {
    localStorage.setItem(`tweet-draft-${tweet.id}`, JSON.stringify({
      title,
      markdownContent,
      timestamp: Date.now()
    }));
  }

  // Load draft on mount
  onMount(() => {
    if (typeof window !== 'undefined' && tweet) {
      const draft = localStorage.getItem(`tweet-draft-${tweet.id}`);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          // Only load draft if it's newer than the last save and different
          if (parsed.markdownContent !== originalMarkdown) {
            const loadDraft = confirm('Found unsaved changes. Load draft?');
            if (loadDraft) {
              title = parsed.title || title;
              markdownContent = parsed.markdownContent || markdownContent;
            }
          }
        } catch (error) {
          console.warn('Failed to load draft:', error);
        }
      }
    }
  });

  // Clear draft after successful save
  $: if (successMessage && typeof window !== 'undefined' && tweet) {
    localStorage.removeItem(`tweet-draft-${tweet.id}`);
  }

  // Check for unsaved changes
  $: hasUnsavedChanges = markdownContent !== originalMarkdown || title !== tweet?.title;
</script>

<svelte:head>
  <title>{tweet ? `Edit: ${tweet.title}` : 'Edit Tweet'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto">
    
    {#if loading}
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600">Loading tweet...</p>
      </div>
    {:else if errorMessage && !tweet}
      <div class="rounded-md bg-red-50 p-4">
        <p class="text-sm text-red-800">{errorMessage}</p>
        <div class="mt-4">
          <a href="/tweets" class="text-sm text-red-600 hover:text-red-800">← Back to tweets</a>
        </div>
      </div>
    {:else if tweet}
      
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Edit Tweet</h1>
          <p class="text-sm text-gray-600 mt-1">
            Created: {new Date(tweet.created_at).toLocaleDateString()}
            {#if hasUnsavedChanges}
              <span class="text-orange-600 font-medium">• Unsaved changes</span>
            {/if}
          </p>
        </div>
        
        <div class="flex space-x-3">
          <button
            type="button"
            on:click={togglePreview}
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          
          <a
            href="/tweets/{tweet.slug}"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Tweet
          </a>
          
          <a
            href="/tweets"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Back to List
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 {showPreview ? 'lg:grid-cols-2' : ''} gap-6">
        
        <!-- Edit Form -->
        <div class="bg-white rounded-lg shadow p-6">
          <form on:submit|preventDefault={handleSave} class="space-y-6">
            
            <!-- Title -->
            <div>
              <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                Title (for admin reference)
              </label>
              <input
                id="title"
                type="text"
                bind:value={title}
                placeholder="e.g., Steve Jobs iPhone Launch"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting || isDeleting}
              />
            </div>

            <!-- Markdown Content -->
            <div>
              <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
                Tweet Content (Markdown)
              </label>
              <textarea
                id="content"
                bind:value={markdownContent}
                placeholder="Enter tweet markdown content..."
                rows="20"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                disabled={isSubmitting || isDeleting}
                style="white-space: pre-wrap; line-height: 1.5;"
              ></textarea>
              <p class="mt-1 text-xs text-gray-500">
                Line breaks and formatting will be preserved as you type them.
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center justify-between">
              <div class="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting || !hasUnsavedChanges}
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                
                <button
                  type="button"
                  on:click={() => { markdownContent = originalMarkdown; title = tweet.title; }}
                  disabled={isSubmitting || isDeleting || !hasUnsavedChanges}
                  class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  Reset Changes
                </button>
              </div>

              <!-- Delete Button -->
              <div>
                {#if showDeleteConfirm}
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-red-600">Are you sure?</span>
                    <button
                      type="button"
                      on:click={handleDelete}
                      disabled={isDeleting}
                      class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      on:click={cancelDelete}
                      disabled={isDeleting}
                      class="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                {:else}
                  <button
                    type="button"
                    on:click={handleDelete}
                    disabled={isSubmitting || isDeleting}
                    class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete Tweet
                  </button>
                {/if}
              </div>
            </div>
          </form>
        </div>

        <!-- Preview -->
        {#if showPreview}
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
            <div class="border rounded-lg p-4">
              <TweetDisplay tweet={{
                ...tweet,
                title,
                markdown_content: markdownContent
              }} />
            </div>
          </div>
        {/if}
      </div>

      <!-- Messages -->
      {#if errorMessage}
        <div class="mt-6 rounded-md bg-red-50 p-4">
          <p class="text-sm text-red-800">{errorMessage}</p>
          <button 
            type="button" 
            on:click={() => errorMessage = ''}
            class="text-xs text-red-600 hover:text-red-800 mt-1"
          >
            Dismiss
          </button>
        </div>
      {/if}

      {#if successMessage}
        <div class="mt-6 rounded-md bg-green-50 p-4">
          <p class="text-sm text-green-800">{successMessage}</p>
          <button 
            type="button" 
            on:click={() => successMessage = ''}
            class="text-xs text-green-600 hover:text-green-800 mt-1"
          >
            Dismiss
          </button>
        </div>
      {/if}

      <!-- Usage Instructions -->
      <div class="mt-8 bg-blue-50 p-4 rounded-lg">
        <h3 class="text-sm font-medium text-blue-900 mb-2">Editing Tips</h3>
        <ul class="text-xs text-blue-800 space-y-1">
          <li><strong>Auto-save:</strong> Your changes are automatically saved as drafts while you type</li>
          <li><strong>Line breaks:</strong> Press Enter to create line breaks - they will be preserved exactly as typed</li>
          <li><strong>Preview:</strong> Use "Show Preview" to see how your tweet will look while editing</li>
          <li><strong>Reset:</strong> Click "Reset Changes" to undo all unsaved modifications</li>
          <li><strong>Validation:</strong> The system will validate your markdown before saving</li>
          <li><strong>Media files:</strong> Deleting a tweet will also remove associated uploaded media files</li>
          <li><strong>Slug updates:</strong> If you significantly change the tweet content, the URL slug may update</li>
        </ul>
      </div>

    {/if}
  </div>
</div>