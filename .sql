-- Twitter Archive Database Schema
-- Run this in your Supabase SQL editor

-- Drop existing tables if they exist (be careful with this in production)
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS tweets CASCADE;

-- Create tweets table
CREATE TABLE tweets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  handle TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  retweets INTEGER DEFAULT 0,
  quotes INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  parent_tweet_id UUID REFERENCES tweets(id) ON DELETE SET NULL,
  quoted_tweet_id UUID REFERENCES tweets(id) ON DELETE SET NULL,
  thread_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create media table
CREATE TABLE media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'gif')),
  url TEXT NOT NULL,
  alt_text TEXT,
  order_position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tweet-media', 'tweet-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tweet-media bucket
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'tweet-media');

CREATE POLICY "Public upload access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tweet-media');

-- RLS policies for tweets table
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tweets" ON tweets
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert tweets" ON tweets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update tweets" ON tweets
  FOR UPDATE USING (true);

-- RLS policies for media table
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read media" ON media
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert media" ON media
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX tweets_timestamp_idx ON tweets(timestamp DESC);
CREATE INDEX tweets_parent_tweet_idx ON tweets(parent_tweet_id);
CREATE INDEX tweets_quoted_tweet_idx ON tweets(quoted_tweet_id);
CREATE INDEX media_tweet_id_idx ON media(tweet_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_tweets_updated_at BEFORE UPDATE ON tweets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();