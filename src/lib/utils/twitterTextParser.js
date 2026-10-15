// src/lib/utils/twitterTextParser.js

/**
 * Decodes HTML entities that end up baked literally into stored tweet text
 * (e.g. "&#39;" instead of "'"). X's API returns entity-encoded text for
 * some older tweets, and nothing upstream of storage was decoding it, so
 * [body]/[quote]/[reply] content could end up with literal "&#39;"/"&amp;"
 * etc. in markdown_content. Safe to run on already-clean text (no-op).
 * @param {string} text
 */
export function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

/**
 * Parses tweet text to highlight hashtags and handles with Twitter blue color
 * Excludes trailing punctuation from the highlighting
 */
export function parseTwitterText(text) {
  if (!text) return text;

  // Decode any HTML entities already in the stored text, then re-encode
  // from scratch so {@html} rendering is safe and consistent.
  const decoded = decodeHtmlEntities(text);

  // Only &, <, > need escaping here — this text is inserted as HTML
  // *element content* via {@html}, not as an attribute value, and quotes
  // are only unsafe in the latter. Escaping ' and " used to produce
  // "&#39;"/"&quot;" in the output, which the hashtag regex below would
  // then partially match (the "#39" inside "&#39;" looks exactly like a
  // hashtag followed by a semicolon), splitting the entity into
  // "&" + "<span>#39</span>" + ";" and corrupting it into broken markup.
  const escaped = decoded
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const hashtagPattern = /#[a-zA-Z0-9_]+(?=\s|$|[.,!?;:)])/g;
  const handlePattern = /@[a-zA-Z0-9_]+(?=\s|$|[.,!?;:)])/g;

  return escaped
    .replace(hashtagPattern, match => `<span class="twitter-highlight">${match}</span>`)
    .replace(handlePattern, match => `<span class="twitter-highlight">${match}</span>`)
    .replace(/\n/g, '<br>');
}