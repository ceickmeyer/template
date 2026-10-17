// src/lib/server/screenshotExtract.ts
//
// Reads a screenshot of a tweet with Claude's vision and returns its text
// fields plus pixel boxes for the avatar and attached media, which the admin
// page then crops out of the screenshot in the browser. Server-only
// ($lib/server), so the API key never reaches the client.
import Anthropic from '@anthropic-ai/sdk';

export const SCREENSHOT_MODEL = 'claude-sonnet-5-5';

export interface Box {
  found: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedQuote {
  found: boolean;
  name: string;
  handle: string;
  body: string;
  time: string;
  avatarBox: Box;
  mediaBoxes: Box[];
}

export interface ExtractedReply {
  name: string;
  handle: string;
  body: string;
  time: string;
  replies: number;
  retweets: number;
  likes: number;
  avatarBox: Box;
  mediaBoxes: Box[];
}

export interface ExtractedTweet {
  name: string;
  handle: string;
  replyingTo: string;
  body: string;
  time: string;
  replies: number;
  retweets: number;
  likes: number;
  avatarBox: Box;
  mediaBoxes: Box[];
  quote: ExtractedQuote;
  thread: ExtractedReply[];
}

export interface ExtractionResult {
  tweet: ExtractedTweet;
  usage: { inputTokens: number; outputTokens: number };
}

const box = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'x', 'y', 'width', 'height'],
  properties: {
    found: { type: 'boolean' },
    x: { type: 'integer' },
    y: { type: 'integer' },
    width: { type: 'integer' },
    height: { type: 'integer' }
  }
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'handle', 'replyingTo', 'body', 'time', 'replies', 'retweets', 'likes', 'avatarBox', 'mediaBoxes', 'quote', 'thread'],
  properties: {
    name: { type: 'string' },
    handle: { type: 'string' },
    replyingTo: { type: 'string' },
    body: { type: 'string' },
    time: { type: 'string' },
    replies: { type: 'integer' },
    retweets: { type: 'integer' },
    likes: { type: 'integer' },
    avatarBox: box,
    mediaBoxes: { type: 'array', items: box },
    quote: {
      type: 'object',
      additionalProperties: false,
      required: ['found', 'name', 'handle', 'body', 'time', 'avatarBox', 'mediaBoxes'],
      properties: {
        found: { type: 'boolean' },
        name: { type: 'string' },
        handle: { type: 'string' },
        body: { type: 'string' },
        time: { type: 'string' },
        avatarBox: box,
        mediaBoxes: { type: 'array', items: box }
      }
    },
    thread: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'handle', 'body', 'time', 'replies', 'retweets', 'likes', 'avatarBox', 'mediaBoxes'],
        properties: {
          name: { type: 'string' },
          handle: { type: 'string' },
          body: { type: 'string' },
          time: { type: 'string' },
          replies: { type: 'integer' },
          retweets: { type: 'integer' },
          likes: { type: 'integer' },
          avatarBox: box,
          mediaBoxes: { type: 'array', items: box }
        }
      }
    }
  }
};

const SYSTEM = `You transcribe screenshots of tweets for an archive that recreates each tweet exactly. Screenshots come from every era and app (old and new Twitter/X layouts, light and dark mode, cropped or compressed images).

Text fields:
- name: the display name exactly as shown, including emoji. Leave out verification badges.
- handle: the @handle, including the "@".
- replyingTo: "@handle" if the tweet shows "Replying to @handle", otherwise "".
- body: the tweet text exactly as written - same capitalization, punctuation, emoji, #hashtags, @mentions and URLs as displayed. Keep every line break, including blank lines between paragraphs (use \\n). Leave out UI text such as "Replying to", "Show more", "Translate post", the timestamp and the counts.
- time: normalize to "h:mm AM · Mon D, YYYY", for example "7:10 PM · Apr 26, 2014" or "6:18 PM · Sep 13, 2013" (two-digit years are 20xx). If only a date is shown use "Mon D, YYYY". If only a relative time is shown ("1d", "5h", "2m"), copy it exactly as shown. If no time is shown use "".
- replies, retweets, likes: integers; expand abbreviations ("16K" = 16000, "1.2M" = 1200000). Retweets includes "Reposts". Use 0 when a count isn't shown.

Boxes are in pixels of this image, origin at the top-left. Make each box tight around the picture itself, with no surrounding border, padding or UI.
- avatarBox: the author's profile picture (a square around it, even when it is displayed as a circle). found: false with zeros if there is none.
- mediaBoxes: each photo or video thumbnail attached to the tweet, in reading order. Do not include the avatar, the row of small avatars of people who liked or retweeted it, or link-preview cards. Empty array if none.
- quote: when the tweet quotes another tweet (an embedded card with its own author), fill it with that tweet's name, handle, body, time, avatar box and media boxes using the same rules, and found: true. Otherwise found: false, empty strings, zero boxes and no media.

Threads and reply chains: when the screenshot shows several tweets stacked vertically (often joined by a line running between their avatars), the top-level fields describe the first, topmost tweet, and every tweet below it goes in thread, in order from top to bottom, each with its own name, handle, body, time, counts, avatar box and media boxes, following the same rules. A tweet partly cut off at the top or bottom edge counts if its author and text are readable. thread is an empty array for a single tweet. A quoted tweet card inside a tweet is a quote, not a thread entry.`;

export async function extractTweetFromScreenshot(
  client: Anthropic,
  image: { data: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; width: number; height: number }
): Promise<ExtractionResult> {
  const response = await client.beta.messages.create({
    model: SCREENSHOT_MODEL,
    max_tokens: 8000,
    // Reading a screenshot doesn't need deep reasoning; low effort keeps it
    // fast and cheap. Thinking can't be disabled on this model.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // If a request is ever declined in a category that supports it, the API
    // retries it on another model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          { type: 'text', text: `This screenshot is ${image.width}×${image.height} pixels. Transcribe the tweet.` }
        ]
      }
    ]
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`The model declined this image${response.stop_details?.category ? ` (${response.stop_details.category})` : ''}.`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The model ran out of output tokens before finishing.');
  }

  const text = response.content.find((block) => block.type === 'text');
  if (!text || text.type !== 'text') throw new Error('The model returned no transcription.');

  return {
    tweet: JSON.parse(text.text) as ExtractedTweet,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
  };
}
