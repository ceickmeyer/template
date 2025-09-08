<!-- src/lib/components/Navigation.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  
  // Don't show navigation on feed pages
  $: showNavigation = !$page.url.pathname.startsWith('/feed');
</script>

{#if showNavigation}
  <nav class="bg-white border-b border-gray-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-8">
          <!-- Logo/Brand -->
          <div class="flex-shrink-0">
            <h1 class="text-xl font-bold text-gray-900">Tweet Archive</h1>
          </div>
          
          <!-- Navigation Links -->
          <div class="hidden md:flex space-x-8">
            <a
              href="/"
              class="px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname === '/' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}"
            >
              Create Tweet (Markdown)
            </a>
            
            <a
              href="/parse"
              class="px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname === '/parse' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}"
            >
              Create Tweet (Clipboard)
            </a>
            
            <a
              href="/tweets"
              class="px-3 py-2 rounded-md text-sm font-medium {$page.url.pathname.startsWith('/tweets') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}"
            >
              Admin: View/Edit Tweets
            </a>
            
            <a
              href="/feed"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Public Feed
            </a>
          </div>
        </div>
        
        <!-- Mobile menu button -->
        <div class="md:hidden flex items-center">
          <button
            type="button"
            class="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            aria-expanded="false"
            on:click={() => {
              const menu = document.getElementById('mobile-menu');
              menu?.classList.toggle('hidden');
            }}
          >
            <span class="sr-only">Open main menu</span>
            <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div class="md:hidden hidden" id="mobile-menu">
      <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
        <a
          href="/"
          class="block px-3 py-2 rounded-md text-base font-medium {$page.url.pathname === '/' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}"
        >
          Create Tweet (Markdown)
        </a>
        
        <a
          href="/parse"
          class="block px-3 py-2 rounded-md text-base font-medium {$page.url.pathname === '/parse' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}"
        >
          Create Tweet (Clipboard)
        </a>
        
        <a
          href="/tweets"
          class="block px-3 py-2 rounded-md text-base font-medium {$page.url.pathname.startsWith('/tweets') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}"
        >
          Admin: View/Edit Tweets
        </a>
        
        <a
          href="/feed"
          class="block px-3 py-2 rounded-md text-base font-medium {$page.url.pathname.startsWith('/feed') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}"
        >
          Public Feed
        </a>
      </div>
    </div>
  </nav>
{/if}