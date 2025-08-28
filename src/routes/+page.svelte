<script lang="ts">
	import { supabase } from '$lib/supabase.js';
	import { goto } from '$app/navigation';

	let name = '';
	let email = '';
	let address = '';
	let city = '';
	let isSubmitting = false;
	let errorMessage = '';
	let successMessage = '';

	async function handleSubmit() {
		if (!name.trim() || !email.trim() || !address.trim() || !city.trim()) {
			errorMessage = 'Please fill in all fields';
			return;
		}

		isSubmitting = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Generate a simple session ID (in a real app, you might want something more robust)
			const userSession = crypto.randomUUID();
			
			const { data, error } = await supabase
				.from('contacts')
				.insert([
					{
						name: name.trim(),
						email: email.trim(),
						address: address.trim(),
						city: city.trim(),
						user_session: userSession
					}
				])
				.select();

			if (error) {
				throw error;
			}

			successMessage = 'Contact submitted successfully!';
			name = '';
			email = '';
			address = '';
			city = '';
			
			// Redirect to view page after 2 seconds
			setTimeout(() => {
				goto('/contacts');
			}, 2000);

		} catch (error) {
			console.error('Error:', error);
			errorMessage = error.message || 'Failed to submit contact';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Submit Contact</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Add Contact
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				Enter contact information below
			</p>
		</div>
		
		<form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
			<div class="rounded-md shadow-sm space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700">Full Name</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						required
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
						placeholder="Enter full name"
						disabled={isSubmitting}
					/>
				</div>
				
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
						placeholder="Enter email address"
						disabled={isSubmitting}
					/>
				</div>
				
				<div>
					<label for="address" class="block text-sm font-medium text-gray-700">Street Address</label>
					<input
						id="address"
						type="text"
						bind:value={address}
						required
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
						placeholder="Enter street address"
						disabled={isSubmitting}
					/>
				</div>
				
				<div>
					<label for="city" class="block text-sm font-medium text-gray-700">City</label>
					<input
						id="city"
						type="text"
						bind:value={city}
						required
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
						placeholder="Enter city"
						disabled={isSubmitting}
					/>
				</div>
			</div>

			{#if errorMessage}
				<div class="rounded-md bg-red-50 p-4">
					<p class="text-sm text-red-800">{errorMessage}</p>
				</div>
			{/if}

			{#if successMessage}
				<div class="rounded-md bg-green-50 p-4">
					<p class="text-sm text-green-800">{successMessage}</p>
				</div>
			{/if}

			<div>
				<button
					type="submit"
					disabled={isSubmitting}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? 'Submitting...' : 'Add Contact'}
				</button>
			</div>
			
			<div class="text-center">
				<a href="/contacts" class="text-indigo-600 hover:text-indigo-500">
					View all contacts
				</a>
			</div>
		</form>
	</div>
</div>