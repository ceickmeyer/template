<!-- src/routes/parse/+page.svelte -->
<script lang="ts">
  import { supabase } from '$lib/supabase.js';
  import {
    parseTwitterClipboard,
    parseArchiverPayload,
    looksLikeArchiverPayload,
    downloadImage,
    convertToMarkdown
  } from '$lib/utils/twitterClipboardParser.js';
  import { generateSlug } from '$lib/utils/markdownParser.js';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';

  // Rendered the same way it'll actually look on the site, so you can
  // compare against the real tweet before saving instead of only reading
  // the raw markdown.
  $: previewTweet = previewMarkdown ? { markdown_content: previewMarkdown, slug: '', title } : null;

  let clipboardContent = '';
  let parsedData = null;
  let previewMarkdown = '';
  let title = '';
  let isProcessing = false;
  let isSubmitting = false;
  let errorMessage = '';
  let successMessage = '';
  let uploadedFiles: string[] = [];
  let processingStatus = '';
  let usedArchiverScript = false;
  let downloadWarnings: string[] = [];

  // Handle paste event
  async function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    let htmlContent = '';
    let plainContent = '';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'text/html') {
        htmlContent = await new Promise((resolve) => item.getAsString(resolve));
      } else if (item.type === 'text/plain') {
        plainContent = await new Promise((resolve) => item.getAsString(resolve));
      }
    }

    // The museum-of-twitter-archiver Tampermonkey script writes clean JSON
    // to the clipboard as plain text — prefer that over the raw HTML path
    // whenever it's present, since it already has resolved media/video URLs
    // and real engagement counts that plain copy/paste can't provide.
    if (plainContent && looksLikeArchiverPayload(plainContent)) {
      clipboardContent = plainContent;
      await processClipboard();
    } else if (htmlContent) {
      clipboardContent = htmlContent;
      await processClipboard();
    } else {
      errorMessage = 'No tweet content found in clipboard. Make sure you copied a tweet from Twitter/X.';
    }
  }

  // Process the clipboard content
  async function processClipboard() {
    if (!clipboardContent.trim()) {
      errorMessage = 'Please paste some content first';
      return;
    }

    isProcessing = true;
    errorMessage = '';
    uploadedFiles = [];
    downloadWarnings = [];
    processingStatus = 'Parsing tweet content...';

    // Downloads a file and uploads it to storage, appending a real failure
    // reason to downloadWarnings instead of silently reporting success —
    // the previous version treated "download failed" and "nothing to
    // download" identically, so the UI claimed media was captured even
    // when it wasn't.
    async function downloadAndUpload(url: string, fileNamePrefix: string, label: string) {
      try {
        const file = await downloadImage(url);
        const fileName = `${fileNamePrefix}-${file.name}`;

        const { error } = await supabase.storage.from('tweet-media').upload(fileName, file);
        if (error) throw new Error(error.message);

        uploadedFiles = [...uploadedFiles, fileName];
        return true;
      } catch (err) {
        console.error(`Failed to capture ${label}:`, err);
        const reason = err instanceof Error ? err.message : 'download failed';
        downloadWarnings = [...downloadWarnings, `${label}: ${reason}`];
        return false;
      }
    }

    try {
      usedArchiverScript = looksLikeArchiverPayload(clipboardContent);
      parsedData = usedArchiverScript
        ? parseArchiverPayload(clipboardContent)
        : parseTwitterClipboard(clipboardContent);

      if (!parsedData) {
        throw new Error('Failed to parse tweet content');
      }

      // Generate title if not provided
      if (!title) {
        title = `${parsedData.name} - ${parsedData.body.substring(0, 50)}...`;
      }

      // Download and upload avatar if available
      if (parsedData.avatarUrl) {
        processingStatus = 'Downloading avatar...';
        await downloadAndUpload(parsedData.avatarUrl, `avatar-${Date.now()}`, 'Avatar');
      }

      // Download and upload image media files
      if (parsedData.mediaUrls.length > 0) {
        processingStatus = `Downloading ${parsedData.mediaUrls.length} media file(s)...`;

        for (let i = 0; i < parsedData.mediaUrls.length; i++) {
          await downloadAndUpload(parsedData.mediaUrls[i], `media-${Date.now()}-${i}`, `Media file ${i + 1}`);
        }
      }

      // Download and upload video, when the archiver script captured a real
      // video.twimg.com URL (never possible from plain copy/paste, since X
      // only exposes a blob: URL in the DOM for video).
      if (parsedData.videoUrl) {
        processingStatus = 'Downloading video...';
        await downloadAndUpload(parsedData.videoUrl, `media-${Date.now()}-video`, 'Video');
      }

      // Download and upload the quoted tweet's media too, when the
      // archiver script captured one (and it isn't a deleted/unavailable
      // quote, which has no media to fetch). Prefixed with "quote-" so
      // convertToMarkdown can tell these apart from the main tweet's own
      // avatar/media files.
      if (parsedData.quote && !parsedData.quote.unavailable) {
        if (parsedData.quote.avatarUrl) {
          processingStatus = 'Downloading quoted tweet avatar...';
          await downloadAndUpload(parsedData.quote.avatarUrl, `quote-avatar-${Date.now()}`, 'Quoted tweet avatar');
        }
        if (parsedData.quote.mediaUrls.length > 0) {
          processingStatus = `Downloading ${parsedData.quote.mediaUrls.length} quoted tweet media file(s)...`;
          for (let i = 0; i < parsedData.quote.mediaUrls.length; i++) {
            await downloadAndUpload(
              parsedData.quote.mediaUrls[i],
              `quote-media-${Date.now()}-${i}`,
              `Quoted tweet media file ${i + 1}`
            );
          }
        }
      }

      // Generate markdown
      previewMarkdown = convertToMarkdown(parsedData, uploadedFiles);
      processingStatus = downloadWarnings.length > 0 ? 'Done, with some media failures — see below' : 'Ready to save!';

    } catch (error) {
      console.error('Processing error:', error);
      errorMessage = 'Failed to process clipboard content: ' + error.message;
    } finally {
      isProcessing = false;
    }
  }
  
  // Save the processed tweet
  async function saveTweet() {
    if (!parsedData || !previewMarkdown) {
      errorMessage = 'No processed data to save';
      return;
    }
    
    isSubmitting = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      // Generate slug
      const slug = generateSlug(parsedData);
      
      const { data, error } = await supabase
        .from('tweets')
        .insert([
          {
            title: title.trim(),
            slug: slug,
            markdown_content: previewMarkdown.trim()
          }
        ])
        .select();
      
      if (error) throw error;
      
      successMessage = 'Tweet saved successfully!';
      
      // Reset form
      setTimeout(() => {
        clipboardContent = '';
        parsedData = null;
        previewMarkdown = '';
        title = '';
        uploadedFiles = [];
        processingStatus = '';
      }, 2000);
      
    } catch (error) {
      console.error('Save error:', error);
      errorMessage = 'Failed to save tweet: ' + error.message;
    } finally {
      isSubmitting = false;
    }
  }
  
  // Clear everything
  function clearAll() {
    clipboardContent = '';
    parsedData = null;
    previewMarkdown = '';
    title = '';
    uploadedFiles = [];
    downloadWarnings = [];
    processingStatus = '';
    errorMessage = '';
    successMessage = '';
  }
</script>

<svelte:head>
  <title>Parse Twitter Clipboard</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold mb-2">Parse Twitter Clipboard</h1>
    <p class="text-gray-600">
      Copy a tweet from Twitter/X and paste it below to automatically extract and format the content.
    </p>
  </div>
  
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Input Section -->
    <div class="space-y-4">
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
          Title (for admin reference)
        </label>
        <input
          id="title"
          type="text"
          bind:value={title}
          placeholder="Will be auto-generated if empty"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isProcessing || isSubmitting}
        />
      </div>
      
      <div>
        <label for="clipboard" class="block text-sm font-medium text-gray-700 mb-2">
          Paste Tweet Content Here
        </label>
        <div
          class="w-full h-40 p-3 border-2 border-dashed border-gray-300 rounded-md focus-within:border-blue-500 bg-gray-50"
          on:paste={handlePaste}
        >
          <div class="h-full flex items-center justify-center text-gray-500 text-center">
            {#if isProcessing}
              <div class="space-y-2">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p class="text-sm">{processingStatus}</p>
              </div>
            {:else if parsedData}
              <div class="text-green-600">
                <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <p class="text-sm font-medium">Tweet parsed successfully!</p>
                <p class="text-xs">{processingStatus}</p>
              </div>
            {:else}
              <div>
                <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-sm">Click here and paste (Ctrl+V) a copied tweet</p>
                <p class="text-xs mt-1">Make sure to copy the entire tweet from Twitter/X</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="flex space-x-3">
        <button
          type="button"
          on:click={processClipboard}
          disabled={!clipboardContent || isProcessing}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Parse Content'}
        </button>
        
        <button
          type="button"
          on:click={clearAll}
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Clear All
        </button>
      </div>
      
      <!-- Parsed Data Display -->
      {#if parsedData}
        <div class="bg-blue-50 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-blue-900 mb-2">
            Parsed Data
            {#if usedArchiverScript}
              <span class="ml-1 text-green-700">(via Tampermonkey script — real counts & video included)</span>
            {/if}
          </h3>
          <div class="text-xs space-y-1">
            <p><strong>Name:</strong> {parsedData.name}</p>
            <p><strong>Handle:</strong> {parsedData.handle}</p>
            <p><strong>Time:</strong> {parsedData.time}</p>
            {#if parsedData.replyingTo}
              <p><strong>Replying to:</strong> {parsedData.replyingTo}</p>
            {/if}
            {#if parsedData.quote}
              {#if parsedData.quote.unavailable}
                <p class="text-amber-700"><strong>Quote tweet:</strong> detected, but it's unavailable (deleted/suspended) — preserved as a placeholder</p>
              {:else}
                <p><strong>Quote tweet:</strong> {parsedData.quote.name} ({parsedData.quote.handle})</p>
              {/if}
            {/if}
            {#if parsedData.avatarUrl}
              {#if uploadedFiles.some(f => f.startsWith('avatar-'))}
                <p class="text-green-700"><strong>Avatar:</strong> downloaded and uploaded</p>
              {:else}
                <p class="text-red-700"><strong>Avatar:</strong> found but failed to download — see warning below</p>
              {/if}
            {/if}
            {#if parsedData.mediaUrls.length > 0}
              {@const mediaUploadedCount = uploadedFiles.filter(f => f.startsWith('media-') && !f.includes('-video-')).length}
              {#if mediaUploadedCount === parsedData.mediaUrls.length}
                <p class="text-green-700"><strong>Media:</strong> {mediaUploadedCount} of {parsedData.mediaUrls.length} image file(s) downloaded and uploaded</p>
              {:else}
                <p class="text-red-700"><strong>Media:</strong> only {mediaUploadedCount} of {parsedData.mediaUrls.length} image file(s) actually made it — see warnings below</p>
              {/if}
            {/if}
            {#if parsedData.videoUrl}
              {#if uploadedFiles.some(f => f.includes('-video-'))}
                <p class="text-green-700"><strong>Video:</strong> downloaded and uploaded</p>
              {:else}
                <p class="text-red-700"><strong>Video:</strong> found but failed to download — see warning below</p>
              {/if}
            {/if}
            {#if parsedData.unsupportedMediaCount > 0}
              <p class="text-amber-700">
                <strong>Video detected:</strong> {parsedData.unsupportedMediaCount} video file(s) couldn't be
                captured automatically from plain copy/paste. Install the Tampermonkey script (see below) to
                capture video, or download it yourself and attach it from the edit page after saving.
              </p>
            {/if}
            {#if uploadedFiles.length > 0}
              <p><strong>Uploaded:</strong> {uploadedFiles.join(', ')}</p>
            {/if}
          </div>
        </div>
      {/if}

      {#if downloadWarnings.length > 0}
        <div class="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 class="text-sm font-medium text-red-900 mb-2">Media capture failures</h3>
          <ul class="text-xs text-red-800 list-disc list-inside space-y-1">
            {#each downloadWarnings as warning}
              <li>{warning}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
    
    <!-- Preview Section -->
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Generated Markdown
        </label>
        <textarea
          bind:value={previewMarkdown}
          placeholder="Markdown will appear here after processing..."
          rows="15"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          style="white-space: pre-wrap;"
          disabled={isProcessing || isSubmitting}
        ></textarea>
      </div>

      {#if previewTweet}
        <div>
          <span class="block text-sm font-medium text-gray-700 mb-2">Preview (as it will appear on the site)</span>
          <div class="rounded-lg p-2" style="background: rgb(0, 0, 0);">
            <UserTweetDisplay tweet={previewTweet} clickable={false} />
          </div>
        </div>
      {/if}

      <div class="flex space-x-3">
        <button
          type="button"
          on:click={saveTweet}
          disabled={!previewMarkdown || isSubmitting}
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Tweet'}
        </button>
        
        <a
          href="/tweets"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          View All Tweets
        </a>
        
        
      </div>
    </div>
  </div>
  
  <!-- Messages -->
  {#if errorMessage}
    <div class="mt-4 rounded-md bg-red-50 p-4">
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
    <div class="mt-4 rounded-md bg-green-50 p-4">
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
  
  <!-- Instructions -->
  <div class="mt-8 bg-gray-50 p-4 rounded-lg">
    <h3 class="text-sm font-medium text-gray-900 mb-2">How to Use</h3>
    <ol class="text-xs text-gray-700 space-y-1 list-decimal list-inside">
      <li>Go to Twitter/X and find the tweet you want to archive</li>
      <li>Highlight the tweet, beginning at the avatar and ending at views.</li>

      <li>The system will automatically:
        <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
          <li>Extract the user name, handle, and tweet text</li>
          <li>Download and upload the profile picture as avatar</li>
          <li>Download and upload any images (videos can't be captured this way — see note below if one is detected)</li>
          <li>Preserve links and line breaks in the text</li>
          <li>Generate the markdown format used by your system</li>
        </ul>
      </li>
      <li>Review the generated markdown and edit if needed</li>
      <li>Click "Save Tweet" to add it to your archive</li>
    </ol>
  </div>

  <!-- Tampermonkey script callout -->
  <div class="mt-4 bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
    <h3 class="text-sm font-medium text-indigo-900 mb-1">Want video and real engagement counts?</h3>
    <p class="text-xs text-indigo-800">
      Plain copy/paste from the browser can't carry video (X streams it from a
      <code>blob:</code> URL, not a plain link) or engagement numbers. Installing
      <code>tools/tampermonkey/museum-of-twitter-archiver.user.js</code> in Tampermonkey adds an
      "📋 Archive" button to every tweet on x.com that captures those too — paste here exactly the same way,
      the richer data is picked up automatically.
    </p>
  </div>
  
  <!-- Raw Clipboard Debug (only show if there's content) -->
  {#if clipboardContent}
    <details class="mt-4">
      <summary class="text-sm cursor-pointer text-gray-600">Debug: Raw Clipboard Content</summary>
      <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{clipboardContent}</pre>
    </details>
  {/if}
</div>