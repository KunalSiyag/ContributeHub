-- Migration: Add technologies column to profiles
-- Run this in your Supabase SQL Editor

-- Add technologies array to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS technologies TEXT[] DEFAULT '{}';

-- Add resume_analyzed_at timestamp to track when resume was last analyzed
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS resume_analyzed_at TIMESTAMPTZ;

-- Update RLS policy to allow users to update their technologies
-- (This is already covered by the existing "Users can update their own profile" policy)
