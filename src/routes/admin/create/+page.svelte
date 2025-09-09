<!-- src/routes/+page.svelte -->
<script lang="ts">
  import TweetCreator from '$lib/components/TweetCreator.svelte';
	import TweetParser from '$lib/components/TweetParser.svelte';
	import TweetCard from '$lib/components/ui/TweetCard.svelte';
  
</script>

<svelte:head>
  <title>Museum of Twitter</title>
</svelte:head>


<TweetCreator />