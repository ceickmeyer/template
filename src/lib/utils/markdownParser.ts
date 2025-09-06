// src/lib/utils/markdownParser.ts

export interface TweetData {
  name: string;
  handle: string;
  body: string;
  time?: string;
  likes?: string;
  media?: string[];
  avatar?: string;
  quote?: TweetData;
  replies?: TweetData[];
}

export function parseMarkdown(markdown: string): TweetData | null {
  try {
    // Extract main tweet data
    const name = extractTag(markdown, 'name');
    const handle = extractTag(markdown, 'handle');
    const body = extractTag(markdown, 'body');
    const time = extractTag(markdown, 'time');
    const likes = extractTag(markdown, 'likes');
    const avatar = extractTag(markdown, 'avatar');
    
    // Extract media files
    const mediaString = extractTag(markdown, 'media');
    const media = mediaString ? mediaString.split(',').map(m => m.trim()) : [];

    // Check for quote tweet
    const quoteMatch = markdown.match(/\[quote\](.*?)\[\/quote\]/s);
    let quote: TweetData | undefined;
    if (quoteMatch) {
      quote = parseMarkdown(quoteMatch[1]);
    }

    // Check for replies
    const replyMatches = [...markdown.matchAll(/\[reply\](.*?)\[\/reply\]/gs)];
    const replies: TweetData[] = [];
    for (const match of replyMatches) {
      const replyData = parseMarkdown(match[1]);
      if (replyData) {
        replies.push(replyData);
      }
    }

    if (!name || !handle || !body) {
      throw new Error('Missing required fields: name, handle, or body');
    }

    return {
      name,
      handle,
      body,
      time,
      likes,
      avatar,
      media: media.length > 0 ? media : undefined,
      quote,
      replies: replies.length > 0 ? replies : undefined
    };
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return null;
  }
}

function extractTag(text: string, tagName: string): string | null {
  const regex = new RegExp(`\\[${tagName}\\](.*?)\\[\\/${tagName}\\]`, 's');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// Generate short, readable slug using full handle
export function generateSlug(tweetData?: TweetData): string {
  // Generate a short random string (6 characters: letters + numbers)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Use full handle (minus @) as prefix
  let prefix = '';
  if (tweetData?.handle) {
    // Remove @ and clean the handle for URL safety
    const cleanHandle = tweetData.handle
      .replace('@', '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''); // Remove any special characters
    prefix = cleanHandle + '-';
  }
  
  // Fallback to generic prefix if no handle
  if (!prefix) {
    prefix = 'tweet-';
  }
  
  return prefix + randomPart;
}

// Alternative: Generate slug with just numbers and letters (no dashes)
export function generateShortSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Alternative: Generate slug with timestamp + random (still short)
export function generateTimestampSlug(): string {
  // Use last 4 digits of timestamp + 4 random chars
  const timestamp = Date.now().toString().slice(-4);
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return timestamp + randomPart;
}

// Format likes string into readable format
export function formatLikes(likes: string): { comments: number; retweets: number; likes: number } {
  const parts = likes.split(',').map(n => parseInt(n.trim()) || 0);
  return {
    comments: parts[0] || 0,
    retweets: parts[1] || 0,
    likes: parts[2] || 0
  };
}

// Generate markdown from tweet data (for editing)
export function generateMarkdown(tweetData: TweetData): string {
  let markdown = `[name]${tweetData.name}[/name] [handle]${tweetData.handle}[/handle] [body]${tweetData.body}[/body]`;
  
  if (tweetData.time) {
    markdown += ` [time]${tweetData.time}[/time]`;
  }
  
  if (tweetData.likes) {
    markdown += ` [likes]${tweetData.likes}[/likes]`;
  }
  
  if (tweetData.avatar) {
    markdown += ` [avatar]${tweetData.avatar}[/avatar]`;
  }
  
  if (tweetData.media && tweetData.media.length > 0) {
    markdown += ` [media]${tweetData.media.join(',')}[/media]`;
  }
  
  if (tweetData.quote) {
    markdown += `\n[quote]\n${generateMarkdown(tweetData.quote)}\n[/quote]`;
  }
  
  if (tweetData.replies && tweetData.replies.length > 0) {
    for (const reply of tweetData.replies) {
      markdown += `\n[reply]\n${generateMarkdown(reply)}\n[/reply]`;
    }
  }
  
  return markdown;
}