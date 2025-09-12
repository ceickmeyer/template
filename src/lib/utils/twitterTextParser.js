// src/lib/utils/twitterTextParser.js

/**
 * Parses tweet text to highlight hashtags and handles with Twitter blue color
 * Excludes trailing punctuation from the highlighting
 */
export function parseTwitterText(text) {
  if (!text) return text;
  
  // Regex patterns for hashtags and handles
  // Matches # or @ followed by alphanumeric characters and underscores
  // Excludes trailing punctuation by using word boundaries
  const hashtagPattern = /#[a-zA-Z0-9_]+(?=\s|$|[.,!?;:)])/g;
  const handlePattern = /@[a-zA-Z0-9_]+(?=\s|$|[.,!?;:)])/g;
  
  let result = text;
  
  // Replace hashtags first
  result = result.replace(hashtagPattern, (match) => {
    return `<span class="twitter-highlight">${match}</span>`;
  });
  
  // Replace handles
  result = result.replace(handlePattern, (match) => {
    return `<span class="twitter-highlight">${match}</span>`;
  });
  
  return result;
}