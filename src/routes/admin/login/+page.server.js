import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const { session } = await locals.safeGetSession();
  // Already logged in — send straight to admin
  if (session) throw redirect(303, '/admin');
  return {};
};

export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required.' });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return fail(400, { error: 'Invalid email or password.' });
    }

    throw redirect(303, '/admin');
  }
};
