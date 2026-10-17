<!-- src/routes/admin/screenshot/+page.svelte -->
<!--
  Recreate a tweet from a screenshot (for tweets that no longer exist).
  Claude reads the text and finds the avatar/media boxes; you correct
  anything it got wrong; the avatar and media are cropped out of the
  screenshot in the browser and only uploaded when you save.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { TweetMarkdownParser, generateSlug, type TweetData } from '$lib/utils/markdownParser.js';
  import { deleteMediaFiles } from '$lib/utils/tweetAdmin';
  import UserTweetDisplay from '$lib/components/UserTweetDisplay.svelte';

  type Kind = 'avatar' | 'media' | 'quote-avatar' | 'quote-media';
  // Boxes are kept in the original screenshot's pixels.
  type Rect = { id: number; kind: Kind; x: number; y: number; w: number; h: number };
  type ApiBox = { found: boolean; x: number; y: number; width: number; height: number };

  const KIND_LABEL: Record<Kind, string> = {
    avatar: 'Avatar',
    media: 'Media',
    'quote-avatar': 'Quote avatar',
    'quote-media': 'Quote media'
  };
  // Long edge / pixel count above which the API downsizes images itself —
  // stay under it so the box coordinates it returns match what it saw.
  const MAX_EDGE = 1568;
  const MAX_PIXELS = 1_150_000;
  // Claude Sonnet 5.5 list price per million tokens (input / output).
  const PRICE = { input: 2, output: 10 };

  let image: HTMLImageElement | null = null;
  let imageUrl = '';
  let naturalW = 0;
  let naturalH = 0;
  let stage: HTMLDivElement;
  let fileInput: HTMLInputElement;

  let rects: Rect[] = [];
  let nextId = 1;
  let drawKind: Kind | null = null;
  let crops: Record<number, { blob: Blob; url: string }> = {};

  let title = '';
  let name = '';
  let handle = '';
  let replyingTo = '';
  let body = '';
  let time = '';
  let replies = 0;
  let retweets = 0;
  let likes = 0;
  let hasQuote = false;
  let quoteName = '';
  let quoteHandle = '';
  let quoteBody = '';
  let quoteTime = '';

  let extracting = false;
  let saving = false;
  let errorMessage = '';
  let successSlug = '';
  let usageNote = '';
  let dragOver = false;

  function errorText(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  // ---- loading a screenshot ------------------------------------------------

  async function loadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      errorMessage = 'That file is not an image.';
      return;
    }
    reset();
    imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imageUrl;
    await img.decode();
    image = img;
    naturalW = img.naturalWidth;
    naturalH = img.naturalHeight;
    await extract();
  }

  function handlePaste(event: ClipboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable="true"]')) return;
    const file = Array.from(event.clipboardData?.items ?? [])
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile();
    if (file) {
      event.preventDefault();
      loadFile(file);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  }

  function reset() {
    Object.values(crops).forEach((c) => URL.revokeObjectURL(c.url));
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    crops = {};
    rects = [];
    image = null;
    imageUrl = '';
    title = name = handle = replyingTo = body = time = '';
    replies = retweets = likes = 0;
    hasQuote = false;
    quoteName = quoteHandle = quoteBody = quoteTime = '';
    errorMessage = '';
    successSlug = '';
    usageNote = '';
    drawKind = null;
  }

  // ---- AI extraction -------------------------------------------------------

  async function extract() {
    if (!image) return;
    extracting = true;
    errorMessage = '';

    try {
      const scale = Math.min(1, MAX_EDGE / Math.max(naturalW, naturalH), Math.sqrt(MAX_PIXELS / (naturalW * naturalH)));
      const width = Math.round(naturalW * scale);
      const height = Math.round(naturalH * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);

      let dataUrl = canvas.toDataURL('image/png');
      let mediaType = 'image/png';
      if (dataUrl.length > 3_000_000) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        mediaType = 'image/jpeg';
      }

      const response = await fetch('/admin/screenshot-extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: dataUrl.split(',')[1], mediaType, width, height })
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message ?? `Extraction failed (${response.status})`);
      }

      const { tweet, usage } = await response.json();
      applyExtraction(tweet, 1 / scale);
      const cost = (usage.inputTokens * PRICE.input + usage.outputTokens * PRICE.output) / 1_000_000;
      usageNote = `Read by Claude Sonnet 5.5 · ${usage.inputTokens + usage.outputTokens} tokens · ~$${cost.toFixed(3)}`;
    } catch (error) {
      console.error('Extraction error:', error);
      errorMessage = `Couldn't read the screenshot: ${errorText(error)}. You can still fill in the fields and draw the boxes yourself.`;
    } finally {
      extracting = false;
    }
  }

  function applyExtraction(tweet: any, toOriginal: number) {
    name = tweet.name ?? '';
    handle = tweet.handle ?? '';
    replyingTo = tweet.replyingTo ?? '';
    body = tweet.body ?? '';
    time = tweet.time ?? '';
    replies = tweet.replies ?? 0;
    retweets = tweet.retweets ?? 0;
    likes = tweet.likes ?? 0;
    hasQuote = !!tweet.quote?.found;
    quoteName = tweet.quote?.name ?? '';
    quoteHandle = tweet.quote?.handle ?? '';
    quoteBody = tweet.quote?.body ?? '';
    quoteTime = tweet.quote?.time ?? '';

    const snippet = body.replace(/\s+/g, ' ').trim();
    title = `${name} - ${snippet.length > 50 ? `${snippet.slice(0, 50)}…` : snippet}`;

    const add = (kind: Kind, b: ApiBox | undefined) => {
      if (!b?.found || b.width <= 0 || b.height <= 0) return;
      rects.push(clampRect({ id: nextId++, kind, x: b.x * toOriginal, y: b.y * toOriginal, w: b.width * toOriginal, h: b.height * toOriginal }));
    };
    rects = [];
    add('avatar', tweet.avatarBox);
    (tweet.mediaBoxes ?? []).forEach((b: ApiBox) => add('media', { ...b, found: true }));
    if (hasQuote) {
      add('quote-avatar', tweet.quote.avatarBox);
      (tweet.quote.mediaBoxes ?? []).forEach((b: ApiBox) => add('quote-media', { ...b, found: true }));
    }
    rects = rects;
    rects.forEach(updateCrop);
  }

  // ---- boxes ---------------------------------------------------------------

  function clampRect(r: Rect): Rect {
    const w = Math.max(4, Math.min(r.w, naturalW));
    const h = Math.max(4, Math.min(r.h, naturalH));
    return {
      ...r,
      w: Math.round(w),
      h: Math.round(h),
      x: Math.round(Math.max(0, Math.min(r.x, naturalW - w))),
      y: Math.round(Math.max(0, Math.min(r.y, naturalH - h)))
    };
  }

  function pointerToImage(event: PointerEvent) {
    const bounds = stage.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * naturalW,
      y: ((event.clientY - bounds.top) / bounds.height) * naturalH
    };
  }

  function drag(event: PointerEvent, rect: Rect, mode: 'move' | 'resize') {
    event.preventDefault();
    event.stopPropagation();
    const start = pointerToImage(event);
    const original = { ...rect };

    const onMove = (moveEvent: PointerEvent) => {
      const point = pointerToImage(moveEvent);
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      let next: Rect;
      if (mode === 'move') {
        next = { ...original, x: original.x + dx, y: original.y + dy };
      } else {
        next = { ...original, w: original.w + dx, h: original.h + dy };
        if (next.kind.endsWith('avatar')) next.h = next.w; // avatars are square
      }
      Object.assign(rect, clampRect(next));
      rects = rects;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      updateCrop(rect);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Draw mode: press on the screenshot and drag out a new box.
  function startDraw(event: PointerEvent) {
    if (!drawKind || !image) return;
    const kind = drawKind;
    drawKind = null;
    const point = pointerToImage(event);
    // Only one avatar per tweet / quote — replace an existing one.
    if (kind.endsWith('avatar')) removeRects((r) => r.kind === kind);
    const rect: Rect = { id: nextId++, kind, x: Math.round(point.x), y: Math.round(point.y), w: 4, h: 4 };
    rects = [...rects, rect];
    if (kind.startsWith('quote')) hasQuote = true;
    drag(event, rect, 'resize');
  }

  function removeRects(predicate: (r: Rect) => boolean) {
    rects
      .filter(predicate)
      .forEach((r) => {
        if (crops[r.id]) URL.revokeObjectURL(crops[r.id].url);
        delete crops[r.id];
      });
    rects = rects.filter((r) => !predicate(r));
    crops = crops;
  }

  function updateCrop(rect: Rect) {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = rect.w;
    canvas.height = rect.h;
    canvas.getContext('2d')!.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    canvas.toBlob((blob) => {
      if (!blob || !rects.includes(rect)) return;
      if (crops[rect.id]) URL.revokeObjectURL(crops[rect.id].url);
      crops = { ...crops, [rect.id]: { blob, url: URL.createObjectURL(blob) } };
    }, 'image/png');
  }

  // Reading order for media: top-to-bottom rows, then left-to-right — this
  // matches X's grid (e.g. the 3-image layout: left, top-right, bottom-right).
  function ordered(kind: Kind) {
    return rects
      .filter((r) => r.kind === kind)
      .sort((a, b) => Math.round(a.y / 24) - Math.round(b.y / 24) || a.x - b.x);
  }

  // ---- building the tweet --------------------------------------------------

  function buildTweet(fileFor: (rect: Rect) => string | undefined): TweetData {
    const files = (kind: Kind) => ordered(kind).map(fileFor).filter((f): f is string => !!f);
    const tweet: TweetData = {
      name: name.trim(),
      handle: handle.trim(),
      body: body.trim(),
      time: time.trim() || undefined,
      likes: `${replies || 0},${retweets || 0},${likes || 0}`,
      replyingTo: replyingTo.trim() || undefined,
      avatar: files('avatar')[0],
      media: files('media')
    };
    if (hasQuote) {
      tweet.quote = {
        name: quoteName.trim(),
        handle: quoteHandle.trim(),
        body: quoteBody.trim(),
        time: quoteTime.trim() || undefined,
        avatar: files('quote-avatar')[0],
        media: files('quote-media')
      };
    }
    return tweet;
  }

  // The arguments are only there so Svelte re-runs this when any of them change.
  function previewFor(..._deps: unknown[]) {
    return TweetMarkdownParser.generateMarkdown(buildTweet((r) => crops[r.id]?.url));
  }
  $: previewMarkdown = image
    ? previewFor(rects, crops, name, handle, body, time, replies, retweets, likes, replyingTo, hasQuote, quoteName, quoteHandle, quoteBody, quoteTime)
    : '';
  $: previewResult = previewMarkdown ? TweetMarkdownParser.parse(previewMarkdown) : null;

  async function save() {
    const check = TweetMarkdownParser.parse(TweetMarkdownParser.generateMarkdown(buildTweet(() => 'x')));
    if (!check.success || !check.data) {
      errorMessage = check.error ?? 'Fill in the name, handle and text first.';
      return;
    }
    const pending = rects.filter((r) => !crops[r.id]);
    if (pending.length) {
      errorMessage = 'Still cropping — try again in a moment.';
      return;
    }

    saving = true;
    errorMessage = '';
    const uploaded = new Map<number, string>();
    const stamp = Date.now();

    try {
      for (const [i, rect] of rects.entries()) {
        const fileName = `${rect.kind}-${stamp}-${i}-screenshot.png`;
        const { error } = await supabase.storage
          .from('tweet-media')
          .upload(fileName, crops[rect.id].blob, { contentType: 'image/png' });
        if (error) throw new Error(`Uploading ${KIND_LABEL[rect.kind].toLowerCase()}: ${error.message}`);
        uploaded.set(rect.id, fileName);
      }

      const tweet = buildTweet((r) => uploaded.get(r.id));
      const slug = generateSlug(tweet);
      const { error } = await supabase.from('tweets').insert([
        {
          title: title.trim() || `${tweet.name} (${tweet.handle})`,
          slug,
          markdown_content: TweetMarkdownParser.generateMarkdown(tweet)
        }
      ]);
      if (error) throw error;

      reset();
      successSlug = slug;
    } catch (error) {
      console.error('Save error:', error);
      errorMessage = `Failed to save: ${errorText(error)}`;
      // Don't leave the crops from a failed save in the bucket.
      deleteMediaFiles([...uploaded.values()]).catch((err) => console.error('Cleanup failed:', err));
    } finally {
      saving = false;
    }
  }

  onDestroy(() => {
    Object.values(crops).forEach((c) => URL.revokeObjectURL(c.url));
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  });
</script>

<svelte:head>
  <title>Import from screenshot — Museum of Twitter Admin</title>
</svelte:head>

<svelte:window on:paste={handlePaste} />

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
  <div class="mb-6">
    <h1 class="text-2xl font-bold">Import from screenshot</h1>
    <p class="mt-1 text-gray-600">
      For tweets that don't exist anymore. Paste a screenshot anywhere on this page, drop it, or pick a file — Claude reads it, then you fix
      anything it got wrong.
    </p>
  </div>

  {#if successSlug}
    <div class="mb-6 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
      Saved.
      <a href="/admin/tweets/{successSlug}/edit" class="font-medium underline">Edit it</a> ·
      <a href="/{successSlug}" target="_blank" rel="noopener" class="font-medium underline">View public page ↗</a>
    </div>
  {/if}
  {#if errorMessage}
    <div class="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
  {/if}

  {#if !image}
    <button
      type="button"
      class="flex h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white text-gray-500 transition-colors {dragOver
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 hover:border-gray-400'}"
      on:click={() => fileInput.click()}
      on:dragover|preventDefault={() => (dragOver = true)}
      on:dragleave={() => (dragOver = false)}
      on:drop={handleDrop}
    >
      <span class="text-base">Paste a screenshot (Ctrl+V / ⌘V), drop it here, or click to choose a file</span>
      <span class="mt-1 text-xs">PNG, JPEG, WebP or GIF</span>
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      class="hidden"
      on:change={(e) => {
        const file = e.currentTarget.files?.[0];
        if (file) loadFile(file);
        e.currentTarget.value = '';
      }}
    />
  {:else}
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Screenshot + boxes -->
      <div>
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-gray-700">Draw a box:</span>
          {#each Object.entries(KIND_LABEL) as [kind, label]}
            <button
              type="button"
              on:click={() => (drawKind = drawKind === kind ? null : (kind as Kind))}
              class="rounded border px-2 py-1 text-xs {drawKind === kind
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
            >
              {label}
            </button>
          {/each}
        </div>
        <p class="mb-2 text-xs text-gray-500">
          {#if drawKind}
            Drag on the screenshot to draw the {KIND_LABEL[drawKind].toLowerCase()} box.
          {:else}
            Drag a box to move it, drag its corner to resize, × to remove.
          {/if}
        </p>

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          bind:this={stage}
          class="relative touch-none overflow-hidden rounded-lg border border-gray-200 select-none {drawKind ? 'cursor-crosshair' : ''}"
          on:pointerdown={startDraw}
        >
          <img src={imageUrl} alt="Screenshot being imported" class="block w-full" draggable="false" />
          {#if extracting}
            <div class="absolute inset-0 flex items-center justify-center bg-white/70">
              <div class="text-center">
                <div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p class="mt-2 text-sm text-gray-700">Reading the screenshot…</p>
              </div>
            </div>
          {/if}
          {#each rects as rect (rect.id)}
            <div
              class="box box-{rect.kind}"
              style="left: {(rect.x / naturalW) * 100}%; top: {(rect.y / naturalH) * 100}%; width: {(rect.w / naturalW) * 100}%; height: {(rect.h /
                naturalH) *
                100}%;"
              on:pointerdown={(e) => drag(e, rect, 'move')}
            >
              <span class="box-label">{KIND_LABEL[rect.kind]}</span>
              <button
                type="button"
                class="box-remove"
                aria-label="Remove {KIND_LABEL[rect.kind]} box"
                on:pointerdown={(e) => e.stopPropagation()}
                on:click={() => removeRects((r) => r.id === rect.id)}>×</button
              >
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="box-handle" on:pointerdown={(e) => drag(e, rect, 'resize')}></div>
            </div>
          {/each}
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            on:click={extract}
            disabled={extracting}
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Read again
          </button>
          <button type="button" on:click={reset} class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Start over
          </button>
          {#if usageNote}
            <span class="text-xs text-gray-500">{usageNote}</span>
          {/if}
        </div>
      </div>

      <!-- Fields + preview -->
      <form on:submit|preventDefault={save} class="space-y-4">
        <fieldset class="space-y-3 rounded-lg border border-gray-200 bg-white p-4" disabled={extracting || saving}>
          <div>
            <label for="title" class="mb-1 block text-sm font-medium text-gray-700">Title (admin only)</label>
            <input id="title" bind:value={title} class="field" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="name" class="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input id="name" bind:value={name} class="field" />
            </div>
            <div>
              <label for="handle" class="mb-1 block text-sm font-medium text-gray-700">Handle</label>
              <input id="handle" bind:value={handle} class="field" placeholder="@handle" />
            </div>
          </div>
          <div>
            <label for="body" class="mb-1 block text-sm font-medium text-gray-700">Text</label>
            <textarea id="body" bind:value={body} rows="6" class="field"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="time" class="mb-1 block text-sm font-medium text-gray-700">Time</label>
              <input id="time" bind:value={time} class="field" placeholder="7:10 PM · Apr 26, 2014" />
            </div>
            <div>
              <label for="replying-to" class="mb-1 block text-sm font-medium text-gray-700">Replying to</label>
              <input id="replying-to" bind:value={replyingTo} class="field" placeholder="@handle (optional)" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label for="replies" class="mb-1 block text-sm font-medium text-gray-700">Replies</label>
              <input id="replies" type="number" min="0" bind:value={replies} class="field" />
            </div>
            <div>
              <label for="retweets" class="mb-1 block text-sm font-medium text-gray-700">Reposts</label>
              <input id="retweets" type="number" min="0" bind:value={retweets} class="field" />
            </div>
            <div>
              <label for="likes" class="mb-1 block text-sm font-medium text-gray-700">Likes</label>
              <input id="likes" type="number" min="0" bind:value={likes} class="field" />
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" bind:checked={hasQuote} /> Quotes another tweet
          </label>
          {#if hasQuote}
            <div class="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="quote-name" class="mb-1 block text-sm font-medium text-gray-700">Quoted name</label>
                  <input id="quote-name" bind:value={quoteName} class="field" />
                </div>
                <div>
                  <label for="quote-handle" class="mb-1 block text-sm font-medium text-gray-700">Quoted handle</label>
                  <input id="quote-handle" bind:value={quoteHandle} class="field" />
                </div>
              </div>
              <div>
                <label for="quote-body" class="mb-1 block text-sm font-medium text-gray-700">Quoted text</label>
                <textarea id="quote-body" bind:value={quoteBody} rows="3" class="field"></textarea>
              </div>
              <div>
                <label for="quote-time" class="mb-1 block text-sm font-medium text-gray-700">Quoted time</label>
                <input id="quote-time" bind:value={quoteTime} class="field" />
              </div>
            </div>
          {/if}
        </fieldset>

        <div>
          <h2 class="mb-2 text-sm font-medium text-gray-700">Preview</h2>
          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {#if previewResult?.success}
              <UserTweetDisplay tweet={{ markdown_content: previewMarkdown }} clickable={false} />
            {:else}
              <p class="p-4 text-sm text-gray-500">{previewResult?.error ?? 'Fill in the fields to see a preview.'}</p>
            {/if}
          </div>
        </div>

        <button
          type="submit"
          disabled={extracting || saving || !previewResult?.success}
          class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save tweet'}
        </button>
      </form>
    </div>
  {/if}
</div>

<style>
  .field {
    width: 100%;
    border: 1px solid rgb(209 213 219);
    border-radius: 0.375rem;
    background: white;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .field:focus {
    outline: 2px solid rgb(59 130 246);
    outline-offset: -1px;
  }

  .box {
    position: absolute;
    border: 2px solid var(--box-color);
    background: color-mix(in srgb, var(--box-color) 12%, transparent);
    cursor: move;
  }

  .box-avatar {
    --box-color: rgb(239 68 68);
  }

  .box-media {
    --box-color: rgb(22 163 74);
  }

  .box-quote-avatar {
    --box-color: rgb(217 70 239);
    border-style: dashed;
  }

  .box-quote-media {
    --box-color: rgb(37 99 235);
    border-style: dashed;
  }

  .box-label {
    position: absolute;
    top: -1px;
    left: -1px;
    transform: translateY(-100%);
    padding: 0 4px;
    background: var(--box-color);
    color: white;
    font-size: 10px;
    line-height: 16px;
    white-space: nowrap;
    pointer-events: none;
  }

  .box-remove {
    position: absolute;
    top: -1px;
    right: -1px;
    transform: translateY(-100%);
    width: 16px;
    height: 16px;
    border: none;
    background: var(--box-color);
    color: white;
    font-size: 12px;
    line-height: 16px;
    cursor: pointer;
  }

  .box-handle {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 12px;
    height: 12px;
    border: 2px solid white;
    border-radius: 50%;
    background: var(--box-color);
    cursor: nwse-resize;
  }
</style>
