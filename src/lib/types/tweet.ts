// A row of the `tweets` table (see .sql). parsed_json / tweet_date also
// exist in the table but nothing reads them.
export interface StoredTweet {
  id: string;
  title: string;
  slug: string;
  markdown_content: string;
  created_at: string;
  updated_at?: string;
}
