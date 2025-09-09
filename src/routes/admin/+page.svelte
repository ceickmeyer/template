<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  // Admin dashboard/landing page
</script>

<svelte:head>
  <title>Museum of Twitter - Admin</title>
</svelte:head>

<div class="max-w-4xl mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Museum of Twitter Admin</h1>
    <p class="text-gray-600">Manage and create your tweet archives</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Create Tweet -->
    <a
      href="/admin/create"
      class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
    >
      <div class="flex items-center mb-4">
        <svg class="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900">Create Tweet</h2>
      </div>
      <p class="text-gray-600">Manually create tweets using markdown syntax with live preview and validation.</p>
    </a>

    <!-- Parse from Clipboard -->
    <a
      href="/admin/parse"
      class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
    >
      <div class="flex items-center mb-4">
        <svg class="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900">Parse from Clipboard</h2>
      </div>
      <p class="text-gray-600">Copy tweets from Twitter/X and automatically parse them with media download.</p>
    </a>

    <!-- Manage Tweets -->
    <a
      href="/admin/tweets"
      class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500"
    >
      <div class="flex items-center mb-4">
        <svg class="w-8 h-8 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900">Manage Tweets</h2>
      </div>
      <p class="text-gray-600">View, edit, and manage all your archived tweets with search and sorting.</p>
    </a>

    <!-- View Public Site -->
    <a
      href="/"
      target="_blank"
      class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-gray-500"
    >
      <div class="flex items-center mb-4">
        <svg class="w-8 h-8 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-900">View Public Site</h2>
      </div>
      <p class="text-gray-600">See how your tweet archive looks to visitors on the public site.</p>
    </a>
  </div>

  <!-- Quick Stats -->
  <div class="mt-12 bg-gray-50 rounded-lg p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
    <div class="flex flex-wrap gap-3">
      <a
        href="/admin/create"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        New Tweet
      </a>
      <a
        href="/admin/parse"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        Parse Clipboard
      </a>
      <a
        href="/admin/tweets"
        class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
      >
        All Tweets
      </a>
    </div>
  </div>
</div>