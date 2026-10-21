// src/lib/utils/duplicates.ts
// Spotting a tweet that's already in the archive. Two tweets are duplicates
// when they're from the same handle and their text is (nearly) the same —
// compared without case, punctuation or links, and allowing small
// differences so a screenshot import still matches a copy/paste import of
// the same tweet.
import { supabase } from '$lib/supabase.js';
import { TweetMarkdownParser } from './markdownParser';
import { decodeHtmlEntities } from './twitterTextParser.js';
import type { StoredTweet } from '$lib/types/tweet';

type DuplicateCandidate = Pick<StoredTweet, 'id' | 'slug' | 'title' | 'markdown_content'>;

// Share of characters that must match (1 = identical).
const MIN_SIMILARITY = 0.9;

interface Fingerprint {
  handle: string;
  text: string;
}

function fingerprint(markdown: string): Fingerprint | null {
  const result = TweetMarkdownParser.parse(markdown);
  if (!result.success || !result.data?.handle) return null;
  const text = decodeHtmlEntities(result.data.body)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}#@]+/gu, ' ')
    .trim();
  if (!text) return null;
  return { handle: result.data.handle.replace(/^@/, '').toLowerCase(), text };
}

// Levenshtein distance turned into 0..1 similarity.
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  if (Math.abs(a.length - b.length) / longest > 1 - MIN_SIMILARITY) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return 1 - previous[b.length] / longest;
}

function sameTweet(a: Fingerprint, b: Fingerprint) {
  return a.handle === b.handle && similarity(a.text, b.text) >= MIN_SIMILARITY;
}

/**
 * The archived tweet this markdown duplicates, if any. Only tweets with the
 * same handle are fetched and compared.
 */
export async function findDuplicate(
  markdown: string,
  excludeId?: string
): Promise<Pick<StoredTweet, 'slug' | 'title'> | null> {
  const mine = fingerprint(markdown);
  if (!mine) return null;

  // Handles can contain "_", a LIKE wildcard; escape it (and % and \).
  const handlePattern = mine.handle.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data, error } = await supabase
    .from('tweets')
    .select('id, slug, title, markdown_content')
    .ilike('markdown_content', `%${handlePattern}[/handle]%`);
  if (error) throw error;

  const match = (data ?? []).find((tweet) => {
    if (tweet.id === excludeId) return false;
    const theirs = fingerprint(tweet.markdown_content);
    return theirs !== null && sameTweet(mine, theirs);
  });
  return match ? { slug: match.slug, title: match.title } : null;
}

/** Groups of two or more archived tweets that duplicate each other. */
export function findDuplicateGroups<T extends DuplicateCandidate>(tweets: T[]): T[][] {
  const byHandle = new Map<string, { tweet: T; print: Fingerprint }[]>();
  for (const tweet of tweets) {
    const print = fingerprint(tweet.markdown_content);
    if (!print) continue;
    byHandle.set(print.handle, [...(byHandle.get(print.handle) ?? []), { tweet, print }]);
  }

  const groups: T[][] = [];
  for (const entries of byHandle.values()) {
    const placed = new Set<number>();
    entries.forEach((entry, i) => {
      if (placed.has(i)) return;
      const group = [entry.tweet];
      for (let j = i + 1; j < entries.length; j++) {
        if (!placed.has(j) && sameTweet(entry.print, entries[j].print)) {
          group.push(entries[j].tweet);
          placed.add(j);
        }
      }
      if (group.length > 1) groups.push(group);
    });
  }
  return groups;
}
