<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';

  const links = [
    { href: '/admin/tweets', label: 'Tweets', match: (p: string) => p.startsWith('/admin/tweets') },
    { href: '/admin/parse', label: 'Import from X', match: (p: string) => p === '/admin/parse' },
    { href: '/admin/screenshot', label: 'From screenshot', match: (p: string) => p === '/admin/screenshot' },
    { href: '/admin/create', label: 'Write markdown', match: (p: string) => p === '/admin/create' },
    { href: '/admin/featured', label: 'Featured', match: (p: string) => p === '/admin/featured' }
  ];

  let menuOpen = false;
  $: pathname = $page.url.pathname;
  // Close the mobile menu whenever the route changes.
  $: pathname, (menuOpen = false);
</script>

<nav class="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
  <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
    <a href="/admin" class="shrink-0 text-base font-bold text-gray-900 hover:text-gray-700">
      Museum of Twitter <span class="font-normal text-gray-500">Admin</span>
    </a>

    <div class="hidden items-center gap-1 md:flex">
      {#each links as link}
        <a
          href={link.href}
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {link.match(pathname)
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
          aria-current={link.match(pathname) ? 'page' : undefined}
        >
          {link.label}
        </a>
      {/each}
    </div>

    <div class="hidden items-center gap-1 md:flex">
      <a href="/" target="_blank" rel="noopener" class="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900">
        Public site ↗
      </a>
      <form method="POST" action="/admin/logout" use:enhance>
        <button type="submit" class="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900">
          Sign out
        </button>
      </form>
    </div>

    <button
      type="button"
      class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden"
      aria-expanded={menuOpen}
      aria-controls="admin-mobile-menu"
      aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      on:click={() => (menuOpen = !menuOpen)}
    >
      <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        {#if menuOpen}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        {:else}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        {/if}
      </svg>
    </button>
  </div>

  {#if menuOpen}
    <div id="admin-mobile-menu" class="space-y-1 border-t border-gray-200 bg-white px-2 py-2 md:hidden">
      {#each links as link}
        <a
          href={link.href}
          class="block rounded-md px-3 py-2 text-base font-medium {link.match(pathname)
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'}"
          aria-current={link.match(pathname) ? 'page' : undefined}
        >
          {link.label}
        </a>
      {/each}
      <a href="/" target="_blank" rel="noopener" class="block rounded-md px-3 py-2 text-base text-gray-700 hover:bg-gray-100">
        Public site ↗
      </a>
      <form method="POST" action="/admin/logout" use:enhance>
        <button type="submit" class="block w-full rounded-md px-3 py-2 text-left text-base text-gray-500 hover:bg-gray-100">
          Sign out
        </button>
      </form>
    </div>
  {/if}
</nav>
