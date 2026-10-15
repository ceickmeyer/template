-- Museum of Twitter — live schema reference
--
-- This is a DESCRIPTION of what's actually deployed in Supabase, verified by
-- querying information_schema/pg_policies directly, not an aspirational schema.
-- Do NOT run this against the live database — the tables already exist and
-- are populated. This is documentation, kept here so the schema doesn't have
-- to be re-derived from app code again.
--
-- NOTE: this Supabase project is SHARED with several unrelated apps (bb_*,
-- cl_*, pricedl_*, games/players/scores, etc.). Only tweets,
-- current_featured_tweet, and featured_tweet_history belong to this project.
-- Never run anything here that isn't explicitly scoped to those three tables.

CREATE TABLE tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  markdown_content TEXT NOT NULL,
  parsed_json JSONB,                    -- present in the DB; not read or written anywhere in the app
  tweet_date TIMESTAMP,                 -- present in the DB; not read or written anywhere in the app
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tweets_slug ON tweets USING btree (slug);       -- redundant: the UNIQUE constraint above already creates tweets_slug_key, an equivalent btree index on slug
CREATE INDEX idx_tweets_content ON tweets USING gin (parsed_json); -- indexes the unused parsed_json column

CREATE TABLE current_featured_tweet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID REFERENCES tweets(id),
  featured_since DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE featured_tweet_history (
  tweet_id UUID NOT NULL REFERENCES tweets(id),
  featured_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tweet_id, featured_date)
);

-- Storage bucket (public). The same Supabase instance also hosts an unrelated
-- `pricedl-images` bucket for another app — don't confuse the two.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tweet-media', 'tweet-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'tweet-media');

CREATE POLICY "Public upload access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tweet-media');

-- Row Level Security
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_featured_tweet ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_tweet_history ENABLE ROW LEVEL SECURITY;

-- ⚠️ Live policies grant unrestricted CRUD to the `public` role (i.e. the
-- anon key shipped in the client bundle) on all three tables below. The
-- admin login (@supabase/ssr session, gated in admin/+layout.server.js)
-- only protects rendering the /admin/* pages in SvelteKit — it does nothing
-- at the database layer. Anyone who extracts the anon key can read, insert,
-- update, or delete any tweet directly via the Supabase REST API, logged in
-- or not. Locking this down would require these policies to check
-- auth.role() = 'authenticated' (or similar) AND switching the admin pages
-- from the plain anon client ($lib/supabase.js) to a session-bound client
-- that forwards the logged-in user's JWT — flagging this rather than
-- changing it, since it's a live, shared database and the fix needs to land
-- in the app code and the policies together.
CREATE POLICY "Allow all for anon users" ON tweets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on current_featured_tweet" ON current_featured_tweet
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on featured_tweet_history" ON featured_tweet_history
  FOR ALL USING (true) WITH CHECK (true);
