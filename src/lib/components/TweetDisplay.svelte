<!-- src/lib/components/TweetDisplay.svelte -->
<script lang="ts">
  import { TweetMarkdownParser, formatLikes } from '$lib/utils/markdownParser.js';
  import { supabase } from '$lib/supabase.js';
  
  export let tweet;
  
  $: parseResult = TweetMarkdownParser.parse(tweet.markdown_content);
  $: parsedTweet = parseResult.success ? parseResult.data : null;
  $: metrics = parsedTweet?.likes ? formatLikes(parsedTweet.likes) : { comments: 0, retweets: 0, likes: 0 };
  
  // Generate avatar from name initials
  function getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  
  // Generate consistent color from name
  function getAvatarColor(name: string): string {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
  
  // Get media/avatar URLs
  function getMediaUrl(filename: string): string {
    const { data } = supabase.storage.from('tweet-media').getPublicUrl(filename);
    return data.publicUrl;
  }
  
  // Format numbers (1000 -> 1K)
  function formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }

  // Component for rendering individual tweet content
  function renderTweetContent(tweetData, isQuote = false, isReply = false) {
    const containerClass = isQuote 
      ? "border border-gray-300 rounded-lg p-3 mb-3 bg-gray-50"
      : isReply 
      ? "border-l-2 border-gray-200 pl-4"
      : "";
    
    const avatarSize = isQuote ? "w-6 h-6" : isReply ? "w-8 h-8" : "w-12 h-12";
    const nameTextSize = isQuote ? "text-xs" : isReply ? "text-sm" : "text-sm";
    const bodyTextSize = isQuote ? "text-xs" : isReply ? "text-sm" : "text-sm";
    const timeTextSize = isQuote ? "text-xs" : isReply ? "text-sm" : "text-sm";
    
    return { containerClass, avatarSize, nameTextSize, bodyTextSize, timeTextSize };
  }
</script>

{#if parseResult && !parseResult.success}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800 text-sm">Parse Error: {parseResult.error}</p>
    <details class="mt-2">
      <summary class="text-xs cursor-pointer">Raw markdown</summary>
      <pre class="text-xs mt-1 overflow-x-auto">{tweet.markdown_content}</pre>
    </details>
  </div>
{:else if parsedTweet}
  <div class="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
    <!-- Main Tweet -->
    <div class="flex items-start space-x-3">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        {#if parsedTweet.avatar}
          <img 
            src={getMediaUrl(parsedTweet.avatar)} 
            alt="{parsedTweet.name} avatar"
            class="w-12 h-12 rounded-full object-cover"
            loading="lazy"
          />
        {:else}
          <div class="{getAvatarColor(parsedTweet.name)} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold">
            {getInitials(parsedTweet.name)}
          </div>
        {/if}
      </div>
      
      <!-- Tweet Content -->
      <div class="flex-1 min-w-0">
        <!-- Name and Handle -->
        <div class="flex items-center space-x-2 mb-2">
          <h3 class="font-bold text-gray-900 text-sm truncate">
            {parsedTweet.name}
          </h3>
          <span class="text-gray-500 text-sm truncate">
            {parsedTweet.handle}
          </span>
        </div>
        
        <!-- Tweet Body -->
        <div class="text-gray-900 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
          {parsedTweet.body}
        </div>
        
        <!-- Main Tweet Media -->
        {#if parsedTweet.media && parsedTweet.media.length > 0}
          <div class="mb-3">
            <div class="grid {parsedTweet.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 rounded-lg overflow-hidden">
              {#each parsedTweet.media as mediaFile}
                <div class="relative">
                  {#if mediaFile.endsWith('.mp4') || mediaFile.endsWith('.mov') || mediaFile.includes('video')}
                    <video
                      src={getMediaUrl(mediaFile)}
                      class="w-full h-48 object-cover rounded-lg"
                      controls
                      preload="metadata"
                    >
                      <track kind="captions">
                    </video>
                  {:else}
                    <img
                      src={getMediaUrl(mediaFile)}
                      alt="Tweet media"
                      class="w-full h-48 object-cover rounded-lg"
                      loading="lazy"
                    />
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Quote Tweet -->
        {#if parsedTweet.quote}
          <div class="border border-gray-300 rounded-lg p-3 mb-3 bg-gray-50">
            <div class="flex items-start space-x-2">
              <!-- Quote Avatar -->
              <div class="flex-shrink-0">
                {#if parsedTweet.quote.avatar}
                  <img 
                    src={getMediaUrl(parsedTweet.quote.avatar)} 
                    alt="{parsedTweet.quote.name} avatar"
                    class="w-6 h-6 rounded-full object-cover"
                    loading="lazy"
                  />
                {:else}
                  <div class="{getAvatarColor(parsedTweet.quote.name)} w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(parsedTweet.quote.name)}
                  </div>
                {/if}
              </div>
              
              <!-- Quote Content -->
              <div class="flex-1 min-w-0">
                <!-- Quote Name and Handle -->
                <div class="flex items-center space-x-2 mb-2">
                  <span class="font-bold text-gray-900 text-xs">
                    {parsedTweet.quote.name}
                  </span>
                  <span class="text-gray-500 text-xs">
                    {parsedTweet.quote.handle}
                  </span>
                </div>
                
                <!-- Quote Body -->
                <div class="text-gray-900 text-xs leading-relaxed mb-2 whitespace-pre-wrap">
                  {parsedTweet.quote.body}
                </div>
                
                <!-- Quote Media -->
                {#if parsedTweet.quote.media && parsedTweet.quote.media.length > 0}
                  <div class="mb-2">
                    <div class="grid {parsedTweet.quote.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1 rounded overflow-hidden">
                      {#each parsedTweet.quote.media as mediaFile}
                        <div class="relative">
                          {#if mediaFile.endsWith('.mp4') || mediaFile.endsWith('.mov') || mediaFile.includes('video')}
                            <video
                              src={getMediaUrl(mediaFile)}
                              class="w-full h-24 object-cover rounded"
                              controls
                              preload="metadata"
                            >
                              <track kind="captions">
                            </video>
                          {:else}
                            <img
                              src={getMediaUrl(mediaFile)}
                              alt="Quote media"
                              class="w-full h-24 object-cover rounded"
                              loading="lazy"
                            />
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
                
                <!-- Quote Time -->
                {#if parsedTweet.quote.time}
                  <div class="text-gray-500 text-xs">
                    {parsedTweet.quote.time}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/if}
        
        <!-- Timestamp -->
        {#if parsedTweet.time}
          <div class="text-gray-500 text-sm mb-3">
            {parsedTweet.time}
          </div>
        {/if}
        
        <!-- Tweet Metrics -->
        <div class="flex items-center space-x-6 text-gray-500 text-sm">
          <div class="flex items-center space-x-1 hover:text-blue-500 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03 8-9 8s9 3.582 9 8z" />
            </svg>
            <span>{formatNumber(metrics.comments)}</span>
          </div>
          
          <div class="flex items-center space-x-1 hover:text-green-500 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>{formatNumber(metrics.retweets)}</span>
          </div>
          
          <div class="flex items-center space-x-1 hover:text-red-500 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{formatNumber(metrics.likes)}</span>
          </div>
        </div>
        
        <!-- Replies -->
        {#if parsedTweet.replies && parsedTweet.replies.length > 0}
          <div class="mt-4 space-y-3">
            {#each parsedTweet.replies as reply}
              <div class="border-l-2 border-gray-200 pl-4">
                <div class="flex items-start space-x-2">
                  <!-- Reply Avatar -->
                  <div class="flex-shrink-0">
                    {#if reply.avatar}
                      <img 
                        src={getMediaUrl(reply.avatar)} 
                        alt="{reply.name} avatar"
                        class="w-8 h-8 rounded-full object-cover"
                        loading="lazy"
                      />
                    {:else}
                      <div class="{getAvatarColor(reply.name)} w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(reply.name)}
                      </div>
                    {/if}
                  </div>
                  
                  <!-- Reply Content -->
                  <div class="flex-1 min-w-0">
                    <!-- Reply Header -->
                    <div class="flex items-center space-x-2 mb-2">
                      <span class="font-bold text-gray-900 text-sm">
                        {reply.name}
                      </span>
                      <span class="text-gray-500 text-sm">
                        {reply.handle}
                      </span>
                      {#if reply.time}
                        <span class="text-gray-500 text-sm">·</span>
                        <span class="text-gray-500 text-sm">
                          {reply.time}
                        </span>
                      {/if}
                    </div>
                    
                    <!-- Reply Body -->
                    <div class="text-gray-900 text-sm mb-2 leading-relaxed whitespace-pre-wrap">
                      {reply.body}
                    </div>
                    
                    <!-- Reply Media -->
                    {#if reply.media && reply.media.length > 0}
                      <div class="mb-2">
                        <div class="grid {reply.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 rounded-lg overflow-hidden">
                          {#each reply.media as mediaFile}
                            <div class="relative">
                              {#if mediaFile.endsWith('.mp4') || mediaFile.endsWith('.mov') || mediaFile.includes('video')}
                                <video
                                  src={getMediaUrl(mediaFile)}
                                  class="w-full h-32 object-cover rounded-lg"
                                  controls
                                  preload="metadata"
                                >
                                  <track kind="captions">
                                </video>
                              {:else}
                                <img
                                  src={getMediaUrl(mediaFile)}
                                  alt="Reply media"
                                  class="w-full h-32 object-cover rounded-lg"
                                  loading="lazy"
                                />
                              {/if}
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    
                    <!-- Reply Metrics -->
                    {#if reply.likes}
                      <div class="flex items-center space-x-4 text-gray-500 text-xs">
                        <span>{formatNumber(formatLikes(reply.likes).comments)}</span>
                        <span>{formatNumber(formatLikes(reply.likes).retweets)}</span>
                        <span>{formatNumber(formatLikes(reply.likes).likes)}</span>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Debug Info -->
    <details class="mt-4 text-xs text-gray-400">
      <summary class="cursor-pointer">Debug</summary>
      <pre class="mt-2 overflow-x-auto">{JSON.stringify(parsedTweet, null, 2)}</pre>
    </details>
  </div>
{:else}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-800 text-sm">Failed to parse tweet: {tweet.title}</p>
    <details class="mt-2">
      <summary class="text-xs cursor-pointer">Raw markdown</summary>
      <pre class="text-xs mt-1 overflow-x-auto">{tweet.markdown_content}</pre>
    </details>
  </div>
{/if}