// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yfjsgbekrbrhytucapha.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmanNnYmVrcmJyaHl0dWNhcGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwODA4NDYsImV4cCI6MjA3MTY1Njg0Nn0.3c19UAiq4UBBo7mBRNwYl73TmSv-o3QA61yFku_C5S4'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database schema - run this in your Supabase SQL editor:
/*
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  prediction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_session VARCHAR(255) UNIQUE -- to track if user already submitted
);

-- Add RLS policies
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read predictions
CREATE POLICY "Anyone can view predictions" ON predictions
  FOR SELECT USING (true);

-- Allow anyone to insert predictions
CREATE POLICY "Anyone can insert predictions" ON predictions
  FOR INSERT WITH CHECK (true);
*/