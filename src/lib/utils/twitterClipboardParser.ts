// src/lib/utils/twitterClipboardParser.ts

import { TweetMarkdownParser, type TweetData } from './markdownParser';
import { decodeHtmlEntities } from './twitterTextParser.js';

export interface ParsedQuote {
  name: string;
  handle: string;
  body: string;
  time: string;
  avatarUrl?: string;
  mediaUrls: string[];
  // Set instead of every other field when the quoted tweet has since been
  // deleted/suspended — X represents this as a "TweetTombstone" rather than
  // real tweet data.
  unavailable?: string;
}

export interface ParsedTwitterData {
  name: string;
  handle: string;
  body: string;
  time: string;
  views?: string;
  avatarUrl?: string;
  mediaUrls: string[];
  videoUrl?: string;
  unsupportedMediaCount: number;
  links: string[];
  counts?: { replies: number; retweets: number; likes: number };
  // X shows this as "Replying to @handle" above the tweet body — distinct
  // from a curated [reply] chain, which is a thread you build by archiving
  // several tweets together.
  replyingTo?: string;
  quote?: ParsedQuote;
}

// Payload shape written to the clipboard by the "museum-of-twitter-archiver"
// Tampermonkey script (tools/tampermonkey/museum-of-twitter-archiver.user.js).
// It runs on x.com itself, so it can read the live DOM and (more
// importantly) intercept X's own GraphQL responses — meaning it can supply
// real engagement counts, quoted-tweet content (including detecting when
// the quoted tweet was deleted), and for videos, the actual
// video.twimg.com mp4 URL — none of which is recoverable from a plain
// copy/paste.
interface ArchiverPayload {
  __source: 'museum-of-twitter-archiver';
  version: number;
  name?: string;
  handle?: string;
  body?: string;
  time?: string;
  views?: string;
  avatarUrl?: string;
  mediaUrls?: string[];
  videoUrl?: string;
  counts?: { replies?: number; retweets?: number; likes?: number };
  replyingTo?: string;
  quote?: {
    name?: string;
    handle?: string;
    body?: string;
    time?: string;
    avatarUrl?: string;
    mediaUrls?: string[];
    unavailable?: string;
  };
}

export function looksLikeArchiverPayload(raw: string): boolean {
  return raw.trimStart().startsWith('{') && raw.includes('"museum-of-twitter-archiver"');
}

function normalizeQuote(quote: ArchiverPayload['quote']): ParsedQuote | undefined {
  if (!quote) return undefined;

  if (quote.unavailable) {
    return { name: '', handle: '', body: '', time: '', mediaUrls: [], unavailable: quote.unavailable };
  }

  return {
    name: decodeHtmlEntities(quote.name) || 'Unknown User',
    handle: quote.handle || '@unknown',
    body: decodeHtmlEntities(quote.body) || '',
    time: quote.time || '',
    avatarUrl: quote.avatarUrl ? upgradeTwimgUrl(quote.avatarUrl, true) : undefined,
    mediaUrls: (quote.mediaUrls || []).map(url => upgradeTwimgUrl(url, false))
  };
}

export function parseArchiverPayload(raw: string): ParsedTwitterData | null {
  try {
    const payload = JSON.parse(raw) as ArchiverPayload;
    if (payload.__source !== 'museum-of-twitter-archiver') return null;

    const mediaUrls = (payload.mediaUrls || []).map(url => upgradeTwimgUrl(url, false));
    const avatarUrl = payload.avatarUrl ? upgradeTwimgUrl(payload.avatarUrl, true) : '';

    let counts: ParsedTwitterData['counts'];
    if (payload.counts) {
      counts = {
        replies: payload.counts.replies ?? 0,
        retweets: payload.counts.retweets ?? 0,
        likes: payload.counts.likes ?? 0
      };
    }

    return {
      name: decodeHtmlEntities(payload.name) || 'Unknown User',
      handle: payload.handle || '@unknown',
      body: decodeHtmlEntities(payload.body) || '',
      time: payload.time || '',
      views: payload.views || '',
      avatarUrl,
      mediaUrls,
      videoUrl: payload.videoUrl || undefined,
      unsupportedMediaCount: 0,
      links: [],
      counts,
      replyingTo: payload.replyingTo || undefined,
      quote: normalizeQuote(payload.quote)
    };
  } catch (error) {
    console.error('Error parsing archiver payload:', error);
    return null;
  }
}

export function parseTwitterClipboard(htmlContent: string): ParsedTwitterData | null {
  try {
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Extract user name and handle more carefully
    const nameElement = doc.querySelector('[data-testid="User-Name"]');
    let name = nameElement?.textContent?.trim() || '';
    
    // Extract handle - look for @username pattern
    const handleMatch = htmlContent.match(/@[\w]+/);
    let handle = handleMatch ? handleMatch[0] : '';
    
    // Fix the name/handle merging issue
    if (name && handle && name.includes('@')) {
      // If name contains @, it likely got merged with handle
      const atIndex = name.indexOf('@');
      if (atIndex > 0) {
        // Split at the @ symbol
        const actualName = name.substring(0, atIndex).trim();
        const possibleHandle = '@' + name.substring(atIndex + 1).trim();
        
        // Use the split name and verify handle
        name = actualName;
        if (possibleHandle.match(/@[\w]+/)) {
          handle = possibleHandle;
        }
      }
    }
    
    // Ensure handle starts with @ if it doesn't already
    if (handle && !handle.startsWith('@')) {
      handle = '@' + handle;
    }
    
    // Extract tweet text with better line break handling
    const tweetTextElement = doc.querySelector('[data-testid="tweetText"]');
    let body = '';
    
    if (tweetTextElement) {
      body = extractTextWithBetterLineBreaks(tweetTextElement);
    }
    
    // Extract timestamp
    const timeElement = doc.querySelector('time');
    const time = timeElement?.textContent?.trim() || '';
    
    // Extract view count
    const viewsMatch = htmlContent.match(/(\d+(?:,\d+)*)\s*Views?/i);
    const views = viewsMatch ? viewsMatch[1] : '';
    
    // Extract avatar URL. The data-testid hook is X's primary structure, but
    // it drifts whenever they ship frontend changes, so fall back to the URL
    // pattern itself (profile images always live under /profile_images/).
    const avatarImg =
      doc.querySelector('[data-testid="Tweet-User-Avatar"] img') ||
      doc.querySelector('img[src*="/profile_images/"]');
    const avatarUrl = upgradeTwimgUrl(avatarImg?.getAttribute('src') || '', true);

    // Extract media URLs (images and videos). X renders video via
    // MSE/blob: URLs rather than a plain <video src>, so a real <video>/
    // <source> src is almost always a blob: or data: URL copied along with
    // the DOM — those can't be fetched outside the page that created them.
    // We still collect them (as unsupportedMediaCount) so the UI can tell
    // the user media was attached but needs manual upload, instead of
    // silently dropping it.
    const mediaElements = doc.querySelectorAll(
      'img[src*="pbs.twimg.com"], video[src], video source[src]'
    );
    const mediaUrls: string[] = [];
    let unsupportedMediaCount = 0;

    mediaElements.forEach(element => {
      const src = element.getAttribute('src');
      if (!src || src.includes('profile_images')) return; // profile pic, not tweet media

      if (src.startsWith('blob:') || src.startsWith('data:')) {
        unsupportedMediaCount += 1;
        return;
      }

      mediaUrls.push(upgradeTwimgUrl(src, false));
    });

    // Extract all links from the tweet
    const linkElements = doc.querySelectorAll('a[href]');
    const links: string[] = [];

    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('/') && !href.includes('twitter.com') && !href.includes('x.com')) {
        links.push(href);
      }
    });

    return {
      // textContent already decodes entities during HTML parsing, but
      // decode defensively anyway in case the source was double-escaped.
      name: decodeHtmlEntities(name) || 'Unknown User',
      handle: handle || '@unknown',
      body: decodeHtmlEntities(body) || '',
      time: time || '',
      views,
      avatarUrl: avatarUrl || '',
      mediaUrls,
      unsupportedMediaCount,
      links
    };
    
  } catch (error) {
    console.error('Error parsing Twitter clipboard:', error);
    return null;
  }
}

function extractTextWithBetterLineBreaks(element: Element): string {
  let result = '';
  
  // Walk through child nodes to capture structure and preserve explicit line breaks
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      result += text;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      
      if (el.tagName === 'A') {
        const linkText = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';
        
        if (href.startsWith('http')) {
          result += `${linkText} (${href})`;
        } else {
          result += linkText;
        }
      } else if (el.tagName === 'BR') {
        result += '\n';
      } else {
        // Recursively process other elements
        result += extractTextWithBetterLineBreaks(el);
      }
    }
  });
  
  // Only clean up excessive whitespace, preserve intentional line breaks
  return result.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').trim();
}

// Rewrite a pbs.twimg.com URL to request the largest available rendition.
// Tweet media uses a `?format=jpg&name=small` query suffix; profile images
// instead bake the size into the filename itself (`..._normal.jpg`,
// `..._bigger.jpg`, `..._200x200.jpg`). The old version of this function
// only tried to strip/append the query-param form, which doesn't touch
// profile image filenames at all and — because twimg URLs almost always
// already end in `.jpg` before any query string — usually skipped its own
// upgrade step too, so images stayed at whatever (often thumbnail)
// resolution the clipboard happened to capture.
function upgradeTwimgUrl(url: string, isAvatar: boolean): string {
  if (!url || !url.includes('pbs.twimg.com')) return url;

  const [base] = url.split('?');

  if (isAvatar) {
    // Profile images (/profile_images/...) only support the filename-suffix
    // sizing scheme (_normal, _bigger, _200x200, _400x400, or no suffix at
    // all for original size) — they 404 on the ?format=&name= query-string
    // resize API below, which is specific to /media/ and /card_img/.
    // Confirmed live: appending that query string to a working
    // _400x400.jpg avatar URL turned it into a 404.
    return base.replace(/_(normal|bigger|mini|200x200|400x400)(\.\w+)$/i, '_400x400$2');
  }

  const extMatch = base.match(/\.(jpg|jpeg|png|webp)$/i);
  const ext = (extMatch?.[1] || 'jpg').toLowerCase();
  const withoutExt = base.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  return `${withoutExt}?format=${ext}&name=orig`;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4'
};

// Throws on failure instead of swallowing it. The old version returned null
// on any error, so the admin page's UI had no way to tell "nothing was
// attached" apart from "the download silently failed" — it reported
// success either way. Callers should catch this per-item and surface the
// real reason instead of treating a null/skip as fine.
export async function downloadImage(url: string): Promise<File> {
  // Fetch through our own server (/admin/media-proxy) instead of a public
  // third-party CORS proxy: no uptime/rate-limit dependency on a service we
  // don't control, and it only allows X's own media hosts. Also used for
  // videoUrl from the archiver script, so it has to accept video/mp4.
  const proxyUrl = `/admin/media-proxy?url=${encodeURIComponent(url)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Failed to fetch media (${response.status})${detail ? `: ${detail}` : ''}`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('Downloaded media was empty');
  }

  const mimeType = blob.type || 'image/jpeg';
  const extension = EXTENSION_BY_MIME[mimeType] || 'jpg';
  const filename = `twitter-media-${Date.now()}.${extension}`;

  return new File([blob], filename, { type: mimeType });
}

function generateRealisticLikes(): string {
  // Generate realistic engagement numbers
  // Comments are smallest, retweets ~2-5x comments, likes ~10-100x comments
  const comments = Math.floor(Math.random() * 500) + 1; // 1-500
  const retweets = Math.floor(comments * (2 + Math.random() * 3)); // 2-5x comments
  const likes = Math.floor(comments * (10 + Math.random() * 90)); // 10-100x comments
  return `${comments},${retweets},${likes}`;
}

// Filename prefixes written by admin/parse/+page.svelte's upload step —
// kept as strict prefixes (not substring checks) so "quote-avatar-..." and
// "quote-media-..." can't be mistaken for the main tweet's own avatar/media
// just because they also contain those words.
const MAIN_AVATAR_PREFIX = 'avatar-';
const MAIN_MEDIA_PREFIX = 'media-';
const QUOTE_AVATAR_PREFIX = 'quote-avatar-';
const QUOTE_MEDIA_PREFIX = 'quote-media-';

export function convertToMarkdown(parsedData: ParsedTwitterData, uploadedFiles: string[] = []): string {
  // Use real counts when the archiver script captured them; otherwise fall
  // back to a plausible placeholder, since plain copy/paste doesn't carry
  // engagement numbers at all.
  const likes = parsedData.counts
    ? `${parsedData.counts.replies},${parsedData.counts.retweets},${parsedData.counts.likes}`
    : generateRealisticLikes();

  const tweetData: TweetData = {
    name: parsedData.name,
    handle: parsedData.handle,
    body: parsedData.body,
    time: parsedData.time || undefined,
    likes,
    replyingTo: parsedData.replyingTo,
    avatar: uploadedFiles.find(f => f.startsWith(MAIN_AVATAR_PREFIX) && !f.startsWith(QUOTE_AVATAR_PREFIX)),
    media: uploadedFiles.filter(f => f.startsWith(MAIN_MEDIA_PREFIX) && !f.startsWith(QUOTE_MEDIA_PREFIX))
  };

  if (parsedData.quote) {
    tweetData.quote = parsedData.quote.unavailable
      ? { name: '', handle: '', body: '', unavailable: parsedData.quote.unavailable }
      : {
          name: parsedData.quote.name,
          handle: parsedData.quote.handle,
          body: parsedData.quote.body,
          time: parsedData.quote.time || undefined,
          avatar: uploadedFiles.find(f => f.startsWith(QUOTE_AVATAR_PREFIX)),
          media: uploadedFiles.filter(f => f.startsWith(QUOTE_MEDIA_PREFIX))
        };
  }

  return TweetMarkdownParser.generateMarkdown(tweetData);
}