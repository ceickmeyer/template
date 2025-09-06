<!-- src/routes/parse/+page.svelte -->
<script lang="ts">
  import { supabase } from '$lib/supabase.js';
  import { parseTwitterClipboard, downloadImage, convertToMarkdown } from '$lib/utils/twitterClipboardParser.js';
  import { generateSlug } from '$lib/utils/markdownParser.js';
  
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
  
  // Handle paste event
  async function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    let htmlContent = '';
    
    // Look for HTML content in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type === 'text/html') {
        htmlContent = await new Promise((resolve) => {
          item.getAsString(resolve);
        });
        break;
      }
    }
    
    if (htmlContent) {
      clipboardContent = htmlContent;
      await processClipboard();
    } else {
      errorMessage = 'No HTML content found in clipboard. Make sure you copied a tweet from Twitter/X.';
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
    processingStatus = 'Parsing tweet content...';
    
    try {
      // Parse the clipboard content
      parsedData = parseTwitterClipboard(clipboardContent);
      
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
        const avatarFile = await downloadImage(parsedData.avatarUrl);
        
        if (avatarFile) {
          const fileName = `avatar-${Date.now()}-${avatarFile.name}`;
          
          const { error } = await supabase.storage
            .from('tweet-media')
            .upload(fileName, avatarFile);
          
          if (!error) {
            uploadedFiles = [...uploadedFiles, fileName];
          }
        }
      }
      
      // Download and upload media files
      if (parsedData.mediaUrls.length > 0) {
        processingStatus = `Downloading ${parsedData.mediaUrls.length} media file(s)...`;
        
        for (let i = 0; i < parsedData.mediaUrls.length; i++) {
          const mediaUrl = parsedData.mediaUrls[i];
          const mediaFile = await downloadImage(mediaUrl);
          
          if (mediaFile) {
            const fileName = `media-${Date.now()}-${i}-${mediaFile.name}`;
            
            const { error } = await supabase.storage
              .from('tweet-media')
              .upload(fileName, mediaFile);
            
            if (!error) {
              uploadedFiles = [...uploadedFiles, fileName];
            }
          }
        }
      }
      
      // Generate markdown
      previewMarkdown = convertToMarkdown(parsedData, uploadedFiles);
      processingStatus = 'Ready to save!';
      
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
          <h3 class="text-sm font-medium text-blue-900 mb-2">Parsed Data</h3>
          <div class="text-xs space-y-1">
            <p><strong>Name:</strong> {parsedData.name}</p>
            <p><strong>Handle:</strong> {parsedData.handle}</p>
            <p><strong>Time:</strong> {parsedData.time}</p>
            {#if parsedData.avatarUrl}
              <p><strong>Avatar:</strong> Found and downloaded</p>
            {/if}
            {#if parsedData.mediaUrls.length > 0}
              <p><strong>Media:</strong> {parsedData.mediaUrls.length} file(s) downloaded</p>
            {/if}
            {#if uploadedFiles.length > 0}
              <p><strong>Uploaded:</strong> {uploadedFiles.join(', ')}</p>
            {/if}
          </div>
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
        
        <a
          href="/"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Manual Creator
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
      <li>Right-click the tweet and select "Copy" or use Ctrl+A then Ctrl+C to select and copy the entire tweet</li>
      <li>Click in the paste area above and press Ctrl+V</li>
      <li>The system will automatically:
        <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
          <li>Extract the user name, handle, and tweet text</li>
          <li>Download and upload the profile picture as avatar</li>
          <li>Download and upload any images or videos</li>
          <li>Preserve links and line breaks in the text</li>
          <li>Generate the markdown format used by your system</li>
        </ul>
      </li>
      <li>Review the generated markdown and edit if needed</li>
      <li>Click "Save Tweet" to add it to your archive</li>
    </ol>
  </div>
  
  <!-- Raw Clipboard Debug (only show if there's content) -->
  {#if clipboardContent}
    <details class="mt-4">
      <summary class="text-sm cursor-pointer text-gray-600">Debug: Raw Clipboard Content</summary>
      <pre class="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{clipboardContent}</pre>
    </details>
  {/if}
</div>