// src/lib/types/tweet.ts

export interface MediaFile {
  filename: string;
  url: string;
  type: 'image' | 'video';
}

export interface TweetMetrics {
  comments: number;
  retweets: number;
  likes: number;
}

export interface BaseTweet {
  name: string;
  handle: string;
  body: string;
  time: string;
  likes: TweetMetrics;
  media?: MediaFile[];
}

export interface QuoteTweet extends BaseTweet {
  quote: BaseTweet;
}

export interface ReplyTweet extends BaseTweet {
  // replies are just BaseTweet objects
}

export interface TweetChain extends BaseTweet {
  replies: ReplyTweet[];
}

export interface ParsedTweet {
  id: string;
  type: 'basic' | 'quote' | 'chain';
  mainTweet: BaseTweet | QuoteTweet | TweetChain;
}

export interface StoredTweet {
  id: string;
  title: string;
  slug: string;
  markdown_content: string;
  parsed_json: ParsedTweet;
  created_at: string;
  updated_at: string;
}