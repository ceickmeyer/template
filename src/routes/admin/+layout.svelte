<script lang="ts">
  import { page } from '$app/stores';
  import Navigation from '$lib/components/Navigation.svelte';

  $: isLogin = $page.url.pathname === '/admin/login';
</script>

<!--
  .admin-shell switches the theme tokens in app.css to their light values for
  the whole admin area, so shared components (UserTweetDisplay previews etc.)
  render correctly on the light Tailwind pages regardless of the public-site
  theme the visitor picked.
-->
<div class="admin-shell min-h-screen bg-gray-50 text-gray-900">
  {#if !isLogin}
    <Navigation />
  {/if}
  <slot />
</div>
