<script lang="ts">
  import { supabase } from '$lib/supabase.js';
  import { TweetMarkdownParser, generateSlug, type ParseResult } from '$lib/utils/markdownParser.js';
  
  let title = '';
  let markdownContent = ``;
  let mediaUrl = '';
  let avatarUrl = '';
  let isSubmitting = false;
  let errorMessage = '';
  let successMessage = '';
  let uploadedFiles: string[] = [];
  let pasteSupported = true;
  let parseResult: ParseResult | null = null;

  // Check if clipboard API is supported
  $: pasteSupported = typeof navigator !== 'undefined' && 'clipboard' in navigator;

  // Parse markdown as user types to show validation errors
  $: {
    if (markdownContent.trim()) {
      parseResult = TweetMarkdownParser.parse(markdownContent);
    } else {
      parseResult = null;
    }
  }

  // Handle file upload
  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    await uploadFiles(files);
  }

  
  // Handle clipboard paste
  async function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      await uploadFiles(files);
      successMessage = `Pasted ${files.length} image(s) from clipboard!`;
    }
  }

  // Upload media from URL
  async function handleMediaUrl() {
    if (!mediaUrl.trim()) return;

    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error('Failed to fetch media');

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
        throw new Error('URL must be an image or video');
      }

      const blob = await response.blob();
      const fileName = `url-${Date.now()}.${contentType.split('/')[1]}`;
      const file = new File([blob], fileName, { type: contentType });

      await uploadFiles([file]);
      mediaUrl = '';
      successMessage = 'Media uploaded from URL successfully!';
    } catch (error) {
      console.error('URL upload error:', error);
      errorMessage = 'Failed to upload from URL: ' + error.message;
    }
  }

async function handleAvatarUpload(event) {
  const input = event.target;
  if (!input.files) return;

  const files = Array.from(input.files);
  await uploadFiles(files, true); // true indicates this is an avatar upload
}

async function resizeImageToSquare(file) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas to 40x40
      canvas.width = 100;
      canvas.height = 100;
      
      // Calculate dimensions to crop to square
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;
      
      // Draw the cropped and resized image
      ctx?.drawImage(img, x, y, size, size, 0, 0, 100, 100);

      // Convert back to file
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], `avatar-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(resizedFile);
        }
      }, 'image/jpeg', 0.9);
    };
    
    img.src = URL.createObjectURL(file);
  });
}

async function handleAvatarUrl() {
  if (!avatarUrl.trim()) return;

  try {
    const response = await fetch(avatarUrl);
    if (!response.ok) throw new Error('Failed to fetch avatar');

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error('Avatar URL must be an image');
    }

    const blob = await response.blob();
    const fileName = `avatar-${Date.now()}.${contentType.split('/')[1]}`;
    const file = new File([blob], fileName, { type: contentType });

    await uploadFiles([file], true);
    avatarUrl = '';
    successMessage = 'Avatar uploaded from URL successfully!';
  } catch (error) {
    console.error('Avatar URL upload error:', error);
    errorMessage = 'Failed to upload avatar from URL: ' + error.message;
  }
}


// Modify your existing uploadFiles function to handle avatars:
async function uploadFiles(files, isAvatar = false) {
  for (const file of files) {
    try {
      let processedFile = file;
      
      // Resize avatar files to 40x40
      if (isAvatar && file.type.startsWith('image/')) {
        processedFile = await resizeImageToSquare(file);
      }
      
      const prefix = isAvatar ? 'avatar' : 'media';
      const fileName = `${prefix}-${Date.now()}-${processedFile.name}`;
      
      const { data, error } = await supabase.storage
        .from('tweet-media')
        .upload(fileName, processedFile);

      if (error) throw error;

      uploadedFiles = [...uploadedFiles, fileName];
      
      // Add to markdown content
      if (isAvatar) {
        insertIntoMarkdown(`[avatar]${fileName}[/avatar]`);
      } else {
        insertIntoMarkdown(`[media]${fileName}[/media]`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      errorMessage = 'Failed to upload file: ' + file.name;
    }
  }
}

  // Helper function to insert tags into markdown
  function insertIntoMarkdown(tag: string) {
    // If there's no content, just add the tag
    if (!markdownContent.trim()) {
      markdownContent = tag;
      return;
    }

    // Insert at the end of the current content
    markdownContent = markdownContent.trim() + '\n' + tag;
  }

  async function handleSubmit() {
    if (!title.trim() || !markdownContent.trim()) {
      errorMessage = 'Please fill in title and content';
      return;
    }

    isSubmitting = true;
    errorMessage = '';
    successMessage = '';

    try {
      // Parse and validate the markdown
      const result = TweetMarkdownParser.parse(markdownContent);
      if (!result.success) {
        throw new Error(result.error || 'Invalid markdown format');
      }

      // Generate slug
      const slug = generateSlug(result.data);

      const { data, error } = await supabase
        .from('tweets')
        .insert([
          {
            title: title.trim(),
            slug: slug,
            markdown_content: markdownContent.trim()
          }
        ])
        .select();

      if (error) throw error;

      successMessage = 'Tweet created successfully!';
      title = '';
      markdownContent = '';
      uploadedFiles = [];
      parseResult = null;

    } catch (error) {
      console.error('Error:', error);
      errorMessage = error.message || 'Failed to create tweet';
    } finally {
      isSubmitting = false;
    }
  }

  // Clear the textarea to start fresh
  function clearContent() {
    markdownContent = '';
    title = '';
    parseResult = null;
  }

  // Load different sample types
  function loadSimpleSample() {
    markdownContent = `[name]Steve Jobs[/name]
[handle]@stevejobs[/handle]
[body]Just released the iPhone. Revolutionary device that will change everything.[/body]
[time]9:19 AM · Jan 9, 2007[/time]
[likes]1240,892,5830[/likes]`;
    title = 'iPhone Launch - Steve Jobs';
  }

  function loadQuoteSample() {
    markdownContent = `[name]Elon Musk[/name]
[handle]@elonmusk[/handle]
[body]Thoughts on this Mars mission timeline?[/body]
[time]2:15 PM · Mar 15, 2024[/time]
[likes]2840,1456,8920[/likes]

[quote]
[name]NASA[/name]
[handle]@nasa[/handle]
[body]We're targeting 2030 for the first crewed mission to Mars. This represents humanity's next giant leap.[/body]
[time]1:30 PM · Mar 15, 2024[/time]
[likes]890,445,3210[/likes]
[/quote]`;
    title = 'Mars Mission Discussion - Elon Musk';
  }

  function loadThreadSample() {
    markdownContent = `[name]Mark Zuckerberg[/name] 
[handle]@zuck[/handle]
[body]Excited to share some thoughts on the future of social media and virtual reality. Thread below 👇[/body]
[time]4:20 PM · Jun 12, 2024[/time]
[likes]1580,892,4320[/likes]

[reply]
[name]Mark Zuckerberg[/name] 
[handle]@zuck[/handle]
[body]1/ The metaverse isn't just about VR headsets. It's about creating shared digital experiences that feel as real as physical ones.[/body]
[time]4:22 PM · Jun 12, 2024[/time]
[likes]456,234,1890[/likes]
[/reply]

[reply]
[name]Mark Zuckerberg[/name]
[handle]@zuck[/handle]
[body]2/ We're seeing incredible progress in haptic feedback, spatial audio, and photorealistic avatars. The future is closer than you think.[/body]
[time]4:24 PM · Jun 12, 2024[/time]
[likes]623,198,2456[/likes]
[/reply]`;
    title = 'Metaverse Vision Thread - Mark Zuckerberg';
  }

  function loadMediaSample() {
    markdownContent = `[name]Tim Cook[/name]
[handle]@tim_cook[/handle]
[avatar]avatar-example.jpg[/avatar]
[body]Behind the scenes at our latest product photoshoot. Innovation meets design. 📸✨[/body]
[media]photo1.jpg,photo2.jpg,video1.mp4[/media]
[time]3:45 PM · Today[/time]
[likes]5240,2890,12450[/likes]`;
    title = 'Product Photoshoot - Tim Cook';
  }

  // Clear messages after a few seconds
  $: if (successMessage) {
    setTimeout(() => successMessage = '', 5000);
  }
</script>

<div class="max-w-6xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-6">Recreate Tweet</h1>
  
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    
    <!-- Input Section -->
    <div class="space-y-6">
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
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
            disabled={isSubmitting}
          />
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label for="content" class="block text-sm font-medium text-gray-700">
              Tweet Content (Markdown)
            </label>
            <div class="flex space-x-2">
              <button
                type="button"
                on:click={loadSimpleSample}
                class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Simple Tweet
              </button>
              <button
                type="button"
                on:click={loadQuoteSample}
                class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Quote Tweet
              </button>
              <button
                type="button"
                on:click={loadThreadSample}
                class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                Thread
              </button>
              <button
                type="button"
                on:click={loadMediaSample}
                class="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              >
                With Media
              </button>
              <button
                type="button"
                on:click={clearContent}
                class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>
          <textarea
            id="content"
            bind:value={markdownContent}
            on:paste={handlePaste}
            placeholder="Start typing or use the sample buttons above..."
            rows="20"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            disabled={isSubmitting}
          ></textarea>
          {#if pasteSupported}
            <p class="mt-1 text-xs text-gray-500">
              💡 Tip: You can paste images directly into the text area above!
            </p>
          {/if}
        </div>

        <!-- Validation Status -->
        {#if parseResult}
          <div class="rounded-lg p-3 {parseResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
            <div class="flex items-center">
              {#if parseResult.success}
                <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm text-green-800 font-medium">Valid markdown format</span>
              {:else}
                <svg class="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div class="text-sm text-red-800">
                  <span class="font-medium">Validation Error:</span>
                  <div class="mt-1">{parseResult.error}</div>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Media Upload Section -->
        <div class="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 class="text-sm font-medium text-gray-900">Media Upload</h3>
          
          <!-- File Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Upload Files
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              on:change={handleFileUpload}
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isSubmitting}
            />
          </div>

          <div>
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Upload Avatar
  </label>
  <input
    type="file"
    accept="image/*"
    on:change={handleAvatarUpload}
    class="w-full px-3 py-2 border border-gray-300 rounded-md"
    disabled={isSubmitting}
  />
</div>

          <!-- Media URL Upload -->
          <div>
            <label for="media-url" class="block text-sm font-medium text-gray-700 mb-2">
              Media URL
            </label>
            <div class="flex space-x-2">
              <input
                id="media-url"
                type="url"
                bind:value={mediaUrl}
                placeholder="https://example.com/image.jpg"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <button
                type="button"
                on:click={handleMediaUrl}
                disabled={!mediaUrl.trim() || isSubmitting}
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>

<div>
  <label for="avatar-url" class="block text-sm font-medium text-gray-700 mb-2">
    Avatar URL
  </label>
  <div class="flex space-x-2">
    <input
      id="avatar-url"
      type="url"
      bind:value={avatarUrl}
      placeholder="https://example.com/avatar.jpg"
      class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={isSubmitting}
    />
    <button
      type="button"
      on:click={handleAvatarUrl}
      disabled={!avatarUrl.trim() || isSubmitting}
      class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
    >
      Upload
    </button>
  </div>
</div>

          {#if uploadedFiles.length > 0}
            <div class="mt-2 text-sm text-green-600">
              <strong>Uploaded files:</strong>
              <ul class="list-disc list-inside mt-1">
                {#each uploadedFiles as file}
                  <li>{file}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>

        <div class="flex space-x-4">
          <button
            type="submit"
            disabled={isSubmitting || !parseResult?.success}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Tweet'}
          </button>
          
          <a
            href="/tweets"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            View All Tweets
          </a>
        </div>
      </form>
    </div>

    <!-- Preview Section -->
    <div class="space-y-4">
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Raw Code Preview</h3>
        
        {#if parseResult?.success && parseResult.data}
          <div class="space-y-4">
            <!-- Preview content would go here - you can import TweetDisplay component -->
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Parsed Data Preview:</strong>
              <pre class="mt-2 text-xs overflow-x-auto">{JSON.stringify(parseResult.data, null, 2)}</pre>
            </div>
          </div>
        {:else if parseResult?.error}
          <div class="text-sm text-red-600 bg-red-50 p-3 rounded">
            <strong>Parse Error:</strong>
            <div class="mt-1">{parseResult.error}</div>
          </div>
        {:else}
          <div class="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
            Start typing to see a preview of your tweet
          </div>
        {/if}
      </div>
    </div>
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
    <h3 class="text-sm font-medium text-blue-900 mb-2">New Markdown Format</h3>
    <div class="text-xs text-blue-800 space-y-2">
      <div>
        <strong>Basic Structure:</strong> Each tweet needs [name], [handle], and [body]. Optional: [avatar], [media], [time], [likes]
      </div>
      <div>
        <strong>Quote Tweets:</strong> Wrap quoted content in [quote]...[/quote] tags
      </div>
      <div>
        <strong>Reply Threads:</strong> Wrap each reply in [reply]...[/reply] tags
      </div>
      <div>
        <strong>Media Files:</strong> Use [media]file1.jpg,file2.png[/media] for multiple files
      </div>
      <div>
        <strong>Validation:</strong> Real-time validation shows errors as you type
      </div>
      <div>
        <strong>Auto-features:</strong> Missing @ in handles and missing time/likes are auto-added
      </div>
    </div>
  </div>
</div>