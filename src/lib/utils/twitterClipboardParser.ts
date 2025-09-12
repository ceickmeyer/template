// src/lib/utils/twitterClipboardParser.ts

export interface ParsedTwitterData {
  name: string;
  handle: string;
  body: string;
  time: string;
  views?: string;
  avatarUrl?: string;
  mediaUrls: string[];
  links: string[];
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
      downloadUrl = url.split('?')[0];
      if (downloadUrl.includes('&name=')) {
        downloadUrl = downloadUrl.split('&name=')[0];
      }
      if (!downloadUrl.includes('format=') && !downloadUrl.includes('.jpg') && !downloadUrl.includes('.png')) {
        downloadUrl += '?format=jpg&name=large';
      }
    }
    
    // Use CORS proxy for Twitter images
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(downloadUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    
    const blob = await response.blob();
    
    // Fix MIME type and filename
    const mimeType = downloadUrl.includes('.png') ? 'image/png' : 'image/jpeg';
    const extension = downloadUrl.includes('.png') ? 'png' : 'jpg';
    
    // Create proper blob with correct MIME type
    const properBlob = new Blob([blob], { type: mimeType });
    const filename = `twitter-media-${Date.now()}.${extension}`;
    
    return new File([properBlob], filename, { type: mimeType });
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

function generateRealisticLikes(): string {
  // Generate realistic engagement numbers
  // Comments are smallest, retweets ~2-5x comments, likes ~10-100x comments
  const comments = Math.floor(Math.random() * 500) + 1; // 1-500
  const retweets = Math.floor(comments * (2 + Math.random() * 3)); // 2-5x comments
  const likes = Math.floor(comments * (10 + Math.random() * 90)); // 10-100x comments
  return `${comments},${retweets},${likes}`;
}

export function convertToMarkdown(parsedData: ParsedTwitterData, uploadedFiles: string[] = []): string {
  let markdown = '';
  
  // Build markdown with line breaks for better readability
  markdown += `[name]${parsedData.name}[/name]\n`;
  markdown += `[handle]${parsedData.handle}[/handle]\n`;
  markdown += `[body]${parsedData.body}[/body]\n`;
  
  if (parsedData.time) {
    markdown += `[time]${parsedData.time}[/time]\n`;
  }
  
  // Add realistic likes using the generator function
  markdown += `[likes]${generateRealisticLikes()}[/likes]\n`;
  
  // Add avatar if we have uploaded files for it
  const avatarFile = uploadedFiles.find(f => f.includes('avatar'));
  if (avatarFile) {
    markdown += `[avatar]${avatarFile}[/avatar]\n`;
  }
  
  // Add media if we have uploaded files for it - exclude avatar files
  const mediaFiles = uploadedFiles.filter(f => f.includes('media') && !f.includes('avatar'));
  if (mediaFiles.length > 0) {
    markdown += `[media]${mediaFiles.join(',')}[/media]\n`;
  }
  
  // Remove trailing newline
  return markdown.trim();
}