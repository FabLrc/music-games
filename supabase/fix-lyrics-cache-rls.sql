-- Fix RLS policies for lyrics_cache table
-- This allows anonymous users to read and write to the lyrics cache
-- Safe because lyrics are public data

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can insert lyrics" ON lyrics_cache;
DROP POLICY IF EXISTS "Authenticated users can update lyrics" ON lyrics_cache;

-- Create new permissive policies for anonymous access
DROP POLICY IF EXISTS "Anyone can insert lyrics" ON lyrics_cache;
CREATE POLICY "Anyone can insert lyrics"
  ON lyrics_cache
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update lyrics" ON lyrics_cache;
CREATE POLICY "Anyone can update lyrics"
  ON lyrics_cache
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy for reading already exists: "Anyone can read lyrics cache"
