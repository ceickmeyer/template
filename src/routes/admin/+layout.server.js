import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
  // Let the login page load without a session
  if (url.pathname === '/admin/login') {
    return {};
  }

  const { session, user } = await locals.safeGetSession();

  if (!session || !user) {
    throw redirect(303, '/admin/login');
  }

  // Only the verified user is sent to the page. Returning the raw session
  // made SvelteKit serialize session.user, and every read of that property
  // logs Supabase's "user object from getSession() could be insecure"
  // warning — that's the repeated message in the dev console.
  return { user: { id: user.id, email: user.email } };
};
