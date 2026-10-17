import { redirect } from '@sveltejs/kit';

// Legacy URL — the edit page moved under /admin/tweets/[slug]/edit.
// Redirecting on the server avoids rendering an empty page first.
export function load({ params }) {
  throw redirect(308, `/admin/tweets/${params.slug}/edit`);
}
