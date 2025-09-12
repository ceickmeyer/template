<!-- src/lib/components/TweetParser.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  
  export let onTweetParsed: (markdown: string) => void = () => {};
  
  let element: HTMLDivElement;
  let editor: Editor;
  let extractedText = '';
  let errorMessage = '';

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [
        StarterKit,
        Link.configure({
          openOnClick: false,
        }),
      ],
      content: '<p>Paste your tweet content here...</p>',
      onUpdate: ({ editor }) => {
        extractedText = editor.getText();
      },
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

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
    const comments = Math.floor(Math.random() * 500) + 1;
    const retweets = Math.floor(comments * (2 + Math.random() * 3));
    const likes = Math.floor(comments * (10 + Math.random() * 90));
    
    return `${comments},${retweets},${likes}`;
  }

  function buildMarkdown(name: string, handle: string, body: string, time: string): string {
    let markdown = `[name]${name}[/name]\n[handle]${handle}[/handle]\n[body]${body}[/body]`;
    
    if (time) {
      markdown += `\n[time]${time}[/time]`;
    }
    
    markdown += `\n[likes]${generateRealisticLikes()}[/likes]`;
    
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
    }
  }

  // Template functions for preserving existing content
  function hasExistingContent(): boolean {
    if (!editor) return false;
    const currentText = editor.getText().trim();
    return currentText !== '' && currentText !== 'Paste your tweet content here...';
  }

  function insertTemplate(template: string) {
    if (!editor) return;
    
    if (hasExistingContent()) {
      // Prepend template with blank line before existing content
      const currentContent = editor.getHTML();
      editor.commands.setContent(`${template}\n\n${currentContent}`);
    } else {
      // Replace placeholder content
      editor.commands.setContent(template);
    }
  }

  function loadSimpleSample() {
    const template = `[name]Steve Jobs[/name]
[handle]@stevejobs[/handle]
[body]Just released the iPhone. Revolutionary device that will change everything.[/body]
[time]9:19 AM · Jan 9, 2007[/time]
[likes]1240,892,5830[/likes]`;
    insertTemplate(template);
  }

  function loadQuoteSample() {
    const template = `[name]Elon Musk[/name]
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
    insertTemplate(template);
  }

  function loadThreadSample() {
    const template = `[name]Mark Zuckerberg[/name] 
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
    insertTemplate(template);
  }

  function loadMediaSample() {
    const template = `[name]Tim Cook[/name]
[handle]@tim_cook[/handle]
[avatar]avatar-example.jpg[/avatar]
[body]Behind the scenes at our latest product photoshoot. Innovation meets design. 📸✨[/body]
[media]photo1.jpg,photo2.jpg,video1.mp4[/media]
[time]3:45 PM · Today[/time]
[likes]5240,2890,12450[/likes]`;
    insertTemplate(template);
  }
</script>

<div class="space-y-4">
  <div>
    <div class="flex justify-between items-center mb-2">
      <label class="block text-sm font-medium text-gray-700">
        Rich Text Tweet Parser
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
      </div>
    </div>
    
    <!-- TipTap Editor -->
    <div 
      bind:this={element}
      class="min-h-[300px] w-full px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 prose prose-sm max-w-none"
    ></div>
  </div>

  <!-- Show extracted text -->
  {#if extractedText && extractedText !== 'Paste your tweet content here...'}
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
      disabled={!extractedText || extractedText === 'Paste your tweet content here...'}
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