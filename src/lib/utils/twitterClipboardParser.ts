// src/lib/utils/twitterClipboardParser.ts

export interface ParsedTwitterData {
  name: string;
  handle: string;
  body: string;
  time: string;
  avatarUrl?: string;
  mediaUrls: string[];
  links: string[];
}

export function parseTwitterClipboard(htmlContent: string): ParsedTwitterData | null {
  try {
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Extract user name
    const nameElement = doc.querySelector('[data-testid="User-Name"]');
    const name = nameElement?.textContent?.trim() || '';
    
    // Extract handle - look for @username pattern
    const handleMatch = htmlContent.match(/@[\w]+/);
    const handle = handleMatch ? handleMatch[0] : '';
    
    // Extract tweet text with better line break handling
    const tweetTextElement = doc.querySelector('[data-testid="tweetText"]');
    let body = '';
    
    if (tweetTextElement) {
      // Get the inner HTML and process it more carefully
      const innerHTML = tweetTextElement.innerHTML;
      
      // Look for patterns that indicate line breaks in Twitter's structure
      // Twitter often uses specific whitespace patterns or nested spans
      body = extractTextWithBetterLineBreaks(tweetTextElement);
    }
    
    // Extract timestamp
    const timeElement = doc.querySelector('time');
    const time = timeElement?.textContent?.trim() || '';
    
    // Extract view count (but we won't use it per your request)
    const viewsMatch = htmlContent.match(/(\d+(?:,\d+)*)\s*Views?/i);
    const views = viewsMatch ? viewsMatch[1] : '';
    
    // Extract avatar URL
    const avatarImg = doc.querySelector('[data-testid="Tweet-User-Avatar"] img');
    const avatarUrl = avatarImg?.getAttribute('src') || '';
    
    // Extract media URLs (images and videos)
    const mediaElements = doc.querySelectorAll('img[src*="pbs.twimg.com"], video[src]');
    const mediaUrls: string[] = [];
    
    mediaElements.forEach(element => {
      const src = element.getAttribute('src');
      if (src && !src.includes('profile_images')) { // Exclude profile images
        mediaUrls.push(src);
      }
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
      name: name || 'Unknown User',
      handle: handle || '@unknown',
      body: body || '',
      time: time || '',
      views,
      avatarUrl: avatarUrl || '',
      mediaUrls,
      links
    };
    
  } catch (error) {
    console.error('Error parsing Twitter clipboard:', error);
    return null;
  }
}

function extractTextWithBetterLineBreaks(element: Element): string {
  // Get all text content first, then process it
  const rawText = element.textContent || '';
  
  // Look for the pattern where there's a link followed by text
  // Twitter often structures this as: <a>link</a><span>whitespace</span><span>more text</span>
  let result = '';
  let parts: string[] = [];
  
  // Walk through child nodes to capture structure
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) {
        parts.push(text.trim());
      } else if (text.includes('\n') || text.length > 2) {
        // This might be a line break indicator
        parts.push('\n');
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      
      if (el.tagName === 'A') {
        const linkText = el.textContent?.trim() || '';
        const href = el.getAttribute('href') || '';
        
        if (href.startsWith('http')) {
          parts.push(`${linkText} (${href})`);
        } else {
          parts.push(linkText);
        }
      } else if (el.tagName === 'BR') {
        parts.push('\n');
      } else {
        // For spans and other elements, check if they contain text or line breaks
        const childText = el.textContent?.trim() || '';
        const childHTML = el.innerHTML || '';
        
        if (childText) {
          parts.push(childText);
        } else if (childHTML.includes('\n') || el.tagName === 'SPAN') {
          // Empty span might indicate a line break
          parts.push('\n');
        }
      }
    }
  });
  
  // Join parts and clean up
  result = parts.join('').replace(/\n+/g, '\n').trim();
  
  // If we still don't have line breaks but the raw text suggests there should be some,
  // try to infer them from the structure
  if (!result.includes('\n') && rawText.length > 50) {
    // Look for patterns that suggest line breaks
    const sentences = result.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      result = sentences.join('\n');
    }
  }
  
  return result;
}

function extractTextWithLinks(element: Element): string {
  let text = '';
  
  element.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      
      if (el.tagName === 'A') {
        // For links, include the link text and URL
        const linkText = el.textContent || '';
        const href = el.getAttribute('href') || '';
        
        if (href.startsWith('http')) {
          text += `${linkText} (${href})`;
        } else {
          text += linkText;
        }
      } else if (el.tagName === 'BR') {
        text += '\n';
      } else if (el.tagName === 'P' || el.tagName === 'DIV') {
        // Add line breaks for paragraph and div elements
        if (text && !text.endsWith('\n')) {
          text += '\n';
        }
        text += extractTextWithLinks(el);
        text += '\n';
      } else {
        // Recursively extract text from other elements
        text += extractTextWithLinks(el);
      }
    }
  });
  
  // Clean up multiple consecutive line breaks but preserve intentional ones
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export async function downloadImage(url: string): Promise<File | null> {
  try {
    // Handle Twitter image URLs - convert to larger format
    let downloadUrl = url;
    if (url.includes('pbs.twimg.com')) {
      // Remove size parameters and get original
      downloadUrl = url.split('?')[0];
      if (downloadUrl.includes('&name=')) {
        downloadUrl = downloadUrl.split('&name=')[0];
      }
      // Force larger format
      if (!downloadUrl.includes('format=') && !downloadUrl.includes('.jpg') && !downloadUrl.includes('.png')) {
        downloadUrl += '?format=jpg&name=large';
      }
    }
    
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const blob = await response.blob();
    const filename = `twitter-media-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
    
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

export function convertToMarkdown(parsedData: ParsedTwitterData, uploadedFiles: string[] = []): string {
  let markdown = `[name]${parsedData.name}[/name] [handle]${parsedData.handle}[/handle] [body]${parsedData.body}[/body]`;
  
  if (parsedData.time) {
    markdown += ` [time]${parsedData.time}[/time]`;
  }
  
  // Add likes in the format: comments,retweets,likes
  // Since we don't have individual metrics from clipboard, we'll use views as likes
  if (parsedData.views) {
    // Default format: 0 comments, 0 retweets, views as likes
    markdown += ` [likes]0,0,${parsedData.views.replace(/,/g, '')}[/likes]`;
  }
  
  // Add avatar if we have uploaded files for it
  const avatarFile = uploadedFiles.find(f => f.includes('avatar'));
  if (avatarFile) {
    markdown += ` [avatar]${avatarFile}[/avatar]`;
  }
  
  // Add media if we have uploaded files for it - exclude avatar files
  const mediaFiles = uploadedFiles.filter(f => f.includes('media') && !f.includes('avatar'));
  if (mediaFiles.length > 0) {
    markdown += ` [media]${mediaFiles.join(',')}[/media]`;
  }
  
  return markdown;
}