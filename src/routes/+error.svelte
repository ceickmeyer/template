<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Error {$page.status} / Museum of Twitter</title>
</svelte:head>

<div class="error-page">
  <div class="error-content">
    <h1 class="error-status">{$page.status}</h1>
    <p class="error-message">{$page.error?.message ?? 'Something went wrong'}</p>
    <a href="/" class="error-home-link">Back to timeline</a>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: var(--bg-primary, rgb(0, 0, 0));
    color: var(--text-primary, rgb(231, 233, 234));
    font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .error-content {
    text-align: center;
    padding: 32px 16px;
    max-width: 320px;
  }

  .error-status {
    font-size: 72px;
    font-weight: 800;
    line-height: 1;
    margin: 0 0 16px;
    color: rgb(29, 155, 240);
  }

  .error-message {
    font-size: 17px;
    line-height: 22px;
    color: var(--text-secondary, rgb(113, 118, 123));
    margin: 0 0 32px;
  }

  .error-home-link {
    display: inline-block;
    background-color: rgb(29, 155, 240);
    color: rgb(255, 255, 255);
    text-decoration: none;
    font-size: 15px;
    font-weight: 700;
    padding: 10px 24px;
    border-radius: 9999px;
    transition: background-color 0.2s ease;
  }

  .error-home-link:hover {
    background-color: rgb(26, 140, 216);
  }
</style>
