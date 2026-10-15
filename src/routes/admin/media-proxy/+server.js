// src/routes/admin/media-proxy/+server.js
//
// Server-side fetch for downloading tweet media during clipboard import.
// Replaces the public api.allorigins.win CORS proxy the parser used to rely
// on — that was a third-party single point of failure with no uptime/rate
// guarantees. Fetching from our own server has no CORS restriction at all,
// so this just needs to not become an open proxy: it requires an admin
// session and only allows the fixed set of hosts X actually serves media
// from.
import { error } from '@sveltejs/kit';

const ALLOWED_HOSTS = new Set(['pbs.twimg.com', 'video.twimg.com', 'abs.twimg.com']);

export async function GET({ url, locals }) {
  const { session } = await locals.safeGetSession();
  if (!session) {
    throw error(401, 'Not authenticated');
  }

  const target = url.searchParams.get('url');
  if (!target) {
    throw error(400, 'Missing url parameter');
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    throw error(400, 'Invalid url parameter');
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw error(400, `Host not allowed: ${parsed.hostname}`);
  }

  const upstream = await fetch(parsed.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MuseumOfTwitterArchiver/1.0)' }
  });

  if (!upstream.ok || !upstream.body) {
    throw error(502, `Upstream fetch failed: ${upstream.status}`);
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'no-store'
    }
  });
}
