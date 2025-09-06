// src/lib/utils/markdownParser.ts

export interface TweetData {
  name: string;
  handle: string;
  body: string;
  avatar?: string;
  media?: string[];
  time?: string;
  likes?: string;
  quote?: TweetData;
  replies?: TweetData[];
}

export interface ParseResult {
  success: boolean;
  data?: TweetData;
  error?: string;
}

/**
 * Enhanced markdown parser for tweet structures with quotes and replies
 */
export class TweetMarkdownParser {
  
  /**
   * Parse markdown content into TweetData structure
   */
  static parse(markdown: string): ParseResult {
    try {
      const normalizedMarkdown = this.normalizeMarkdown(markdown);
      const tweetData = this.parseTweetBlock(normalizedMarkdown, 'main tweet');
      
      return {
        success: true,
        data: tweetData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate markdown from TweetData structure
   */
  static generateMarkdown(tweetData: TweetData): string {
    let markdown = this.generateTweetBlock(tweetData);
    
    // Add quote if present
    if (tweetData.quote) {
      markdown += '\n\n[quote]\n' + this.generateTweetBlock(tweetData.quote) + '\n[/quote]';
    }
    
    // Add replies if present
    if (tweetData.replies && tweetData.replies.length > 0) {
      for (const reply of tweetData.replies) {
        markdown += '\n\n[reply]\n' + this.generateTweetBlock(reply) + '\n[/reply]';
      }
    }
    
    return markdown;
  }

  /**
   * Normalize markdown by trimming and ensuring consistent line endings
   */
  private static normalizeMarkdown(markdown: string): string {
    return markdown.trim().replace(/\r\n/g, '\n');
  }

  /**
   * Parse a tweet block (main, quote, or reply)
   */
  private static parseTweetBlock(content: string, context: string): TweetData {
    // First, extract and validate nested structures
    const { mainContent, quote, replies } = this.extractNestedStructures(content, context);
    
    // Parse the main tweet content
    const tweetData = this.parseBasicTweetData(mainContent, context);
    
    // Add quote if present
    if (quote) {
      tweetData.quote = this.parseTweetBlock(quote, 'quote tweet');
    }
    
    // Add replies if present
    if (replies.length > 0) {
      tweetData.replies = replies.map((reply, index) => 
        this.parseTweetBlock(reply, `reply ${index + 1}`)
      );
    }
    
    return tweetData;
  }

  /**
   * Extract quote and reply blocks from content
   */
  private static extractNestedStructures(content: string, context: string): {
    mainContent: string;
    quote?: string;
    replies: string[];
  } {
    let mainContent = content;
    let quote: string | undefined;
    const replies: string[] = [];

    // Extract quote block
    const quoteMatch = content.match(/\[quote\]([\s\S]*?)\[\/quote\]/);
    if (quoteMatch) {
      quote = quoteMatch[1].trim();
      mainContent = mainContent.replace(quoteMatch[0], '').trim();
    }

    // Extract reply blocks
    const replyMatches = [...content.matchAll(/\[reply\]([\s\S]*?)\[\/reply\]/g)];
    for (const match of replyMatches) {
      replies.push(match[1].trim());
      mainContent = mainContent.replace(match[0], '').trim();
    }

    // Validate mutual exclusivity
    if (quote && replies.length > 0) {
      throw new Error(`${context} cannot have both quote and replies. Choose one or the other.`);
    }

    return { mainContent, quote, replies };
  }

  /**
   * Parse basic tweet data from content (without nested structures)
   */
  private static parseBasicTweetData(content: string, context: string): TweetData {
    // Extract required fields
    const name = this.extractTag(content, 'name', context, true);
    let handle = this.extractTag(content, 'handle', context, true);
    const body = this.extractTag(content, 'body', context, true);

    // Auto-add @ to handle if missing
    if (handle && !handle.startsWith('@')) {
      handle = '@' + handle;
    }

    // Extract optional fields
    const avatar = this.extractTag(content, 'avatar', context, false);
    const mediaString = this.extractTag(content, 'media', context, false);
    let time = this.extractTag(content, 'time', context, false);
    let likes = this.extractTag(content, 'likes', context, false);

    // Parse media files
    const media = mediaString ? 
      mediaString.split(',').map(file => file.trim()).filter(file => file.length > 0) : 
      undefined;

    // Add default time if not provided
    if (!time) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      time = `${timeStr} · ${dateStr}`;
    }

    // Add default likes if not provided
    if (!likes) {
      likes = '0,0,0';
    }

    return {
      name,
      handle,
      body,
      avatar: avatar || undefined,
      media: media && media.length > 0 ? media : undefined,
      time,
      likes
    };
  }

  /**
   * Extract content from a specific tag
   */
  private static extractTag(content: string, tagName: string, context: string, required: boolean): string | null {
    const regex = new RegExp(`\\[${tagName}\\]([\\s\\S]*?)\\[\\/${tagName}\\]`, 'i');
    const match = content.match(regex);
    
    if (!match) {
      if (required) {
        throw new Error(`Missing required [${tagName}] tag in ${context}`);
      }
      return null;
    }
    
    const extractedContent = match[1];
    
    if (required && !extractedContent.trim()) {
      throw new Error(`Empty [${tagName}] tag in ${context}. Please provide content.`);
    }
    
    return extractedContent;
  }

  /**
   * Generate markdown for a single tweet block
   */
  private static generateTweetBlock(tweetData: TweetData): string {
    let markdown = '';
    
    markdown += `[name]${tweetData.name}[/name]\n`;
    markdown += `[handle]${tweetData.handle}[/handle]\n`;
    
    if (tweetData.avatar) {
      markdown += `[avatar]${tweetData.avatar}[/avatar]\n`;
    }
    
    markdown += `[body]${tweetData.body}[/body]\n`;
    
    if (tweetData.media && tweetData.media.length > 0) {
      markdown += `[media]${tweetData.media.join(',')}[/media]\n`;
    }
    
    if (tweetData.time) {
      markdown += `[time]${tweetData.time}[/time]\n`;
    }
    
    if (tweetData.likes) {
      markdown += `[likes]${tweetData.likes}[/likes]`;
    }
    
    return markdown;
  }
}

// Convenience functions for backward compatibility
export function parseMarkdown(markdown: string): TweetData | null {
  const result = TweetMarkdownParser.parse(markdown);
  return result.success ? result.data || null : null;
}

export function parseMarkdownWithError(markdown: string): ParseResult {
  return TweetMarkdownParser.parse(markdown);
}

export function generateMarkdown(tweetData: TweetData): string {
  return TweetMarkdownParser.generateMarkdown(tweetData);
}

// Utility functions
export function generateSlug(tweetData?: TweetData): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let prefix = '';
  if (tweetData?.handle) {
    const cleanHandle = tweetData.handle
      .replace('@', '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    prefix = cleanHandle + '-';
  }
  
  if (!prefix) {
    prefix = 'tweet-';
  }
  
  return prefix + randomPart;
}

export function formatLikes(likes: string): { comments: number; retweets: number; likes: number } {
  const parts = likes.split(',').map(n => parseInt(n.trim()) || 0);
  return {
    comments: parts[0] || 0,
    retweets: parts[1] || 0,
    likes: parts[2] || 0
  };
}