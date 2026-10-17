// src/routes/api/tweets/+server.ts
// Feed pages for the homepage: ?sort=newest|oldest|shuffle&q=search&cursor=<created_at>&exclude=<featured id>
import { json, error } from '@sveltejs/kit';
import { fetchTweets, PUBLIC_CACHE, type SortOrder } from '$lib/server/feed';

const SORTS: SortOrder[] = ['newest', 'oldest', 'shuffle'];

export async function GET({ url, setHeaders }) {
  const sortParam = url.searchParams.get('sort') as SortOrder;
  const sort = SORTS.includes(sortParam) ? sortParam : 'newest';
  const search = (url.searchParams.get('q') ?? '').trim().slice(0, 200);

  try {
    const page = await fetchTweets({
      sort,
      search,
      cursor: url.searchParams.get('cursor'),
      excludeId: url.searchParams.get('exclude')
    });
    setHeaders(PUBLIC_CACHE);
    return json(page);
  } catch (err) {
    console.error('Error fetching tweets:', err);
    error(500, 'Failed to load tweets');
  }
}
