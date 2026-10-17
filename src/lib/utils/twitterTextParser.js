// src/lib/utils/twitterTextParser.js

/**
 * Decodes HTML entities that end up baked literally into stored tweet text
 * (e.g. "&#39;" instead of "'"). X's API returns entity-encoded text for
 * some older tweets, and nothing upstream of storage was decoding it, so
 * [body]/[quote]/[reply] content could end up with literal "&#39;"/"&amp;"
 * etc. in markdown_content. Safe to run on already-clean text (no-op).
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (/** @type {string} */ match, /** @type {string} */ n) => {
      const code = parseInt(n, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    });
}

/** @param {string} text */
function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** @param {string} text */
function escapeAttr(text) {
  return escapeText(text).replace(/"/g, '&quot;');
}

// http(s) only (never javascript: etc.), stops at whitespace/quotes/angle
// brackets, and drops trailing punctuation so "see https://x.com." doesn't
// swallow the period.
const URL_PATTERN = /https?:\/\/[^\s<>"']*[^\s<>"'.,!?;:)\]]/g;
const HASHTAG_PATTERN = /#[a-zA-Z0-9_]+(?=\s|$|[.,!?;:)])/g;
const HANDLE_PATTERN = /@[a-zA-Z0-9_]+(?=\s|$|[.,!?;:)'])/g;

/** @param {string} url */
function displayUrl(url) {
  const short = url.replace(/^https?:\/\/(www\.)?/, '');
  return short.length > 30 ? short.slice(0, 29) + '…' : short;
}

/** @param {string} escaped */
function highlight(escaped) {
  return escaped
    .replace(HASHTAG_PATTERN, match => `<span class="twitter-highlight">${match}</span>`)
    .replace(HANDLE_PATTERN, match => `<span class="twitter-highlight">${match}</span>`);
}

/**
 * Turns stored tweet text into safe HTML for {@html}: links URLs (shortened
 * for display like Twitter does), highlights hashtags/@handles, keeps line
 * breaks.
 *
 * The text is split into URL and non-URL segments *before* escaping and
 * highlighting, and each is escaped on its own. Highlighting the whole
 * already-escaped string (as before) is what corrupted entities — the "#39"
 * inside "&#39;" matched the hashtag pattern — and it would also inject
 * <span>s into href attributes for URLs containing "#" or "@".
 * @param {string | null | undefined} text
 * @returns {string}
 */
export function parseTwitterText(text) {
  if (!text) return '';

  const decoded = decodeHtmlEntities(text);
  let html = '';
  let last = 0;

  for (const match of decoded.matchAll(URL_PATTERN)) {
    const url = match[0];
    const start = match.index ?? 0;
    html += highlight(escapeText(decoded.slice(last, start)));
    html += `<a href="${escapeAttr(url)}" class="twitter-link" target="_blank" rel="noopener noreferrer nofollow">${escapeText(displayUrl(url))}</a>`;
    last = start + url.length;
  }
  html += highlight(escapeText(decoded.slice(last)));

  return html.replace(/\n/g, '<br>');
}