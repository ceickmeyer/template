<script lang="ts">
	import { supabase } from '$lib/supabase.js';
	import { onMount } from 'svelte';

	let contacts = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			const { data, error: fetchError } = await supabase
				.from('contacts')
				.select('*')
				.order('created_at', { ascending: false });

			if (fetchError) {
				throw fetchError;
			}

			contacts = data || [];
		} catch (err) {
			console.error('Error fetching contacts:', err);
			error = 'Failed to load contacts';
		} finally {
			loading = false;
		}
	});

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>All Contacts</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-4xl mx-auto">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-extrabold text-gray-900">All Contacts</h1>
			<p class="mt-2 text-sm text-gray-600">
				View all submitted contact information
			</p>
			<div class="mt-4">
				<a
					href="/"
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					Add New Contact
				</a>
			</div>
		</div>

		{#if loading}
			<div class="text-center">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
				<p class="mt-2 text-sm text-gray-600">Loading contacts...</p>
			</div>
		{:else if error}
			<div class="rounded-md bg-red-50 p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{:else if contacts.length === 0}
			<div class="text-center">
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
				<p class="mt-1 text-sm text-gray-500">Get started by adding your first contact.</p>
			</div>
		{:else}
			<div class="bg-white shadow overflow-hidden sm:rounded-md">
				<ul class="divide-y divide-gray-200">
					{#each contacts as contact (contact.id)}
						<li class="px-6 py-4">
							<div class="flex items-center justify-between">
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between">
										<h3 class="text-lg font-medium text-gray-900 truncate">
											{contact.name}
										</h3>
										<p class="text-sm text-gray-500">
											{formatDate(contact.created_at)}
										</p>
									</div>
									<div class="mt-2 flex items-center text-sm text-gray-600">
										<svg class="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
										<span class="truncate">{contact.email}</span>
									</div>
									<div class="mt-1 flex items-center text-sm text-gray-600">
										<svg class="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										<span class="truncate">{contact.address}, {contact.city}</span>
									</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
			
			<div class="mt-6 text-center text-sm text-gray-500">
				Total contacts: {contacts.length}
			</div>
		{/if}
	</div>
</div>