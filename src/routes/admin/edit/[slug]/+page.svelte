<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(() => {
    goto(`/admin/tweets/${$page.params.slug}/edit`, { replaceState: true });
  });
</script>