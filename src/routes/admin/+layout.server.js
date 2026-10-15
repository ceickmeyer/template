import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
  // Let the login page load without a session
  if (url.pathname === '/admin/login') {
    return {};
  }

  const { session, user } = await locals.safeGetSession();

  if (!session) {
    throw redirect(303, '/admin/login');
  }

  return { session, user };
};
