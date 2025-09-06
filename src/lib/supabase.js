// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yfjsgbekrbrhytucapha.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmanNnYmVrcmJyaHl0dWNhcGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwODA4NDYsImV4cCI6MjA3MTY1Njg0Nn0.3c19UAiq4UBBo7mBRNwYl73TmSv-o3QA61yFku_C5S4'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database schema - run this in your Supabase SQL editor:
/*
-- Drop the old predictions table if you want to clean up
-- DROP TABLE IF EXISTS predictions;

-- Create contacts table
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_session VARCHAR(255) UNIQUE -- to track if user already submitted
);

-- Add RLS policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read contacts
CREATE POLICY "Anyone can view contacts" ON contacts
  FOR SELECT USING (true);

-- Allow anyone to insert contacts
CREATE POLICY "Anyone can insert contacts" ON contacts
  FOR INSERT WITH CHECK (true);
*/