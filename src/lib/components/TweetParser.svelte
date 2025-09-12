<!-- src/lib/components/TweetParser.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Image from '@tiptap/extension-image';
  import Link from '@tiptap/extension-link';
  import { supabase } from '$lib/supabase.js';
  
  export let onTweetParsed: (markdown: string) => void = () => {};
  
  let element: HTMLDivElement;
  let editor: Editor;
  let extractedText = '';
  let extractedImages: Array<{url: string, file?: File, uploaded?: boolean, filename?: string, isAvatar?: boolean}> = [];
  let isProcessing = false;
  let errorMessage = '';

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [
        StarterKit,
        Image,
        Link.configure({
          openOnClick: false,
        }),
      ],
      content: '<p>Paste your tweet content here...</p>',
      onUpdate: ({ editor }) => {
        // Extract text content
        extractedText = editor.getText();
      },
      editorProps: {
        handlePaste: async (view, event, slice) => {
          // Let TipTap handle the paste first
          const handled = false; // Return false to let TipTap process normally
          
          // Then extract our content
          setTimeout(async () => {
            await extractContentFromEditor();
          }, 100);
          
          return handled;
        },
      },
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  async function extractContentFromEditor() {
    if (!editor) return;
    
    isProcessing = true;
    errorMessage = '';
    
    try {
      // Get the HTML content
      const htmlContent = editor.getHTML();
      
      // Extract text with better structure preservation
      const textContent = editor.getText();
      extractedText = textContent;
      
      // Extract images from the editor content
      const doc = editor.state.doc;
      const images: Array<{url: string, isAvatar?: boolean}> = [];
      
      doc.descendants((node) => {
        if (node.type.name === 'image') {
          const src = node.attrs.src;
          if (src) {
            images.push({
              url: src,
              isAvatar: images.length === 0 // First image is avatar
            });
          }
        }
      });
      
      // Process images - convert data URLs to files and upload
      if (images.length > 0) {
        extractedImages = [];
        
        for (const [index, img] of images.entries()) {
          if (img.url.startsWith('data:')) {
            // Convert data URL to file
            const file = await dataUrlToFile(img.url, `pasted-image-${index}.png`);
            if (file) {
              const imageData = {
                url: img.url,
                file,
                uploaded: false,
                isAvatar: index === 0
              };
              
              extractedImages.push(imageData);
              
              // Upload to Supabase
              await uploadImage(imageData);
            }
          }
        }
      }
      
      console.log('Extracted content:', {
        text: extractedText,
        imageCount: extractedImages.length
      });
      
    } catch (error) {
      console.error('Error extracting content:', error);
      errorMessage = 'Failed to process pasted content';
    } finally {
      isProcessing = false;
    }
  }

  async function dataUrlToFile(dataUrl: string, filename: string): Promise<File | null> {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      console.error('Error converting data URL:', error);
      return null;
    }
  }

  async function uploadImage(imageData: typeof extractedImages[0]) {
    if (!imageData.file) return;
    
    try {
      const fileName = `media-${Date.now()}-${imageData.file.name}`;
      
      const { data, error } = await supabase.storage
        .from('tweet-media')
        .upload(fileName, imageData.file);

      if (error) throw error;

      imageData.uploaded = true;
      imageData.filename = fileName;
      
      // Trigger reactivity
      extractedImages = [...extractedImages];
      
    } catch (error) {
      console.error('Upload error:', error);
      errorMessage = `Failed to upload image: ${imageData.file?.name}`;
    }
  }

 function parseTweetToMarkdown(): string {
  const text = extractedText.trim();
  // Simple parsing - find key patterns
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length < 3) {
    // Try parsing concatenated text
    const handleMatch = text.match(/@[\w_]+/);
    if (!handleMatch) {
      throw new Error('Could not find @handle in pasted content');
    }
    
    const handlePos = handleMatch.index || 0;
    const handle = handleMatch[0];
    
    // Fix: Find the last space before the handle, or use the handle position
    let nameEndPos = handlePos;
    const textBeforeHandle = text.substring(0, handlePos);
    const lastSpacePos = textBeforeHandle.lastIndexOf(' ');
    if (lastSpacePos > -1) {
      nameEndPos = lastSpacePos;
    }
    
    const name = text.substring(0, nameEndPos).trim();
    const afterHandle = text.substring(handlePos + handle.length).trim();
    
    // Find timestamp
    const timeMatch = afterHandle.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)[^·]*(?:·[^·]*\d{4})?)/i);
    let body = afterHandle;
    let time = '';
    
    if (timeMatch) {
      const timePos = timeMatch.index || 0;
      body = afterHandle.substring(0, timePos).trim();
      time = timeMatch[1].replace(/\s*·\s*\d+[KkMm]?\s*Views?\s*$/i, '').trim();
    }
    
    // Clean up body
    body = body.replace(/\s*Image\s*$/i, '').trim();
    body = body.replace(/\s*·\s*\d+[KkMm]?\s*Views?\s*$/i, '').trim();
    
    return buildMarkdown(name, handle, body, time);
  } else {
    // Line-based parsing
    const name = lines[0];
    let handle = '';
    let body = '';
    let time = '';
    
    // Find handle
    for (const line of lines) {
      if (line.startsWith('@')) {
        handle = line;
        break;
      }
    }
    
    if (!handle) {
      throw new Error('Could not find @handle in lines');
    }
    
    // Find time
    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('AM') || lines[i].includes('PM') || /\d{1,2}:\d{2}/.test(lines[i])) {
        time = lines[i].replace(/\s*·\s*\d+[KkMm]?\s*Views?\s*$/i, '').trim();
        timeLineIndex = i;
        break;
      }
    }
    
    // Get body lines
    const handleIndex = lines.indexOf(handle);
    const bodyStart = handleIndex + 1;
    const bodyEnd = timeLineIndex > 0 ? timeLineIndex : lines.length;
    
    body = lines.slice(bodyStart, bodyEnd)
      .filter(line => !line.match(/^Image$/i))
      .join('\n')
      .trim();
    
    return buildMarkdown(name, handle, body, time);
  }
}

function generateRealisticLikes(): string {
  // Generate realistic engagement numbers
  // Comments are smallest, retweets ~2-5x comments, likes ~10-100x comments
  const comments = Math.floor(Math.random() * 500) + 1; // 1-500
  const retweets = Math.floor(comments * (2 + Math.random() * 3)); // 2-5x comments
  const likes = Math.floor(comments * (10 + Math.random() * 90)); // 10-100x comments
  
  return `${comments},${retweets},${likes}`;
}

function buildMarkdown(name: string, handle: string, body: string, time: string): string {
  let markdown = `[name]${name}[/name]\n[handle]${handle}[/handle]\n[body]${body}[/body]`;
  
  if (time) {
    markdown += `\n[time]${time}[/time]`;
  }
  
  // Add likes
  markdown += `\n[likes]${generateRealisticLikes()}[/likes]`;
  
  // Add images with line breaks
  const avatarImage = extractedImages.find(img => img.isAvatar && img.uploaded && img.filename);
  if (avatarImage) {
    markdown += `\n[avatar]${avatarImage.filename}[/avatar]`;
  }
  
  const mediaImages = extractedImages.filter(img => !img.isAvatar && img.uploaded && img.filename).map(img => img.filename);
  if (mediaImages.length > 0) {
    markdown += `\n[media]${mediaImages.join(',')}[/media]`;
  }
  
  return markdown;
}

  async function handleParseClick() {
    try {
      errorMessage = '';
      const markdown = parseTweetToMarkdown();
      onTweetParsed(markdown);
    } catch (error) {
      console.error('Parse error:', error);
      errorMessage = error.message || 'Failed to parse tweet';
    }
  }

  function clearEditor() {
    if (editor) {
      editor.commands.setContent('<p>Paste your tweet content here...</p>');
      extractedText = '';
      extractedImages.forEach(img => {
        if (img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
      extractedImages = [];
    }
  }
</script>

<div class="space-y-4">
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Rich Text Tweet Parser
    </label>
    
    <!-- TipTap Editor -->
    <div 
      bind:this={element}
      class="min-h-[300px] w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 prose prose-sm max-w-none"
    ></div>
  </div>

  {#if isProcessing}
    <div class="text-sm text-blue-600">
      Processing pasted content...
    </div>
  {/if}

  <!-- Show extracted images -->
  {#if extractedImages.length > 0}
    <div class="p-3 bg-gray-50 rounded-lg">
      <h4 class="text-sm font-medium text-gray-900 mb-2">Extracted Images</h4>
      <div class="grid grid-cols-3 gap-2">
        {#each extractedImages as img}
          <div class="relative">
            <img 
              src={img.url} 
              alt="Extracted" 
              class="w-full h-20 object-cover rounded border-2 {img.uploaded ? 'border-green-300' : 'border-yellow-300'}"
            />
            <div class="absolute top-1 left-1 px-1 py-0.5 text-xs rounded {img.uploaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
              {img.uploaded ? (img.isAvatar ? '👤' : '🖼️') : '⏳'}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Show extracted text -->
  {#if extractedText}
    <div class="p-3 bg-gray-100 rounded-lg">
      <h4 class="text-sm font-medium text-gray-900 mb-2">Extracted Text</h4>
      <pre class="text-xs whitespace-pre-wrap">{extractedText}</pre>
    </div>
  {/if}

  <!-- Error display -->
  {#if errorMessage}
    <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-800">{errorMessage}</p>
    </div>
  {/if}

  <!-- Action buttons -->
  <div class="flex space-x-2">
    <button
      type="button"
      on:click={handleParseClick}
      disabled={!extractedText || isProcessing}
      class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
    >
      Parse Tweet → Markdown
    </button>
    
    <button
      type="button"
      on:click={clearEditor}
      class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
    >
      Clear
    </button>
  </div>
</div>

<style>
  :global(.ProseMirror) {
    outline: none;
  }
  
  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    color: #9CA3AF;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
</style>